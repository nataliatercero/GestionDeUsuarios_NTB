import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import notificationService from '../services/notification.service.js';
import Company from '../models/Company.js';
import { uploadToCloudinary } from '../services/storage.service.js';
import { sendVerificationEmail, sendInvitationEmail } from '../services/mail.service.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId, jti: randomUUID() },
    process.env.JWT_SECRET_ACCESS,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );

  const refreshToken = jwt.sign(
    { id: userId, jti: randomUUID() },
    process.env.JWT_SECRET_REFRESH,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

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

    const newUser = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      status: 'pending'
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);

    await User.collection.updateOne(
      { _id: newUser._id },
      { $set: { refreshToken } }
    );

    notificationService.emit('user:registered', newUser);

    sendVerificationEmail(newUser.email, verificationCode).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Revisa tu email para obtener el código de verificación.',
      token: accessToken,
      refreshToken: refreshToken,
      data: { id: newUser._id, email: newUser.email, status: newUser.status }
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw AppError.unauthorized('Email o contraseña incorrectos', 'INVALID_CREDENTIALS');
    }

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

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

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
        fullName: userUpdated.fullName,
        nif: userUpdated.nif
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
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
        company: user.company
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user._id).select('+verificationCode +verificationAttempts');

    if (!user) {
      throw AppError.notFound('Usuario');
    }

    if (user.status === 'verified') {
      throw AppError.badRequest('Este email ya ha sido verificado anteriormente');
    }

    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los 3 intentos permitidos.');
    }

    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save();

      throw AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intentos.`,
        'INVALID_VERIFICATION_CODE'
      );
    }

    await User.findByIdAndUpdate(user._id, {
      $set: { status: 'verified' },
      $unset: { verificationCode: '', verificationAttempts: '' }
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

export const uploadLogo = async (req, res, next) => {
  try {
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

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { soft } = req.query;

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

export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { soft } = req.query;
    const adminCompanyId = req.user.company;

    const userToDelete = await User.findById(id);

    if (!userToDelete.company || userToDelete.company.toString() !== adminCompanyId.toString()) {
      throw AppError.forbidden('No puedes borrar a un usuario de otra empresa');
    }

    if (userToDelete.company.toString() !== adminCompanyId.toString()) {
      throw AppError.forbidden('No puedes borrar a un usuario de otra empresa');
    }

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

export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName, nif } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw AppError.conflict('El usuario ya está registrado');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Temporal123!', salt);

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

    const company = await Company.findById(req.user.company);
    const companyName = company?.name || 'Compañía';

    notificationService.emit('user:invited', {
      guestName: newUser.fullName,
      adminName: req.user.fullName,
      companyName: companyName,
      email: newUser.email
    });

    sendInvitationEmail(newUser.email, newUser.fullName, companyName, 'Temporal123!').catch(() => {});

    res.status(201).json({
      success: true,
      message: `Invitación enviada a ${newUser.email}`,
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

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw AppError.unauthorized('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

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

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw AppError.unauthorized('No hay token');

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH);

    const user = await User.findById(decoded.id).select('+refreshToken');

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
