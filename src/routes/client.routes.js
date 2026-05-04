import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';
import { createClient, updateClient, getClients, getClient, deleteClient, getArchivedClients, restoreClient } from '../controllers/client.controller.js';

const router = Router();

// Rutas estáticas ANTES de las parametrizadas para evitar colisiones
// Obtener lista de clientes borrados lógicamente
router.get('/archived', authMiddleware, isVerified, getArchivedClients);

// Restaurar un cliente archivado mediante su ID
router.patch('/:id/restore', authMiddleware, isVerified, restoreClient);

// Listar todos los clientes de la empresa (con paginación y filtros)
router.get('/', authMiddleware, isVerified, getClients);

// Crear un nuevo cliente (requiere validación de datos)
router.post('/', authMiddleware, isVerified, validate(createClientSchema), createClient);

// Obtener los datos detallados de un cliente por ID
router.get('/:id', authMiddleware, isVerified, getClient);

// Actualizar un cliente existente (validación parcial permitida)
router.put('/:id', authMiddleware, isVerified, validate(updateClientSchema), updateClient);

// Eliminar un cliente 
router.delete('/:id', authMiddleware, isVerified, deleteClient);

export default router;
