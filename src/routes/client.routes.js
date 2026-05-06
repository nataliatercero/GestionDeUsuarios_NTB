import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';
import { createClient, updateClient, getClients, getClient, deleteClient, getArchivedClients, restoreClient } from '../controllers/client.controller.js';

const router = Router();

router.get('/archived', authMiddleware, isVerified, getArchivedClients);

router.patch('/:id/restore', authMiddleware, isVerified, restoreClient);

router.get('/', authMiddleware, isVerified, getClients);

router.post('/', authMiddleware, isVerified, validate(createClientSchema), createClient);

router.get('/:id', authMiddleware, isVerified, getClient);

router.put('/:id', authMiddleware, isVerified, validate(updateClientSchema), updateClient);

router.delete('/:id', authMiddleware, isVerified, deleteClient);

export default router;
