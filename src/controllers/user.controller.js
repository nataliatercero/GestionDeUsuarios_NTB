import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


// REGISTRO

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Comprobar si el usuario ya existe 
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Usar método conflict de AppError
      return next(AppError.conflict('El correo electrónico ya está registrado'));
    }

    // Generar código de verificación de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Cifrar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el usuario (solo con lo necesario, el resto en onboarding)
    const newUser = await User.create({
      email,
      password: hashedPassword,
      verificationCode
    });

    // Respuesta (No enviamos el password ni el código en producción)
    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito. Revisa tu correo para el código de verificación.',
      data: {
        id: newUser._id,
        email: newUser.email
      }
    });

  } catch (error) {
    next(error); // El errorHandler se encarga del resto
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