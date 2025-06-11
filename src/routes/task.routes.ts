import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { createTask, getTasks, getTaskById, updateTask, deleteTask, getTasksByCampaign, updateTaskStatus, updateTaskDates } from '../controllers/task.controller';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken as RequestHandler);

// Rutas de tareas
router.get('/', 
  checkPermissions(['tasks:read']) as RequestHandler,
  getTasks as RequestHandler
);
router.get('/campaign/:campaignId', 
  checkPermissions(['tasks:read']) as RequestHandler,
  getTasksByCampaign as RequestHandler
);
router.get('/:id', 
  checkPermissions(['tasks:read']) as RequestHandler,
  getTaskById as RequestHandler
);
router.post('/', 
  checkPermissions(['tasks:create']) as RequestHandler, 
  auditCreation('tarea', {
    module: 'tareas',
    getDescription: (req) => `Creación de tarea: ${req.body.title || req.body.name || ''}`
  }) as any,
  createTask as RequestHandler
);
router.put('/:id', 
  checkPermissions(['tasks:update']) as RequestHandler, 
  auditUpdate('tarea', {
    module: 'tareas',
    getPreviousData: async (req) => {
      const { default: Task } = require('../models/Task');
      return await Task.findById(req.params.id);
    }
  }) as any,
  updateTask as RequestHandler
);
router.patch('/:id/status', 
  checkPermissions(['tasks:update']) as RequestHandler, 
  auditUpdate('tarea', {
    module: 'tareas',
    action: 'actualización_estado',
    getDescription: (req) => `Actualización de estado de tarea ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Task } = require('../models/Task');
      const task = await Task.findById(req.params.id);
      return { status: task?.status };
    }
  }) as any,
  updateTaskStatus as RequestHandler
);
router.patch('/:id/dates', 
  checkPermissions(['tasks:update']) as RequestHandler, 
  auditUpdate('tarea', {
    module: 'tareas',
    action: 'actualización_fechas',
    getDescription: (req) => `Actualización de fechas de tarea ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Task } = require('../models/Task');
      const task = await Task.findById(req.params.id);
      return { 
        startDate: task?.startDate,
        dueDate: task?.dueDate
      };
    }
  }) as any,
  updateTaskDates as RequestHandler
);
router.delete('/:id', 
  checkPermissions(['tasks:delete']) as RequestHandler, 
  auditDeletion('tarea', {
    module: 'tareas',
    getPreviousData: async (req) => {
      const { default: Task } = require('../models/Task');
      return await Task.findById(req.params.id);
    }
  }) as any,
  deleteTask as RequestHandler
);

export default router; 