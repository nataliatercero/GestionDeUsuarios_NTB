import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


// REGISTRO

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(AppError.conflict('El correo electrónico ya está registrado'));
    }

    // Generar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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
      return next(new AppError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS'));
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
      { new: true, runValidators: true }
    );

    if (!userUpdated) {
      return next(new AppError('Usuario no encontrado', 404));
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

export const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: `Perfil de ${req.user.fullName || 'usuario'}`,
    user: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName, // Virtuals
      role: req.user.role,
      status: req.user.status
    }
  });
};