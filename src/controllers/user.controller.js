import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import notificationService from '../services/notification.service.js';
import Company from '../models/Company.js';
import { uploadToCloudinary } from '../services/storage.service.js';

// Función para generar ambos tokens
const generateTokens = (userId) => {
  // Access Token: Duración corta (desde .env)
  const accessToken = jwt.sign(
    { id: userId, jti: randomUUID() },
    process.env.JWT_SECRET_ACCESS,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );

  // Refresh Token: Duración larga (desde .env)
  const refreshToken = jwt.sign(
    { id: userId, jti: randomUUID() },
    process.env.JWT_SECRET_REFRESH,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// REGISTRO

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('El correo electrónico ya está registrado');
    }

    const verificationCode = Math.random().toString().substring(2, 8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Creamos el usuario
    const newUser = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      status: 'pending'
    });

    // Generamos tokens
    const { accessToken, refreshToken } = generateTokens(newUser._id);

    await User.collection.updateOne(
      { _id: newUser._id },
      { $set: { refreshToken } }
    );

    notificationService.emit('user:registered', newUser);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Código generado.',
      token: accessToken,
      refreshToken: refreshToken,
      data: { id: newUser._id, email: newUser.email, status: newUser.status }
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
      throw AppError.unauthorized('Email o contraseña incorrectos', 'INVALID_CREDENTIALS');
    }

    // Generar el Token (JWT)
    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login correcto',
      token: accessToken,
      refreshToken: refreshToken,
      data: { id: user._id, email: user.email }
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
      throw AppError.notFound('Usuario');
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
      throw AppError.notFound('Usuario');
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
      throw AppError.notFound('Usuario');
    }

    // Comprobar si ya está verificado
    if (user.status === 'verified') {
      throw AppError.badRequest('Este email ya ha sido verificado anteriormente');
    }

    // Control de intentos
    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los 3 intentos permitidos.');
    }

    // Comprobar el código
    if (user.verificationCode !== code) {
      // Decrementamos intentos en la DB
      user.verificationAttempts -= 1;
      await user.save();

      // Error 
      throw AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intentos.`,
        'INVALID_VERIFICATION_CODE'
      );
    }

    // Si hay éxito, modificar status a verified y devolver ACK
    await User.findByIdAndUpdate(user._id, {
      $set: { status: 'verified' },
      $unset: { verificationCode: '', verificationAttempts: '' } // Limpiar campos
    });
    
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
      throw AppError.badRequest('No se ha subido ningún archivo o formato no válido');
    }

    if (!req.user.company) {
      throw AppError.badRequest('El usuario no tiene una compañía asociada');
    }

    const { url: logoUrl } = await uploadToCloudinary(req.file.buffer, {
      folder: 'bildy/logos',
      publicId: `logo-${req.user.company}`,
    });

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

    if (!user) throw AppError.notFound('Usuario');

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

// DELETE (para admins)

export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params; // ID del usuario a borrar
    const { soft } = req.query;
    const adminCompanyId = req.user.company; // Empresa del admin que ejecuta

    // Buscamos al usuario que queremos borrar
    const userToDelete = await User.findById(id);

    if (!userToDelete.company || userToDelete.company.toString() !== adminCompanyId.toString()) {
      throw AppError.forbidden('No puedes borrar a un usuario de otra empresa');
    }

    // SEGURIDAD: Verificar que pertenecen a la misma empresa
    if (userToDelete.company.toString() !== adminCompanyId.toString()) {
      throw AppError.forbidden('No puedes borrar a un usuario de otra empresa');
    }

    // Ejecutar el borrado
    let deletedUser;
    if (soft === 'true') {
      deletedUser = await User.softDeleteById(id, req.user._id.toString());
    } else {
      deletedUser = await User.hardDelete(id);
    }

    notificationService.emit('user:deleted_by_admin', {
      adminEmail: req.user.email,
      targetEmail: userToDelete.email,
      type: soft === 'true' ? 'soft' : 'hard'
    });

    res.status(200).json({
      success: true,
      message: `Usuario ${userToDelete.email} eliminado correctamente por el administrador`,
      data: { id: userToDelete._id }
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
    if (existingUser) throw AppError.conflict('El usuario ya está registrado');

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
      throw AppError.unauthorized('La contraseña actual es incorrecta');
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

// REFRESH

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw AppError.unauthorized('No hay token');

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH);
    
    // Buscamos al usuario y comprobamos su token guardado
    const user = await User.findById(decoded.id).select('+refreshToken');

    // Si el token enviado NO coincide con el de la DB (porque hubo logout), denegamos
    if (!user || user.refreshToken !== refreshToken) {
      throw AppError.unauthorized('Sesión expirada o invalidada. Haz login de nuevo.');
    }

    const tokens = generateTokens(user._id);
    
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { refreshToken: tokens.refreshToken } }
    );

    res.status(200).json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    next(AppError.unauthorized('Token inválido'));
  }
};

// LOGOUT
export const logout = async (req, res, next) => {
  try {
    await User.collection.updateOne(
      { _id: req.user._id },
      { $set: { refreshToken: null } }
    );

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente. Refresh token invalidado.'
    });
  } catch (error) {
    next(error);
  }
};