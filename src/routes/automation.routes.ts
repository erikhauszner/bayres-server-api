import express, { Router, RequestHandler } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas (para acceder a automatizaciones por nombre e ID)
router.get('/public/:name', AutomationController.getByName as RequestHandler);
router.get('/public/id/:id', AutomationController.getPublic as RequestHandler);
router.post('/:id/submit', 
  checkPermissions(['automations:submit']) as RequestHandler,
  AutomationController.submit as RequestHandler
);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// CRUD básico
router.post('/', 
  checkPermissions(['automations:create']) as RequestHandler,
  AutomationController.create as RequestHandler
);

router.get('/', 
  checkPermissions(['automations:read']) as RequestHandler,
  AutomationController.getAll as RequestHandler
);

router.get('/stats', 
  checkPermissions(['automations:stats']) as RequestHandler,
  AutomationController.getStats as RequestHandler
);

router.get('/active', 
  checkPermissions(['automations:read']) as RequestHandler,
  AutomationController.getActive as RequestHandler
);

router.get('/:id', 
  checkPermissions(['automations:read']) as RequestHandler,
  AutomationController.getById as RequestHandler
);

router.put('/:id', 
  checkPermissions(['automations:update']) as RequestHandler,
  AutomationController.update as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['automations:delete']) as RequestHandler,
  AutomationController.delete as RequestHandler
);

// Operaciones especiales
router.patch('/:id/status', 
  checkPermissions(['automations:activate']) as RequestHandler,
  AutomationController.changeStatus as RequestHandler
);

router.post('/:id/duplicate', 
  checkPermissions(['automations:duplicate']) as RequestHandler,
  AutomationController.duplicate as RequestHandler
);

export default router; 