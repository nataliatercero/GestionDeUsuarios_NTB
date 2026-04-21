import { Router } from 'express';
import { returnPdf } from '../controllers/delivery_note.controller.js';

const router = Router();

router.get('/pdf', returnPdf);

export default router;