import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema, loginUserSchema } from '../validators/user.validator.js'; 
import { register, login } from '../controllers/user.controller.js';

const router = Router();

router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);

export default router;