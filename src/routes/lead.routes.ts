import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions, checkAnyPermissions } from '../middleware/auth.middleware';
import { LeadController } from '../controllers/lead.controller';
import { upload } from '../middleware/upload.middleware';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

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
  auditCreation('lead', {
    module: 'leads',
    getNewData: (req) => req.body
  }) as any,
  LeadController.createLead as RequestHandler
);

router.put('/:id', 
  checkPermissions(['leads:update']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return lead;
    },
    getNewData: (req) => req.body
  }) as any,
  LeadController.updateLead as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['leads:delete']) as RequestHandler,
  auditDeletion('lead', {
    module: 'leads',
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return lead;
    }
  }) as any,
  LeadController.deleteLead as RequestHandler
);

// Rutas para interacciones
router.post('/:id/interactions', 
  checkAnyPermissions(['leads:new_activity', 'activities:create']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'nueva_interacción',
    getDescription: (req) => `Nueva interacción en lead: ${req.params.id}`
  }) as any,
  LeadController.addInteraction as RequestHandler
);

router.put('/:id/interactions/:interactionId', 
  checkAnyPermissions(['leads:edit_activity', 'activities:update']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'actualizar_interacción',
    getDescription: (req) => `Actualización de interacción en lead: ${req.params.id} (ID: ${req.params.interactionId})`
  }) as any,
  LeadController.updateInteraction as RequestHandler
);

router.delete('/:id/interactions/:interactionId', 
  checkPermissions(['leads:delete_activity']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'eliminar_interacción',
    getDescription: (req) => `Eliminación de interacción en lead: ${req.params.id} (ID: ${req.params.interactionId})`
  }) as any,
  LeadController.deleteInteraction as RequestHandler
);

// Rutas para tareas
router.post('/:id/tasks', 
  checkPermissions(['leads:new_task']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'nueva_tarea',
    getDescription: (req) => `Nueva tarea en lead: ${req.params.id}`
  }) as any,
  LeadController.addTask as RequestHandler
);

router.put('/:id/tasks/:taskId', 
  checkPermissions(['leads:edit_task']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'actualizar_tarea',
    getDescription: (req) => `Actualización de tarea en lead: ${req.params.id} (ID: ${req.params.taskId})`
  }) as any,
  LeadController.updateTask as RequestHandler
);

router.put('/:id/tasks/:taskId/status', 
  checkPermissions(['leads:edit_task']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'actualizar_estado_tarea',
    getDescription: (req) => `Actualización de estado de tarea en lead: ${req.params.id} (ID: ${req.params.taskId})`
  }) as any,
  LeadController.updateTaskStatus as RequestHandler
);

router.put('/:id/tasks/:taskId/assign', 
  checkPermissions(['leads:edit_task']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'asignar_tarea',
    getDescription: (req) => `Asignación de tarea en lead: ${req.params.id} (ID: ${req.params.taskId}) ${req.body.assignedTo ? `a empleado: ${req.body.assignedTo}` : '(desasignado)'}`
  }) as any,
  LeadController.assignTask as RequestHandler
);

router.delete('/:id/tasks/:taskId', 
  checkPermissions(['leads:delete_task']) as RequestHandler,
  auditUpdate('lead', {
    module: 'leads',
    action: 'eliminar_tarea',
    getDescription: (req) => `Eliminación de tarea en lead: ${req.params.id} (ID: ${req.params.taskId})`
  }) as any,
  LeadController.deleteTask as RequestHandler
);

// Rutas para notas
router.post('/:id/notes', 
  checkPermissions(['leads:new_note']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'nueva_nota',
    getDescription: (req) => `Nueva nota en lead: ${req.params.id}`
  }) as any,
  LeadController.addNote as RequestHandler
);

router.put('/:id/notes/:noteId', 
  checkPermissions(['leads:edit_note']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'actualizar_nota',
    getDescription: (req) => `Actualización de nota en lead: ${req.params.id}`
  }) as any,
  LeadController.updateNote as RequestHandler
);

router.delete('/:id/notes/:noteId', 
  checkPermissions(['leads:delete_note']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'eliminar_nota',
    getDescription: (req) => `Eliminación de nota en lead: ${req.params.id}`
  }) as any,
  LeadController.deleteNote as RequestHandler
);

// Rutas para documentos
router.post('/:id/documents', 
  checkPermissions(['leads:update']) as RequestHandler,
  upload.single('file') as any,
  auditUpdate('lead', {
    module: 'leads',
    action: 'nuevo_documento',
    getDescription: (req) => `Nuevo documento en lead: ${req.params.id}`
  }) as any,
  LeadController.uploadDocument as RequestHandler
);

router.put('/:id/documents/:documentId', 
  checkPermissions(['leads:update']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'actualizar_documento',
    getDescription: (req) => `Actualización de documento en lead: ${req.params.id} (ID: ${req.params.documentId})`
  }) as any,
  LeadController.updateDocument as RequestHandler
);

router.delete('/:id/documents/:documentId', 
  checkPermissions(['leads:update']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'eliminar_documento',
    getDescription: (req) => `Eliminación de documento en lead: ${req.params.id} (ID: ${req.params.documentId})`
  }) as any,
  LeadController.deleteDocument as RequestHandler
);

router.put('/:id/status', 
  checkPermissions(['leads:update']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'cambio_estado',
    getDescription: (req) => `Cambio de estado de lead: ${req.params.id} (Nuevo estado: ${req.body.status})`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { status: lead?.status };
    },
    getNewData: (req) => ({ status: req.body.status })
  }) as any,
  LeadController.updateStatus as RequestHandler
);

