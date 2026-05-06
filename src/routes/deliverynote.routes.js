import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { uploadField } from '../middlewares/upload.middleware.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNote,
  deleteDeliveryNote,
  signDeliveryNote,
  getDeliveryNotePdf,
} from '../controllers/deliverynote.controller.js';

const router = Router();

router.get('/pdf/:id', authMiddleware, isVerified, getDeliveryNotePdf);

router.get('/', authMiddleware, isVerified, getDeliveryNotes);
router.post('/', authMiddleware, isVerified, validate(createDeliveryNoteSchema), createDeliveryNote);

router.patch('/:id/sign', authMiddleware, isVerified, uploadField('signature'), signDeliveryNote);

router.get('/:id', authMiddleware, isVerified, getDeliveryNote);
router.delete('/:id', authMiddleware, isVerified, deleteDeliveryNote);

export default router;
