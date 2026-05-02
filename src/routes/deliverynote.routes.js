import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import { createDeliveryNote, getDeliveryNotes, getDeliveryNote, deleteDeliveryNote } from '../controllers/deliverynote.controller.js';

const router = Router();

// Listar albaranes de la empresa con filtros (proyecto, fechas, estado) y paginación
router.get('/', authMiddleware, isVerified, getDeliveryNotes);

// Crear un nuevo albarán (valida si es de tipo 'material' o 'hours')
router.post('/', authMiddleware, isVerified, validate(createDeliveryNoteSchema), createDeliveryNote);

// Obtener el detalle completo de un albarán por su ID (incluye datos de cliente y proyecto)
router.get('/:id', authMiddleware, isVerified, getDeliveryNote);

// Eliminar un albarán (solo permitido si no está firmado)
router.delete('/:id', authMiddleware, isVerified, deleteDeliveryNote);

export default router;
