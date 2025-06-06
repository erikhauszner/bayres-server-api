import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authz.middleware';
import * as ClientController from '../controllers/client.controller';

const router = Router();

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Rutas que requieren permisos específicos
router.get('/', authorize(['clients:read']), ClientController.getClients);
router.get('/:id', authorize(['clients:read']), ClientController.getClientById);
router.post('/', authorize(['clients:create']), ClientController.createClient);
router.put('/:id', authorize(['clients:update']), ClientController.updateClient);
router.delete('/:id', authorize(['clients:delete']), ClientController.deleteClient);

// Rutas para activar/desactivar clientes
router.put('/:id/toggle-status', authorize(['clients:update']), ClientController.toggleClientStatus);
router.put('/:id/activate', authorize(['clients:update']), ClientController.activateClient);
router.put('/:id/deactivate', authorize(['clients:update']), ClientController.deactivateClient);

// Rutas para interacciones (actividades)
router.post('/:id/interactions', authorize(['clients:update']), ClientController.addInteraction);
router.put('/:id/interactions/:interactionId', authorize(['clients:update']), ClientController.updateInteraction);
router.delete('/:id/interactions/:interactionId', authorize(['clients:update']), ClientController.deleteInteraction);

// Rutas para documentos
router.post('/:id/documents', authorize(['clients:update']), ClientController.addDocument);
router.delete('/:id/documents/:documentId', authorize(['clients:update']), ClientController.deleteDocument);

// Ruta para convertir lead a cliente
router.post('/convert/:id', authorize(['clients:create']), ClientController.convertLeadToClient);

// Ruta para convertir cliente a lead
router.post('/convert-to-lead/:id', 
  authorize(['clients:convert_to_lead']),
  ClientController.convertClientToLead
);

export default router; 