import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { OpportunityController } from '../controllers/opportunity.controller';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken as RequestHandler);

// Rutas principales de oportunidades
router.get('/', 
  checkPermissions(['opportunities:read']) as RequestHandler, 
  OpportunityController.getAllOpportunities as RequestHandler
);

router.post('/', 
  checkPermissions(['opportunities:create']) as RequestHandler, 
  OpportunityController.createOpportunity as RequestHandler
);

router.get('/my-transferred', 
  checkPermissions(['opportunities:read']) as RequestHandler, 
  OpportunityController.getMyTransferredOpportunities as RequestHandler
);

router.get('/assigned-to-me', 
  checkPermissions(['opportunities:read']) as RequestHandler, 
  OpportunityController.getMyAssignedOpportunities as RequestHandler
);

router.get('/reports', 
  checkPermissions(['opportunities:reports']) as RequestHandler, 
  OpportunityController.getOpportunityReports as RequestHandler
);

// Rutas específicas de oportunidad
router.get('/:id', 
  checkPermissions(['opportunities:read']) as RequestHandler, 
  OpportunityController.getOpportunityById as RequestHandler
);

router.put('/:id', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateOpportunity as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['opportunities:delete']) as RequestHandler, 
  OpportunityController.deleteOpportunity as RequestHandler
);

// Rutas de acciones específicas
router.post('/transfer-from-lead', 
  checkPermissions(['opportunities:transfer']) as RequestHandler, 
  OpportunityController.transferLeadToOpportunity as RequestHandler
);

router.post('/:id/assign', 
  checkPermissions(['opportunities:assign']) as RequestHandler, 
  OpportunityController.assignSalesAgent as RequestHandler
);

router.post('/:id/collaborators', 
  checkPermissions(['opportunities:assign']) as RequestHandler, 
  OpportunityController.addCollaborator as RequestHandler
);

router.post('/:id/comments', 
  checkPermissions(['opportunities:comment']) as RequestHandler, 
  OpportunityController.addComment as RequestHandler
);

router.put('/:id/comments/:commentId', 
  checkPermissions(['opportunities:comment']) as RequestHandler, 
  OpportunityController.updateComment as RequestHandler
);

router.delete('/:id/comments/:commentId', 
  checkPermissions(['opportunities:comment']) as RequestHandler, 
  OpportunityController.deleteComment as RequestHandler
);

router.post('/:id/activities', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.addActivity as RequestHandler
);

router.put('/:id/status', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateStatus as RequestHandler
);

router.put('/:id/probability', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateProbability as RequestHandler
);

router.post('/:id/confirm-agenda', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.confirmAgenda as RequestHandler
);

router.post('/:id/schedule-call', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.scheduleCall as RequestHandler
);

router.put('/:id/dates', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateDates as RequestHandler
);

router.post('/:id/follow-ups', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.createFollowUp as RequestHandler
);

router.put('/:id/follow-ups/:followUpId/status', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateFollowUpStatus as RequestHandler
);

router.put('/:id/follow-ups/:followUpId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateFollowUp as RequestHandler
);

router.post('/:id/interests', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.createInterest as RequestHandler
);

router.put('/:id/interests/:interestId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateInterest as RequestHandler
);

router.delete('/:id/interests/:interestId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.deleteInterest as RequestHandler
);

// Rutas para notas del lead
router.post('/:id/lead-notes', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.createLeadNote as RequestHandler
);

router.put('/:id/lead-notes/:noteId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateLeadNote as RequestHandler
);

router.delete('/:id/lead-notes/:noteId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.deleteLeadNote as RequestHandler
);

// Rutas para tareas
router.post('/:id/tasks', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.createTask as RequestHandler
);

router.put('/:id/tasks/:taskId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateTask as RequestHandler
);

router.put('/:id/tasks/:taskId/status', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.updateTaskStatus as RequestHandler
);

router.delete('/:id/tasks/:taskId', 
  checkPermissions(['opportunities:update']) as RequestHandler, 
  OpportunityController.deleteTask as RequestHandler
);

// Rutas para desasignar
router.patch('/:id/unassign-sales-agent', 
  checkPermissions(['opportunities:unassign']) as RequestHandler, 
  OpportunityController.unassignSalesAgent as RequestHandler
);

router.delete('/:id/collaborators/:collaboratorId', 
  checkPermissions(['opportunities:unassign']) as RequestHandler, 
  OpportunityController.removeCollaborator as RequestHandler
);

router.patch('/:id/unassign-all', 
  checkPermissions(['opportunities:unassign']) as RequestHandler, 
  OpportunityController.unassignAll as RequestHandler
);

export { router as opportunityRoutes }; 