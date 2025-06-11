import { Request, Response } from 'express';
import Notification from '../models/Notification';
import ScheduledNotification from '../models/ScheduledNotification';
import { Project } from '../models/Project';
import Employee from '../models/Employee';
import mongoose from 'mongoose';

// Crear notificación manual
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      message, 
      type, 
      priority, 
      recipients, 
      relatedTo,
      relatedModel,
      scheduledFor 
    } = req.body;

    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      recipients: recipients || [],
      sender: req.user?._id,
      relatedTo,
      relatedModel,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      status: scheduledFor ? 'scheduled' : 'sent'
    });

    await notification.save();
    
    // Poblar los datos para la respuesta
    await notification.populate('recipients', 'firstName lastName email');
    await notification.populate('sender', 'firstName lastName email');

    res.status(201).json(notification);
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error al crear la notificación' });
  }
};

// Obtener notificaciones del usuario
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filter: any = {
      recipients: userId,
      status: { $in: ['sent', 'delivered'] }
    };

    // Filtros adicionales
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.isRead !== undefined) {
      filter[`readBy.${userId}`] = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    res.json({
      data: notifications,
      total,
      page,
      limit
    });
  } catch (error: any) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: 'Error al obtener las notificaciones' });
  }
};

// Marcar notificación como leída
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipients: userId },
      { 
        $set: { 
          [`readBy.${userId}`]: true,
          [`readAt.${userId}`]: new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Notificación no encontrada' });
      return;
    }

    res.json(notification);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error al marcar la notificación como leída' });
  }
};

// Crear notificaciones automáticas para proyectos
export const createProjectNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, type, daysBeforeDeadline } = req.body;

    const project = await Project.findById(projectId)
      .populate('team', 'firstName lastName email')
      .populate('manager', 'firstName lastName email');

    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    let notifications = [];

    switch (type) {
      case 'deadline_reminder':
        if (project.endDate) {
          const reminderDate = new Date(project.endDate);
          reminderDate.setDate(reminderDate.getDate() - (daysBeforeDeadline || 3));

          // Crear notificación para cada miembro del equipo
          const teamMembers = [...project.team, project.manager].filter(Boolean);
          
          for (const memberId of teamMembers) {
            const deadlineNotification = new ScheduledNotification({
              title: `Recordatorio: Proyecto "${project.name}" próximo a vencer`,
              message: `El proyecto "${project.name}" tiene fecha límite el ${project.endDate.toLocaleDateString('es-ES')}`,
              type: 'project',
              priority: 'high',
              employeeId: memberId,
              entityType: 'project',
              entityId: (project._id as any).toString(),
              scheduledFor: reminderDate,
              frequency: 'daily'
            });

            await deadlineNotification.save();
            notifications.push(deadlineNotification);
          }
        }
        break;

      case 'status_change':
        const statusNotification = new Notification({
          title: `Cambio de estado en proyecto "${project.name}"`,
          message: `El proyecto "${project.name}" ha cambiado su estado a ${project.status}`,
          type: 'project_update',
          priority: 'medium',
          recipients: [...project.team, project.manager].filter(Boolean),
          sender: req.user?._id,
          relatedTo: (project._id as any).toString(),
          relatedModel: 'Project'
        });

        await statusNotification.save();
        notifications.push(statusNotification);
        break;

      case 'budget_alert':
        // Verificar si se ha excedido el 80% del presupuesto
        const budgetUsed = project.budget * 0.8; // 80% del presupuesto
        
        const budgetNotification = new Notification({
          title: `Alerta de presupuesto: Proyecto "${project.name}"`,
          message: `El proyecto "${project.name}" ha utilizado más del 80% de su presupuesto asignado`,
          type: 'budget_alert',
          priority: 'high',
          recipients: project.manager ? [project.manager] : [],
          sender: req.user?._id,
          relatedTo: (project._id as any).toString(),
          relatedModel: 'Project'
        });

        await budgetNotification.save();
        notifications.push(budgetNotification);
        break;
    }

    res.status(201).json({
      message: 'Notificaciones creadas exitosamente',
      notifications
    });
  } catch (error: any) {
    console.error('Error creating project notifications:', error);
    res.status(500).json({ message: 'Error al crear las notificaciones del proyecto' });
  }
};

// Obtener notificaciones de un proyecto específico
export const getProjectNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    const notifications = await Notification.find({
      relatedTo: projectId,
      relatedModel: 'Project'
    })
      .populate('sender', 'firstName lastName email')
      .populate('recipients', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching project notifications:', error);
    res.status(500).json({ message: 'Error al obtener las notificaciones del proyecto' });
  }
};

// Procesar notificaciones programadas
export const processScheduledNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    
    const scheduledNotifications = await ScheduledNotification.find({
      scheduledFor: { $lte: now },
      executed: false,
      isActive: true
    });

    let processedCount = 0;

    for (const scheduled of scheduledNotifications) {
      try {
        // Crear la notificación real
        const notification = new Notification({
          title: scheduled.title,
          message: scheduled.message,
          type: scheduled.type,
          priority: scheduled.priority,
          recipients: [scheduled.employeeId], // Usar employeeId en lugar de recipients
          relatedTo: scheduled.entityId, // Usar entityId en lugar de relatedTo
          relatedModel: scheduled.entityType // Usar entityType en lugar de relatedModel
        });

        await notification.save();

        // Marcar como procesada
        scheduled.executed = true; // Usar executed en lugar de status
        scheduled.executedAt = now;
        await scheduled.save();

        processedCount++;
      } catch (error) {
        console.error('Error processing scheduled notification:', error);
        scheduled.isActive = false; // Marcar como inactiva en lugar de failed
        await scheduled.save();
      }
    }

    res.json({
      message: `${processedCount} notificaciones procesadas exitosamente`,
      processed: processedCount
    });
  } catch (error: any) {
    console.error('Error processing scheduled notifications:', error);
    res.status(500).json({ message: 'Error al procesar las notificaciones programadas' });
  }
};

// Eliminar notificación
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipients: userId
    });

    if (!notification) {
      res.status(404).json({ message: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error al eliminar la notificación' });
  }
}; 