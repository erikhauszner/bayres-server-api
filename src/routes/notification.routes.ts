// Este archivo ya no se usa. Las rutas de notificaciones
// se han definido directamente en src/index.ts para
// evitar problemas de tipado.
// Lo mantenemos como referencia.

import express from 'express';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  createProjectNotifications,
  getProjectNotifications,
  processScheduledNotifications
} from '../controllers/notificationController';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas básicas de notificaciones
router.post('/', 
  checkPermissions(['notifications:create']),
  auditCreation('notificación', { module: 'notificaciones' }),
  createNotification
);

router.get('/user', 
  checkPermissions(['notifications:read']),
  getUserNotifications
);

router.put('/:id/read', 
  checkPermissions(['notifications:update']),
  auditUpdate('notificación', { module: 'notificaciones' }),
  markAsRead
);

router.delete('/:id', 
  checkPermissions(['notifications:delete']),
  auditDeletion('notificación', { module: 'notificaciones' }),
  deleteNotification
);

// Rutas específicas para proyectos
router.post('/project', 
  checkPermissions(['projects:update']),
  auditCreation('notificación_proyecto', { module: 'proyectos' }),
  createProjectNotifications
);

router.get('/project/:projectId', 
  checkPermissions(['projects:read']),
  getProjectNotifications
);

// Ruta para procesar notificaciones programadas (para uso interno/cron)
router.post('/process-scheduled', 
  checkPermissions(['notifications:create']),
  processScheduledNotifications
);

export default router; 