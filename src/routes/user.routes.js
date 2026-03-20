import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js'; // Tu motor
import { registerUserSchema } from '../validators/user.validator.js'; // Tu contrato

const router = Router();

// Ruta provisional para probar
router.post('/register', validate(registerUserSchema), (req, res) => {
  res.status(200).json({ message: "¡Validación superada!", data: req.body });
});

export default router;