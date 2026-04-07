import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import notificationService from '../services/notification.service.js';
import Company from '../models/Company.js';

// REGISTRO

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(AppError.conflict('El correo electrónico ya está registrado'));
    }

    // Generar código de 6 dígitos
    const verificationCode = Math.random().toString().substring(2, 8);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      status: 'pending'
    });

    // Generamos un token temporal para que pueda usar la ruta de validación
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    notificationService.emit('user:registered', newUser);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Código generado.',
      token, // Lo enviamos para que pueda validar el email
      data: {
        id: newUser._id,
        email: newUser.email,
        status: newUser.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// LOGIN

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar al usuario y pedir el password 
    const user = await User.findOne({ email }).select('+password');
    
    // Si no existe o la contraseña no coincide, lanzamos error genérico
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Usamos el 401 (No autorizado) para fallos de credenciales
      return next(AppError.unauthorized('Email o contraseña incorrectos', 'INVALID_CREDENTIALS'));
    }

    // Generar el Token (JWT)
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Respuesta con el token
    res.status(200).json({
      success: true,
      message: 'Login correcto',
      token,
      data: {
        id: user._id,
        email: user.email
      }
    });

  } catch (error) {
    next(error);
  }
};


// ONBOARDING

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Actualizamos al usuario con los datos validados por Zod
    // req.body ya viene "limpio" y transformado (NIF en mayúsculas)
    const userUpdated = await User.findByIdAndUpdate(
      userId,
      req.body, 
      { returnDocument: 'after', runValidators: true }
    );

    if (!userUpdated) {
      return next(AppError.notFound('Usuario'));
    }

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: {
        id: userUpdated._id,
        email: userUpdated.email,
        name: userUpdated.name,
        lastName: userUpdated.lastName,
        fullName: userUpdated.fullName, // Virtual de Mongoose
        nif: userUpdated.nif
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET PROFILE

// GET PROFILE (Punto 6 de la rúbrica)
export const getProfile = async (req, res, next) => {
  try {
    // Buscamos al usuario por el ID que viene en el token
    // .populate('company') busca el ID en la colección de Companies y trae el objeto entero
    const user = await User.findById(req.user._id).populate('company');

    if (!user) {
      return next(AppError.notFound('Usuario'));
    }

    res.status(200).json({
      success: true,
      message: `Perfil de ${user.fullName || 'usuario'}`,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        fullName: user.fullName, 
        nif: user.nif,
        role: user.role,
        status: user.status,
        // Aquí aparecerá el objeto de la empresa completo gracias al populate
        company: user.company 
      }
    });
  } catch (error) {
    next(error);
  }
};

// VERIFICACIÓN DE EMAIL

export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    // Buscamos al usuario de nuevo para traer los campos con select: false
    const user = await User.findById(req.user._id).select('+verificationCode +verificationAttempts');

    // Comprobar si el usuario existe
    if (!user) {
      return next(AppError.notFound('Usuario'));
    }

    // Comprobar si ya está verificado
    if (user.status === 'verified') {
      return next(AppError.badRequest('Este email ya ha sido verificado anteriormente'));
    }

    // Control de intentos
    if (user.verificationAttempts <= 0) {
      return next(AppError.tooManyRequests('Has agotado los 3 intentos permitidos.'));
    }

    // Comprobar el código
    if (user.verificationCode !== code) {
      // Decrementamos intentos en la DB
      user.verificationAttempts -= 1;
      await user.save();

      // Error 
      return next(AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intentos.`,
        'INVALID_VERIFICATION_CODE'
      ));
    }

    // Si hay éxito, modificar status a verified y devolver ACK
    user.status = 'verified';
    
    // Limpiar campos temporales
    user.verificationCode = undefined;
    user.verificationAttempts = undefined;
    
    await user.save();

    notificationService.emit('user:verified', user);

    res.status(200).json({
      success: true,
      message: 'Email verificado correctamente. Ya puedes continuar con el onboarding.'
    });

  } catch (error) {
    next(error); 
  }
};

// UPLAOD LOGO

export const uploadLogo = async (req, res, next) => {
  try {
    // Validar que Multer haya procesado el archivo 
    if (!req.file) {
      return next(AppError.badRequest('No se ha subido ningún archivo o formato no válido'));
    }

    // Comprobar que el usuario tiene una compañía
    if (!req.user.company) {
      return next(AppError.badRequest('El usuario no tiene una compañía asociada'));
    }

    // Construir la URL del logo
    const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    const logoUrl = `${PUBLIC_URL}/uploads/${req.file.filename}`;

    // Actualizar directamente la Company del usuario
    const updatedCompany = await Company.findByIdAndUpdate(
      req.user.company,
      { logo: logoUrl },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Logo de la compañía actualizado correctamente',
      data: {
        logo: updatedCompany.logo
      }
    });
  } catch (error) {
    next(error);
  }
};

// SOFT DELETE

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { soft } = req.query; // Capturamos el ?soft=true de la URL

    let user;
    let message;

    if (soft === 'true') {
      user = await User.softDeleteById(userId, userId.toString());
      message = 'Usuario desactivado correctamente (Soft Delete)';
    } else {
      user = await User.hardDelete(userId);
      message = 'Usuario eliminado permanentemente de la base de datos';
    }

    if (!user) return next(AppError.notFound('Usuario'));

    // Emitimos el evento
    notificationService.emit('user:deleted', { 
      email: user.email, 
      type: soft === 'true' ? 'soft' : 'hard' 
    });

    res.status(200).json({
      success: true,
      message,
      data: { id: user._id }
    });
  } catch (error) {
    next(error);
  }
};

// GET TRASH (Papelera de usuarios para admins)
export const getTrash = async (req, res, next) => {
  try {
    const deletedUsers = await User.findDeleted({ company: req.user.company });

    res.status(200).json({
      success: true,
      count: deletedUsers.length,
      data: deletedUsers
    });
  } catch (error) {
    next(error);
  }
};

// INVITE USER

export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName, nif } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return next(AppError.conflict('El usuario ya está registrado'));

    // Generar salt explícito
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Temporal123!', salt);

    // Crear usuario
    const newUser = await User.create({
      email,
      name,
      lastName,
      nif,
      password: hashedPassword,
      company: req.user.company,
      role: 'guest',
      status: 'verified' 
    });

    // Buscar empresa
    const company = await Company.findById(req.user.company);
    const companyName = company?.name || 'Compañía';

    // Emitir evento con toda la info
    notificationService.emit('user:invited', { 
      guestName: newUser.fullName,
      adminName: req.user.fullName,
      companyName: companyName,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      message: `Invitación enviada. Contraseña temporal: Temporal123!`,
      data: {
        id: newUser._id,
        fullName: newUser.fullName,
        role: newUser.role,
        company: companyName
      }
    });

  } catch (error) {
    next(error);
  }
};

// CAMBIAR CONTRASEÑA
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Buscamos al usuario incluyendo el password (que está oculto por defecto)
    const user = await User.findById(req.user._id).select('+password');

    // Comprobar que la contraseña actual es correcta
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(AppError.unauthorized('La contraseña actual es incorrecta'));
    }

    // Generar nuevo SALT y Hash para la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar y guardar
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    next(error);
  }
};