router.put('/:id/assign', 
  checkPermissions(['leads:assign']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'asignación',
    getDescription: (req) => `Asignación de lead: ${req.params.id} ${req.body.assignedTo ? `a empleado: ${req.body.assignedTo}` : '(desasignado)'}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { assignedTo: lead?.assignedTo };
    },
    getNewData: (req) => ({ assignedTo: req.body.assignedTo })
  }) as any,
  LeadController.assignLead as RequestHandler
);

router.patch('/:id/unassign', 
  checkPermissions(['leads:unassign']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'desasignación',
    getDescription: (req) => `Desasignación de lead: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { assignedTo: lead?.assignedTo };
    },
    getNewData: (req) => ({ assignedTo: null })
  }) as any,
  LeadController.unassignLead as RequestHandler
);

router.put('/:id/approve', 
  checkPermissions(['leads:approve']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'aprobación',
    getDescription: (req) => `Aprobación de lead: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { isApproved: lead?.isApproved, status: lead?.status };
    },
    getNewData: (req) => ({ isApproved: true, status: 'aprobado' })
  }) as any,
  LeadController.approveLead as RequestHandler
);

router.put('/:id/reject', 
  checkPermissions(['leads:approve']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'rechazo',
    getDescription: (req) => `Rechazo de lead: ${req.params.id} (Motivo: ${req.body.reason || 'No especificado'})`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { isApproved: lead?.isApproved, status: lead?.status };
    },
    getNewData: (req) => ({ isApproved: false, status: 'rechazado' })
  }) as any,
  LeadController.rejectLead as RequestHandler
);

router.put('/:id/stage', 
  checkAnyPermissions(['leads:edit_stage', 'leads:stage_edit_appsetters']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'cambio_etapa',
    getDescription: (req) => `Cambio de etapa de lead: ${req.params.id} (Nueva etapa: ${req.body.stage})`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { currentStage: lead?.currentStage };
    },
    getNewData: (req) => ({ currentStage: req.body.stage })
  }) as any,
  LeadController.updateLeadStage as RequestHandler
);

router.post('/:id/convert', 
  checkPermissions(['leads:convert_to_client']) as RequestHandler, 
  auditCreation('cliente', {
    module: 'clientes',
    action: 'conversión',
    getDescription: (req) => `Conversión de lead a cliente: ${req.params.id} (Tipo: ${req.body.type})`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return lead;
    }
  }) as any,
  LeadController.convertToClient as RequestHandler
);

router.post('/import', 
  checkPermissions(['leads:create']) as RequestHandler,
  upload.single('file') as any,
  auditCreation('lead', {
    module: 'leads',
    action: 'importación',
    getDescription: (req) => `Importación de leads desde archivo: ${req.file?.originalname || 'Sin nombre'}`
  }) as any,
  LeadController.importLeads as RequestHandler
);

router.post('/batch', 
  checkPermissions(['leads:create']) as RequestHandler,
  auditCreation('lead', {
    module: 'leads',
    action: 'importación_lote',
    getDescription: (req) => `Importación por lotes de ${req.body.leads?.length || 0} leads`
  }) as any,
  LeadController.importLeadsBatch as RequestHandler
);

// Obtener conteo de leads por empleado
router.get('/count/by-employee/:employeeId',
  checkPermissions(['leads:read']) as RequestHandler,
  LeadController.getLeadsCountByEmployee as RequestHandler
);

// Anular lead
router.put('/:id/annul', 
  checkPermissions(['leads:annul_lead']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'anulación',
    getDescription: (req) => `Anulación de lead: ${req.params.id} (Motivo: ${req.body.reason || 'No especificado'})`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { status: lead?.status, assignedTo: lead?.assignedTo };
    },
    getNewData: (req) => ({ status: 'anulado', assignedTo: null })
  }) as any,
  LeadController.annulLead as RequestHandler
);

// Rutas específicas para cambios de stage
router.put('/:id/mark-contacted', 
  checkPermissions(['leads:mark_contacted']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'marcar_contactado',
    getDescription: (req) => `Lead marcado como contactado: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { currentStage: lead?.currentStage };
    },
    getNewData: (req) => ({ currentStage: 'Contactado' })
  }) as any,
  LeadController.markAsContacted as RequestHandler
);

router.put('/:id/schedule-follow-up-stage', 
  checkPermissions(['leads:schedule_follow_up']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'agendar_seguimiento_stage',
    getDescription: (req) => `Lead movido a pendiente seguimiento: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { currentStage: lead?.currentStage };
    },
    getNewData: (req) => ({ currentStage: 'Pendiente Seguimiento' })
  }) as any,
  LeadController.scheduleFollowUpStage as RequestHandler
);

router.put('/:id/set-agenda-pending', 
  checkPermissions(['leads:set_agenda_pending']) as RequestHandler, 
  auditUpdate('lead', {
    module: 'leads',
    action: 'agenda_pendiente',
    getDescription: (req) => `Lead movido a agenda pendiente: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { Lead } = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);
      return { currentStage: lead?.currentStage };
    },
    getNewData: (req) => ({ currentStage: 'Agenda Pendiente' })
  }) as any,
  LeadController.setAgendaPending as RequestHandler
);

// Rutas para seguimientos
router.post('/:id/follow-ups',
  checkPermissions(['leads:update']) as RequestHandler,
  LeadController.createFollowUp as RequestHandler
);

router.put('/:id/follow-ups/:followUpId/status',
  checkPermissions(['leads:update']) as RequestHandler,
  LeadController.updateFollowUpStatus as RequestHandler
);

router.put('/:id/follow-ups/:followUpId',
  checkPermissions(['leads:update']) as RequestHandler,
  LeadController.updateFollowUp as RequestHandler
);

export default router; 