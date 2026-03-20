import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { registerUserSchema } from '../validators/user.validator.js'; 
import { register } from '../controllers/user.controller.js';

const router = Router();

router.post('/register', validate(registerUserSchema), register);

export default router;