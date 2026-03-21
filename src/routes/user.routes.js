import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema, updateProfileSchema } from '../validators/user.validator.js'; 
import { register, login, getProfile, updateProfile } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

// Rutas protegidas (requieren token)

// Datos personales (Onboarding)
router.put('/register', authMiddleware, validate(updateProfileSchema), updateProfile);

// Ruta para obtener el perfil propio
router.get('/me', authMiddleware, getProfile);

export default router;