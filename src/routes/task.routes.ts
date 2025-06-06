import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { createTask, getTasks, getTaskById, updateTask, deleteTask, getTasksByCampaign, updateTaskStatus, updateTaskDates } from '../controllers/task.controller';

const router = Router();

// Middleware de autenticación y autorización
router.use(authenticateToken as RequestHandler);
router.use(checkPermissions(['read:tasks', 'write:tasks']) as RequestHandler);

// Rutas de tareas
router.get('/', getTasks as RequestHandler);
router.get('/campaign/:campaignId', getTasksByCampaign as RequestHandler);
router.get('/:id', getTaskById as RequestHandler);
router.post('/', checkPermissions(['write:tasks']) as RequestHandler, createTask as RequestHandler);
router.put('/:id', checkPermissions(['write:tasks']) as RequestHandler, updateTask as RequestHandler);
router.patch('/:id/status', checkPermissions(['write:tasks']) as RequestHandler, updateTaskStatus as RequestHandler);
router.patch('/:id/dates', checkPermissions(['write:tasks']) as RequestHandler, updateTaskDates as RequestHandler);
router.delete('/:id', checkPermissions(['write:tasks']) as RequestHandler, deleteTask as RequestHandler);

export default router; 