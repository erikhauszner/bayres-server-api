import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { IEmployee } from '../models/Employee';
import Employee from '../models/Employee';
import { getIO, isSocketInitialized } from '../socket'; // Importar getIO
import { logAuditAction } from '../utils/auditUtils';

// Definir tipos para usar en el controlador
interface RequestWithUser extends Request {
  user?: IEmployee;
  employee?: IEmployee;
}

// Interfaz para la acción de notificación
interface NotificationAction {
  label: string;
  url: string;
}

// Interfaz para la solicitud de envío de notificación
interface SendNotificationRequest {
  title: string;
  description: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  user_id?: string;
  action?: NotificationAction;
  data?: Record<string, any>;
  duration?: number;
}

export class NotificationController {
  /**
   * Obtener las notificaciones del usuario actual
   */
  static async getNotifications(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { isRead, type, priority, page = 1, limit = 20 } = req.query;
      
      const result = await NotificationService.getByEmployee({
        employeeId: employeeId.toString(),
        isRead: isRead === 'true',
        type: type as any,
        priority: priority as any,
        page: Number(page),
        limit: Number(limit)
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Contar notificaciones no leídas
   */
  static async countUnread(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { type } = req.query;
      const count = await NotificationService.countUnread(
        employeeId.toString(),
        type as any
      );

      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Marcar una notificación como leída
   */
  static async markAsRead(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { notificationId } = req.params;
      const notification = await NotificationService.markAsRead(
        notificationId,
        employeeId.toString()
      );

      if (!notification) {
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }

      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { type } = req.query;
      const count = await NotificationService.markAllAsRead(
        employeeId.toString(),
        type as any
      );

      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Eliminar una notificación
   */
  static async deleteNotification(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { notificationId } = req.params;
      const success = await NotificationService.delete(
        notificationId,
        employeeId.toString()
      );

      if (!success) {
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }

      res.json({ message: 'Notificación eliminada' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Eliminar todas las notificaciones
   */
  static async deleteAllNotifications(req: RequestWithUser, res: Response) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const { isRead } = req.query;
      const count = await NotificationService.deleteAll(
        employeeId.toString(),
        isRead === 'true'
      );

      // Registrar auditoría
      await logAuditAction(
        req,
        'eliminación',
        `Eliminación masiva de notificaciones (${count} eliminadas)`,
        'notificación',
        employeeId.toString(),
        undefined,
        { deletedCount: count, isRead: isRead === 'true' },
        'notificaciones'
      );

      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Envía una notificación a un usuario específico o a todos
   */
  static async sendNotification(req: RequestWithUser, res: Response) {
    try {
      // Determinar si la notificación viene de la API externa
      const isExternalNotification = req.originalUrl?.includes('/external/notifications');
      console.log(`Recibiendo notificación ${isExternalNotification ? 'EXTERNA' : 'interna'} en: ${req.originalUrl}`);
      
      const {
        title,
        description,
        variant = 'default',
        user_id,
        action,
        data,
        duration
      } = req.body as SendNotificationRequest;

      // Validar campos requeridos
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren los campos title y description'
        });
      }

      // Detectar si es una notificación relacionada con leads
      const isLeadRelated = 
        (title || '').includes('lead') || 
        (title || '').includes('Lead') || 
        (title || '').includes('Obteniendo') ||
        (description || '').includes('lead');
      
      // TODAS las notificaciones de /external/notifications son externas
      const shouldForceExternal = isExternalNotification || isLeadRelated;
      
      if (isExternalNotification) {
        console.log('🌐 NOTIFICACIÓN EXTERNA detectada por ruta /external/notifications');
      }
      if (isLeadRelated) {
        console.log('🔔 DETECTADA NOTIFICACIÓN DE LEADS, forzando tratamiento como EXTERNA');
      }

      // Mapear variantes a prioridades
      const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'default': 'medium',
        'success': 'medium',
        'warning': 'high',
        'destructive': 'high'
      };

      // Mapear variantes a tipos
      const typeMap: Record<string, 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system'> = {
        'default': 'system',
        'success': 'system',
        'warning': 'system',
        'destructive': 'system'
      };

      const priority = priorityMap[variant] || 'medium';
      const type = typeMap[variant] || 'system';

      // Metadata para la notificación
      const metadata: Record<string, any> = {
        ...data,
        variant,
        action,
        duration,
        isExternalNotification: shouldForceExternal,
        isLeadRelated
      };

      let result;

      // Si se especifica un usuario_id, enviar solo a ese usuario
      if (user_id) {
        // Verificar que el usuario existe
        const employee = await Employee.findById(user_id);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
          });
        }

        result = await NotificationService.create({
          title,
          message: description,
          type,
          priority,
          employeeId: user_id,
          metadata
        });

        console.log(`Enviando notificación a usuario específico: ${user_id}, ID: ${result._id}, Título: ${title}`);
        
        // Emitir evento de Socket.IO para notificar al usuario específico
        if (isSocketInitialized()) {
          const io = getIO();
          io.to(`employee:${user_id}`).emit('new_notification', {
            notification: {
              _id: result._id,
              title,
              message: description,
              type,
              status: 'unread',
              createdAt: new Date(),
              variant,
              action,
              duration: duration || 5000,
              data: data || {},
              // SIEMPRE mostrar como toast para notificaciones externas
              showAsToast: true,
              isExternalNotification: shouldForceExternal,
              isLeadRelated
            }
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Notificación enviada correctamente',
          notification_id: result._id ? result._id.toString() : `notification_${Date.now()}`
        });
      }

      // Si no hay usuario_id, enviar a todos los usuarios activos
      const employees = await Employee.find({ isActive: true }).select('_id') as (IEmployee & { _id: any })[];
      const employeeIds = employees.map(emp => emp._id.toString());

      result = await NotificationService.createForMultipleEmployees(employeeIds, {
        title,
        message: description,
        type,
        priority,
        metadata
      });

      console.log(`Enviando notificación BROADCAST a todos los usuarios, Título: ${title}`);
      
      // Emitir evento de Socket.IO para notificar a todos los usuarios
      if (isSocketInitialized()) {
        const io = getIO();
        io.emit('new_notification', {
          notification: {
            title,
            message: description,
            type,
            status: 'unread',
            createdAt: new Date(),
            variant,
            action,
            duration: duration || 5000,
            data: data || {},
            // SIEMPRE mostrar como toast para notificaciones externas
            showAsToast: true,
            isExternalNotification: shouldForceExternal,
            isLeadRelated
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Notificación enviada correctamente a todos los usuarios',
        notification_id: `batch_${Date.now()}`
      });
    } catch (error: any) {
      console.error('Error al enviar notificación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar la notificación',
        error: error.message
      });
    }
  }
} 