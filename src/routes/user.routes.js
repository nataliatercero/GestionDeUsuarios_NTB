import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema, updateProfileSchema, verifyEmailSchema, inviteUserSchema, changePasswordSchema } from '../validators/user.validator.js';
import { updateCompanySchema } from '../validators/company.validator.js';
import { register, login, getProfile, updateProfile, verifyEmail, uploadLogo, deleteUser, deleteUserByAdmin, getTrash, inviteUser, changePassword, refresh, logout } from '../controllers/user.controller.js';
import { updateCompanyData } from '../controllers/company.controller.js';
import { authMiddleware, isVerified, hasProfile } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

router.get('/', authMiddleware, isVerified, getProfile);
router.get('/me', authMiddleware, isVerified, getProfile);

router.put('/validation', authMiddleware, validate(verifyEmailSchema), verifyEmail);

router.put('/register', authMiddleware, isVerified, validate(updateProfileSchema), updateProfile);

router.patch('/company', authMiddleware, isVerified, hasProfile, authorize('admin'), validate(updateCompanySchema), updateCompanyData);

router.patch('/logo', authMiddleware, isVerified, hasProfile, authorize('admin'), upload, uploadLogo);

router.get('/trash', authMiddleware, isVerified, authorize('admin'), getTrash);

router.post('/invite', authMiddleware, isVerified, hasProfile, authorize('admin'), validate(inviteUserSchema), inviteUser);

router.put('/password', authMiddleware, isVerified, validate(changePasswordSchema), changePassword);

router.delete('/', authMiddleware, isVerified, deleteUser);

router.delete('/:id', authMiddleware, isVerified, authorize('admin'), deleteUserByAdmin);

router.post('/refresh', refresh);

router.post('/logout', authMiddleware, logout);

export default router;
