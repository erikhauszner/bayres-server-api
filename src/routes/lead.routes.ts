import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions, checkAnyPermissions } from '../middleware/auth.middleware';
import { LeadController } from '../controllers/lead.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken as RequestHandler);

// Rutas para leads
router.get('/', 
  checkPermissions(['leads:read']) as RequestHandler, 
  LeadController.getLeads as RequestHandler
);

router.get('/:id', 
  checkPermissions(['leads:read']) as RequestHandler, 
  LeadController.getLeadById as RequestHandler
);

router.post('/', 
  checkPermissions(['leads:create']) as RequestHandler, 
  LeadController.createLead as RequestHandler
);

router.put('/:id', 
  checkPermissions(['leads:update']) as RequestHandler, 
  LeadController.updateLead as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['leads:delete']) as RequestHandler, 
  LeadController.deleteLead as RequestHandler
);

// Rutas para interacciones
router.post('/:id/interactions', 
  checkAnyPermissions(['leads:new_activity', 'activities:create']) as RequestHandler, 
  LeadController.addInteraction as RequestHandler
);

router.put('/:id/interactions/:interactionId', 
  checkAnyPermissions(['leads:edit_activity', 'activities:update']) as RequestHandler, 
  LeadController.updateInteraction as RequestHandler
);

router.delete('/:id/interactions/:interactionId', 
  checkPermissions(['leads:delete_activity']) as RequestHandler, 
  LeadController.deleteInteraction as RequestHandler
);

// Rutas para tareas
router.post('/:id/tasks', 
  checkPermissions(['leads:new_task']) as RequestHandler, 
  LeadController.addTask as RequestHandler
);

router.put('/:id/tasks/:taskId', 
  checkPermissions(['leads:edit_task']) as RequestHandler, 
  LeadController.updateTask as RequestHandler
);

router.delete('/:id/tasks/:taskId', 
  checkPermissions(['leads:delete_task']) as RequestHandler, 
  LeadController.deleteTask as RequestHandler
);

// Rutas para notas
router.post('/:id/notes', 
  checkPermissions(['leads:new_note']) as RequestHandler, 
  LeadController.addNote as RequestHandler
);

router.put('/:id/notes', 
  checkPermissions(['leads:edit_note']) as RequestHandler, 
  LeadController.updateNote as RequestHandler
);

router.delete('/:id/notes', 
  checkPermissions(['leads:delete_note']) as RequestHandler, 
  LeadController.deleteNote as RequestHandler
);

// Rutas para documentos
router.post('/:id/documents', 
  checkPermissions(['leads:update']) as RequestHandler,
  upload.single('file') as any,
  LeadController.uploadDocument as RequestHandler
);

router.put('/:id/documents/:documentId', 
  checkPermissions(['leads:update']) as RequestHandler, 
  LeadController.updateDocument as RequestHandler
);

router.delete('/:id/documents/:documentId', 
  checkPermissions(['leads:update']) as RequestHandler, 
  LeadController.deleteDocument as RequestHandler
);

router.put('/:id/status', 
  checkPermissions(['leads:update']) as RequestHandler, 
  LeadController.updateStatus as RequestHandler
);

router.put('/:id/assign', 
  checkPermissions(['leads:assign']) as RequestHandler, 
  LeadController.assignLead as RequestHandler
);

router.put('/:id/approve', 
  checkPermissions(['leads:approve']) as RequestHandler, 
  LeadController.approveLead as RequestHandler
);

router.put('/:id/reject', 
  checkPermissions(['leads:approve']) as RequestHandler, 
  LeadController.rejectLead as RequestHandler
);

router.put('/:id/stage', 
  checkAnyPermissions(['leads:edit_stage', 'leads:stage_edit_appsetters']) as RequestHandler, 
  LeadController.updateLeadStage as RequestHandler
);

router.post('/:id/convert', 
  checkPermissions(['leads:convert_to_client']) as RequestHandler, 
  LeadController.convertToClient as RequestHandler
);

router.post('/import', 
  checkPermissions(['leads:create']) as RequestHandler,
  upload.single('file') as any,
  LeadController.importLeads as RequestHandler
);

router.post('/batch', 
  checkPermissions(['leads:create']) as RequestHandler,
  LeadController.importLeadsBatch as RequestHandler
);

// Obtener conteo de leads por empleado
router.get('/count/by-employee/:employeeId',
  checkPermissions(['leads:read']) as RequestHandler,
  LeadController.getLeadsCountByEmployee as RequestHandler
);

export default router; 