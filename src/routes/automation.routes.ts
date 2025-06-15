import express, { Router, RequestHandler } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

const router = Router();

// ========================================
// RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// ========================================

// Rutas públicas para acceso externo
router.get('/public/:name', AutomationController.getByName as RequestHandler);
router.get('/public/id/:id', AutomationController.getPublic as RequestHandler);

// ========================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ========================================
router.use(authenticateToken);

// RUTAS ESPECÍFICAS PRIMERO (importante: antes de /:id genérico)
// Endpoint protegido para enviar automatizaciones (requiere autenticación)
router.post('/:id/submit', 
  checkPermissions(['automations:submit']) as RequestHandler,
  AutomationController.submit as RequestHandler
);

// Endpoint alternativo para envíos desde el frontend (compatibilidad)
router.post('/:id/submit-form', 
  checkPermissions(['automations:submit']) as RequestHandler,
  AutomationController.submit as RequestHandler
);

// Operaciones especiales (también específicas)
router.patch('/:id/status', 
  checkPermissions(['automations:activate']) as RequestHandler,
  AutomationController.changeStatus as RequestHandler
);

router.post('/:id/duplicate', 
  checkPermissions(['automations:duplicate']) as RequestHandler,
  AutomationController.duplicate as RequestHandler
);

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

// Ruta específica para obtener automatización para formularios (solo requiere automations:submit)
router.get('/:id/form', 
  checkPermissions(['automations:submit']) as RequestHandler,
  AutomationController.getForForm as RequestHandler
);

// RUTA GENÉRICA AL FINAL (importante: después de rutas específicas)  
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

export default router; 