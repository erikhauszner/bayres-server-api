import { Router, RequestHandler } from 'express';
import { ScheduledNotificationController } from '../controllers/scheduledNotification.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener estado de trabajos programados
router.get('/jobs/status', 
  checkPermissions(['admin:view', 'notifications:view']) as RequestHandler,
  ScheduledNotificationController.getJobsStatus as RequestHandler
);

// Ejecutar verificación manual
router.post('/jobs/run-check', 
  checkPermissions(['admin:write', 'notifications:create']) as RequestHandler,
  ScheduledNotificationController.runManualCheck as RequestHandler
);

// Programar notificación personalizada
router.post('/schedule', 
  checkPermissions(['notifications:create']) as RequestHandler,
  ScheduledNotificationController.scheduleCustomNotification as RequestHandler
);

// Obtener notificaciones programadas
router.get('/', 
  ScheduledNotificationController.getScheduledNotifications as RequestHandler
);

// Obtener notificaciones próximas para el dashboard
router.get('/upcoming', 
  ScheduledNotificationController.getUpcomingNotifications as RequestHandler
);

// Cancelar notificación programada
router.delete('/:id', 
  checkPermissions(['notifications:delete']) as RequestHandler,
  ScheduledNotificationController.cancelScheduledNotification as RequestHandler
);

// Obtener estadísticas
router.get('/stats', 
  checkPermissions(['admin:view', 'notifications:view']) as RequestHandler,
  ScheduledNotificationController.getNotificationStats as RequestHandler
);

// Limpiar notificaciones ejecutadas
router.post('/cleanup', 
  checkPermissions(['admin:write']) as RequestHandler,
  ScheduledNotificationController.cleanupExecutedNotifications as RequestHandler
);

export default router; 