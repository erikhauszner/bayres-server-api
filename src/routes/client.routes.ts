import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authz.middleware';
import * as ClientController from '../controllers/client.controller';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = Router();

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Rutas que requieren permisos específicos
router.get('/', authorize(['clients:read']), ClientController.getClients);
router.get('/:id', authorize(['clients:read']), ClientController.getClientById);
router.post('/', 
  authorize(['clients:create']), 
  auditCreation('cliente', { module: 'clientes' }),
  ClientController.createClient
);
router.put('/:id', 
  authorize(['clients:update']), 
  auditUpdate('cliente', { module: 'clientes' }),
  ClientController.updateClient
);
router.delete('/:id', 
  authorize(['clients:delete']), 
  auditDeletion('cliente', { module: 'clientes' }),
  ClientController.deleteClient
);

// Rutas para activar/desactivar clientes
router.put('/:id/toggle-status', 
  authorize(['clients:update']), 
  auditUpdate('cliente', { 
    module: 'clientes',
    action: 'cambio_estado',
    getDescription: (req) => `Cambio de estado de cliente ID: ${req.params.id}` 
  }),
  ClientController.toggleClientStatus
);
router.put('/:id/activate', 
  authorize(['clients:update']), 
  auditUpdate('cliente', { 
    module: 'clientes', 
    action: 'cambio_estado',
    getDescription: (req) => `Activación de cliente ID: ${req.params.id}` 
  }),
  ClientController.activateClient
);
router.put('/:id/deactivate', 
  authorize(['clients:update']), 
  auditUpdate('cliente', { 
    module: 'clientes', 
    action: 'cambio_estado',
    getDescription: (req) => `Desactivación de cliente ID: ${req.params.id}` 
  }),
  ClientController.deactivateClient
);

// Rutas para interacciones (actividades)
router.post('/:id/interactions', authorize(['clients:update']), ClientController.addInteraction);
router.put('/:id/interactions/:interactionId', authorize(['clients:update']), ClientController.updateInteraction);
router.delete('/:id/interactions/:interactionId', authorize(['clients:update']), ClientController.deleteInteraction);

// Rutas para documentos
router.post('/:id/documents', authorize(['clients:update']), ClientController.addDocument);
router.delete('/:id/documents/:documentId', authorize(['clients:update']), ClientController.deleteDocument);

// Ruta para convertir lead a cliente
router.post('/convert/:id', 
  authorize(['clients:create']),
  auditCreation('cliente', { 
    module: 'clientes',
    action: 'conversión',
    getDescription: (req) => `Conversión de lead a cliente ID: ${req.params.id}` 
  }),
  ClientController.convertLeadToClient
);

// Ruta para convertir cliente a lead
router.post('/convert-to-lead/:id', 
  authorize(['clients:convert_to_lead']),
  auditCreation('lead', { 
    module: 'leads',
    action: 'conversión',
    getDescription: (req) => `Conversión de cliente a lead ID: ${req.params.id}` 
  }),
  ClientController.convertClientToLead
);

export default router; 