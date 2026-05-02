import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { createProject, updateProject, getProjects, getProject, deleteProject, getArchivedProjects, restoreProject } from '../controllers/project.controller.js';

const router = Router();

// Rutas estáticas ANTES de las parametrizadas para evitar colisiones
// Obtener proyectos borrados lógicamente (soft delete)
router.get('/archived', authMiddleware, isVerified, getArchivedProjects);

// Recuperar un proyecto del archivo mediante su ID
router.patch('/:id/restore', authMiddleware, isVerified, restoreProject);

// Listar proyectos de la empresa con filtros (cliente, nombre, activo) y paginación
router.get('/', authMiddleware, isVerified, getProjects);

// Crear un nuevo proyecto vinculado a un cliente existente
router.post('/', authMiddleware, isVerified, validate(createProjectSchema), createProject);

// Obtener los detalles de un proyecto y su cliente asociado
router.get('/:id', authMiddleware, isVerified, getProject);

// Actualizar datos del proyecto (permite actualización parcial)
router.put('/:id', authMiddleware, isVerified, validate(updateProjectSchema), updateProject);

// Borrar proyecto (soporta ?soft=true para mover a la papelera)
router.delete('/:id', authMiddleware, isVerified, deleteProject);

export default router;
