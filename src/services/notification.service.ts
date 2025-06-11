import Employee, { IEmployee } from '../models/Employee';
import Notification, { INotification } from '../models/Notification';
import { io } from '../server';

type NotificationType = 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead';
type EntityType = 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead' | 'other';
type Priority = 'low' | 'normal' | 'high';

// Interfaz para la creación de notificaciones
interface CreateNotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  priority: 'low' | 'medium' | 'high';
  entityType?: EntityType;
  entityId?: string;
  employeeId: string;
  metadata?: Record<string, any>;
}

// Interfaz para filtrar notificaciones
interface NotificationFilter {
  employeeId: string;
  isRead?: boolean;
  type?: NotificationType;
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

export class NotificationService {
  /**
   * Crear una nueva notificación
   */
  static async create(options: CreateNotificationOptions): Promise<INotification> {
    const notification = new Notification({
      title: options.title,
      message: options.message,
      type: options.type,
      priority: options.priority,
      entityType: options.entityType,
      entityId: options.entityId,
      employeeId: options.employeeId,
      metadata: options.metadata,
      isRead: false,
      createdAt: new Date()
    });

    await notification.save();
    
    // Enviar notificación a través de Socket.IO
    this.sendViaSocket(notification);
    
    return notification;
  }

  /**
   * Enviar notificación a través de Socket.IO
   */
  static sendViaSocket(notification: INotification): void {
    try {
      // Enviar la notificación a la sala del empleado
      if (io && notification.employeeId) {
        const room = `employee:${notification.employeeId}`;
        console.log(`Enviando notificación por Socket.IO a la sala ${room}`);

        // Extraer información de metadatos
        const metadata = notification.metadata || {};
        const variant = metadata.variant || 'default';
        const action = metadata.action;
        const duration = metadata.duration || 5000;
        
        io.to(room).emit('new_notification', {
          notification: {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            status: 'unread',
            createdAt: notification.createdAt,
            variant: variant,
            action: action,
            duration: duration,
            data: metadata.data || {},
            // Agregar bandera para mostrar como toast
            showAsToast: true
          }
        });
      }
    } catch (error) {
      console.error('Error al enviar notificación por Socket.IO:', error);
    }
  }

  /**
   * Crear una notificación para varios empleados a la vez
   */
  static async createForMultipleEmployees(employeeIds: string[], options: Omit<CreateNotificationOptions, 'employeeId'>): Promise<INotification[]> {
    const notifications = await Promise.all(
      employeeIds.map(employeeId =>
        this.create({
          ...options,
          employeeId
        })
      )
    );

    return notifications;
  }

  /**
   * Crear una notificación para todos los empleados con un rol específico
   */
  static async createForRole(role: string, options: Omit<CreateNotificationOptions, 'employeeId'>): Promise<INotification[]> {
    const employees = await Employee.find({ role, isActive: true }).select('_id') as (IEmployee & { _id: any })[];
    const employeeIds = employees.map(employee => employee._id.toString());
    
    return this.createForMultipleEmployees(employeeIds, options);
  }

  /**
   * Obtener notificaciones de un empleado
   */
  static async getByEmployee(filter: NotificationFilter): Promise<{ notifications: INotification[], total: number }> {
    const { employeeId, isRead, type, priority, page = 1, limit = 20 } = filter;
    
    const query: any = { employeeId };
    
    if (typeof isRead === 'boolean') {
      query.isRead = isRead;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return { notifications, total };
  }

  /**
   * Marcar una notificación como leída
   */
  static async markAsRead(notificationId: string, employeeId: string): Promise<INotification | null> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, employeeId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    return notification;
  }

  /**
   * Marcar todas las notificaciones de un empleado como leídas
   */
  static async markAllAsRead(employeeId: string, type?: NotificationType): Promise<number> {
    const query: any = { employeeId, isRead: false };
    
    if (type) {
      query.type = type;
    }
    
    const result = await Notification.updateMany(
      query,
      { isRead: true, readAt: new Date() }
    );
    return result.modifiedCount;
  }

  /**
   * Eliminar una notificación
   */
  static async delete(notificationId: string, employeeId: string): Promise<boolean> {
    const result = await Notification.deleteOne({ _id: notificationId, employeeId });
    return result.deletedCount > 0;
  }

  /**
   * Eliminar todas las notificaciones de un empleado
   */
  static async deleteAll(employeeId: string, isRead?: boolean): Promise<number> {
    const query: any = { employeeId };
    
    if (typeof isRead === 'boolean') {
      query.isRead = isRead;
    }
    
    const result = await Notification.deleteMany(query);
    return result.deletedCount;
  }

  /**
   * Eliminar notificaciones expiradas
   * Esta función podría ejecutarse por un cron job periódicamente
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await Notification.deleteMany({ expiresAt: { $lt: now } });
    return result.deletedCount;
  }

  /**
   * Contar notificaciones no leídas de un empleado
   */
  static async countUnread(employeeId: string, type?: NotificationType): Promise<number> {
    const query: any = { employeeId, isRead: false };
    
    if (type) {
      query.type = type;
    }
    
    return Notification.countDocuments(query);
  }
} 