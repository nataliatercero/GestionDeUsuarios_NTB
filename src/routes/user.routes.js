import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema, updateProfileSchema, verifyEmailSchema } from '../validators/user.validator.js';
import { updateCompanySchema } from '../validators/company.validator.js'; 
import { register, login, getProfile, updateProfile,  verifyEmail } from '../controllers/user.controller.js';
import { updateCompanyData } from '../controllers/company.controller.js';
import { authMiddleware, isVerified, hasProfile } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

// Rutas protegidas (requieren token)

// Datos personales (Onboarding)
router.put('/register', authMiddleware, isVerified, validate(updateProfileSchema), updateProfile);

// Validación del correo electrónico mediante código de verificación
router.put('/validation', authMiddleware, validate(verifyEmailSchema), verifyEmail);

// Ruta para obtener el perfil propio
router.get('/me', authMiddleware, getProfile);

// Onboarding de empresa
// Requiere Token, estar verificado y pasar el validador de empresa
router.patch('/company', authMiddleware, isVerified, hasProfile, validate(updateCompanySchema), updateCompanyData);

// Subida de Logo
router.patch('/logo', authMiddleware, isVerified, hasProfile, upload, uploadLogo);

// Eliminar usuario
router.delete('/', authMiddleware, deleteUser);

// Papelera para admins
router.get('/trash', authMiddleware, isVerified, authorize('admin'), getTrash);

export default router;