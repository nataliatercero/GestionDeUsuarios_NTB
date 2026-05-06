import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware, isVerified } from '../middlewares/auth.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { createProject, updateProject, getProjects, getProject, deleteProject, getArchivedProjects, restoreProject } from '../controllers/project.controller.js';

const router = Router();

router.get('/archived', authMiddleware, isVerified, getArchivedProjects);

router.patch('/:id/restore', authMiddleware, isVerified, restoreProject);

router.get('/', authMiddleware, isVerified, getProjects);

router.post('/', authMiddleware, isVerified, validate(createProjectSchema), createProject);

router.get('/:id', authMiddleware, isVerified, getProject);

router.put('/:id', authMiddleware, isVerified, validate(updateProjectSchema), updateProject);

router.delete('/:id', authMiddleware, isVerified, deleteProject);

export default router;
