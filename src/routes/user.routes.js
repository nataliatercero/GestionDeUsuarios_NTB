import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema } from '../validators/user.validator.js'; 
import { register, login, getProfile } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

// RUTA DE PRUEBA PROTEGIDA
router.get('/me', authMiddleware, getProfile);

export default router;