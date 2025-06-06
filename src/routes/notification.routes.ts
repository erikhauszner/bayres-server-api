// Este archivo ya no se usa. Las rutas de notificaciones
// se han definido directamente en src/index.ts para
// evitar problemas de tipado.
// Lo mantenemos como referencia.

import { Router, RequestHandler, Request, Response } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener notificaciones
router.get('/', NotificationController.getNotifications as RequestHandler);

// Marcar notificación como leída
router.patch('/:notificationId/read', NotificationController.markAsRead as RequestHandler);

// Marcar todas las notificaciones como leídas
router.patch('/read-all', NotificationController.markAllAsRead as RequestHandler);

// Eliminar una notificación
router.delete('/:notificationId', NotificationController.deleteNotification as RequestHandler);

// Eliminar todas las notificaciones
router.delete('/', NotificationController.deleteAllNotifications as RequestHandler);

// Contar notificaciones no leídas
router.get('/unread/count', NotificationController.countUnread as RequestHandler);

// Enviar notificación (nuevo endpoint según documentación)
router.post('/', 
  checkPermissions(['notifications:create']) as RequestHandler,
  (req, res, next) => {
    NotificationController.sendNotification(req, res)
      .catch(next);
  }
);

export default router; 