import { Request, Response } from 'express';
import { CronService } from '../services/cronService';
import { ScheduledNotificationService } from '../services/scheduledNotificationService';
import ScheduledNotification from '../models/ScheduledNotification';

interface RequestWithUser extends Request {
  user?: any;
  employee?: any;
}

export class ScheduledNotificationController {
  /**
   * Obtener el estado de todos los trabajos programados
   */
  static async getJobsStatus(req: RequestWithUser, res: Response) {
    try {
      const status = CronService.getJobsStatus();
      res.json({
        success: true,
        jobs: status,
        totalJobs: status.length,
        runningJobs: status.filter(job => job.running).length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de los trabajos',
        error: error.message
      });
    }
  }

  /**
   * Ejecutar manualmente todas las verificaciones
   */
  static async runManualCheck(req: RequestWithUser, res: Response) {
    try {
      const results = await CronService.runManualCheck();
      res.json({
        success: true,
        message: 'Verificación manual completada',
        results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error en la verificación manual',
        error: error.message
      });
    }
  }

  /**
   * Programar una notificación personalizada
   */
  static async scheduleCustomNotification(req: RequestWithUser, res: Response) {
    try {
      const {
        title,
        message,
        employeeId,
        scheduledFor,
        type = 'system',
        priority = 'medium',
        metadata
      } = req.body;

      // Validaciones
      if (!title || !message || !employeeId || !scheduledFor) {
        return res.status(400).json({
          success: false,
          message: 'Los campos title, message, employeeId y scheduledFor son requeridos'
        });
      }

      // Verificar que la fecha no sea en el pasado
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha programada debe ser en el futuro'
        });
      }

      await CronService.scheduleCustomNotification({
        title,
        message,
        employeeId,
        scheduledFor: scheduledDate,
        type,
        priority,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Notificación programada correctamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al programar la notificación',
        error: error.message
      });
    }
  }

  /**
   * Obtener notificaciones programadas
   */
  static async getScheduledNotifications(req: RequestWithUser, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        executed,
        type,
        employeeId
      } = req.query;

      const query: any = { isActive: true };

      if (executed !== undefined) {
        query.executed = executed === 'true';
      }

      if (type) {
        query.type = type;
      }

      if (employeeId) {
        query.employeeId = employeeId;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [notifications, total] = await Promise.all([
        ScheduledNotification.find(query)
          .populate('employeeId', 'firstName lastName email')
          .sort({ scheduledFor: -1 })
          .skip(skip)
          .limit(Number(limit)),
        ScheduledNotification.countDocuments(query)
      ]);

      res.json({
        success: true,
        notifications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las notificaciones programadas',
        error: error.message
      });
    }
  }

  /**
   * Cancelar una notificación programada
   */
  static async cancelScheduledNotification(req: RequestWithUser, res: Response) {
    try {
      const { id } = req.params;

      const notification = await ScheduledNotification.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación programada no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Notificación programada cancelada',
        notification
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al cancelar la notificación programada',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  static async getNotificationStats(req: RequestWithUser, res: Response) {
    try {
      const [
        totalScheduled,
        pendingExecutions,
        executedToday,
        failedExecutions
      ] = await Promise.all([
        ScheduledNotification.countDocuments({ isActive: true }),
        ScheduledNotification.countDocuments({ 
          isActive: true, 
          executed: false,
          scheduledFor: { $lte: new Date() }
        }),
        ScheduledNotification.countDocuments({
          executed: true,
          executedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }),
        ScheduledNotification.countDocuments({
          isActive: true,
          executed: false,
          scheduledFor: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      // Estadísticas por tipo
      const byType = await ScheduledNotification.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Estadísticas por prioridad
      const byPriority = await ScheduledNotification.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        stats: {
          total: {
            scheduled: totalScheduled,
            pending: pendingExecutions,
            executedToday,
            failed: failedExecutions
          },
          byType,
          byPriority
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: error.message
      });
    }
  }

  /**
   * Obtener notificaciones próximas para el dashboard
   */
  static async getUpcomingNotifications(req: RequestWithUser, res: Response) {
    try {
      const { days = 7 } = req.query;
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      const now = new Date();
      const futureDate = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);

      // Buscar notificaciones programadas para el usuario actual en los próximos X días
      const notifications = await ScheduledNotification.find({
        employeeId: employeeId,
        scheduledFor: { $gte: now, $lte: futureDate },
        executed: false,
        isActive: true
      })
      .populate('employeeId', 'firstName lastName email')
      .sort({ scheduledFor: 1 })
      .limit(20);

      res.json({
        success: true,
        notifications,
        total: notifications.length,
        timeframe: `próximos ${days} días`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las notificaciones próximas',
        error: error.message
      });
    }
  }

  /**
   * Limpiar notificaciones ejecutadas
   */
  static async cleanupExecutedNotifications(req: RequestWithUser, res: Response) {
    try {
      const deleted = await ScheduledNotificationService.cleanupExecutedNotifications();
      
      res.json({
        success: true,
        message: `Se eliminaron ${deleted} notificaciones antiguas`,
        deletedCount: deleted
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al limpiar las notificaciones',
        error: error.message
      });
    }
  }
} 