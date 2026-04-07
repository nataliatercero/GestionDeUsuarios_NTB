import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema, updateProfileSchema, verifyEmailSchema, inviteUserSchema, changePasswordSchema } from '../validators/user.validator.js';
import { updateCompanySchema } from '../validators/company.validator.js'; 
import { register, login, getProfile, updateProfile,  verifyEmail, uploadLogo, deleteUser, getTrash, inviteUser, changePassword, refresh, logout } from '../controllers/user.controller.js';
import { updateCompanyData } from '../controllers/company.controller.js';
import { authMiddleware, isVerified, hasProfile } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

// Rutas protegidas (requieren token)

// Ruta para obtener el perfil propio
router.get('/me', authMiddleware, getProfile);

// Validación del correo electrónico mediante código de verificación
router.put('/validation', authMiddleware, validate(verifyEmailSchema), verifyEmail);

// Ruta de Onboarding de usuario (requiere verificación)

// Datos personales
router.put('/register', authMiddleware, isVerified, validate(updateProfileSchema), updateProfile);

// Rutas de gestión de empresa (requiere ser admin)

// Onboarding de empresa
router.patch('/company', authMiddleware, isVerified, hasProfile, authorize('admin'), validate(updateCompanySchema), updateCompanyData);

// Subida de Logo
router.patch('/logo', authMiddleware, isVerified, hasProfile, authorize('admin'), upload, uploadLogo);

// Rutas de administración y cuenta

// Papelera para admins
router.get('/trash', authMiddleware, isVerified, authorize('admin'), getTrash);

// Invitar compañeros
router.post('/invite', authMiddleware, isVerified, hasProfile, authorize('admin'), validate(inviteUserSchema), inviteUser);

// Cambiar contraseña
router.put('/password', authMiddleware, isVerified, validate(changePasswordSchema), changePassword );

// Eliminar usuario
router.delete('/', authMiddleware, isVerified, deleteUser);

// Rutas de gestión de sesión

// Obtener un nuevo Access Token
router.post('/refresh', refresh);

// Log out
router.post('/logout', authMiddleware, logout);


export default router;