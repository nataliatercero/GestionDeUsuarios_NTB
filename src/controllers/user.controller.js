import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';

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