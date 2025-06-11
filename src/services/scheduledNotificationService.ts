import ScheduledNotification, { IScheduledNotification } from '../models/ScheduledNotification';
import { NotificationService } from './notification.service';
import Lead from '../models/Lead';
import Employee from '../models/Employee';
import mongoose from 'mongoose';

// Interfaz para crear notificaciones programadas
interface CreateScheduledNotificationOptions {
  title: string;
  message: string;
  type: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead';
  priority: 'low' | 'medium' | 'high';
  entityType?: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead' | 'other';
  entityId?: string;
  employeeId: string;
  scheduledFor: Date;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  metadata?: Record<string, any>;
}

export class ScheduledNotificationService {
  /**
   * Crear una notificación programada
   */
  static async create(options: CreateScheduledNotificationOptions): Promise<IScheduledNotification> {
    const scheduledNotification = new ScheduledNotification({
      title: options.title,
      message: options.message,
      type: options.type,
      priority: options.priority,
      entityType: options.entityType,
      entityId: options.entityId,
      employeeId: options.employeeId,
      scheduledFor: options.scheduledFor,
      frequency: options.frequency || 'once',
      nextExecution: options.frequency !== 'once' ? options.scheduledFor : undefined,
      metadata: options.metadata,
      isActive: true,
      executed: false
    });

    await scheduledNotification.save();
    console.log(`✅ Notificación programada creada: ${options.title} para ${options.scheduledFor}`);
    return scheduledNotification;
  }

  /**
   * Ejecutar notificaciones programadas que ya llegaron a su fecha
   */
  static async executeScheduledNotifications(): Promise<number> {
    const now = new Date();
    let executedCount = 0;

    try {
      // Obtener notificaciones que deben ejecutarse
      const notifications = await ScheduledNotification.find({
        scheduledFor: { $lte: now },
        executed: false,
        isActive: true
      }).populate('employeeId', 'firstName lastName email');

      console.log(`🔍 Encontradas ${notifications.length} notificaciones programadas para ejecutar`);

      for (const notification of notifications) {
        try {
          // Crear la notificación real
          await NotificationService.create({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            entityType: notification.entityType,
            entityId: notification.entityId,
            employeeId: notification.employeeId.toString(),
            metadata: {
              ...notification.metadata,
              isScheduledNotification: true,
              originalScheduledFor: notification.scheduledFor
            }
          });

          // Marcar como ejecutada
          notification.executed = true;
          notification.executedAt = now;

          // Si es recurrente, programar la siguiente ejecución
          if (notification.frequency !== 'once') {
            const nextExecution = this.calculateNextExecution(notification.scheduledFor, notification.frequency);
            
            // Crear una nueva notificación programada para la siguiente ejecución
            await this.create({
              title: notification.title,
              message: notification.message,
              type: notification.type,
              priority: notification.priority,
              entityType: notification.entityType,
              entityId: notification.entityId,
              employeeId: notification.employeeId.toString(),
              scheduledFor: nextExecution,
              frequency: notification.frequency,
              metadata: notification.metadata
            });
          }

          await notification.save();
          executedCount++;

          console.log(`✅ Notificación ejecutada: ${notification.title}`);
        } catch (error) {
          console.error(`❌ Error ejecutando notificación ${notification._id}:`, error);
        }
      }

      console.log(`🎯 Ejecutadas ${executedCount} notificaciones programadas`);
      return executedCount;
    } catch (error) {
      console.error('❌ Error en executeScheduledNotifications:', error);
      return executedCount;
    }
  }

  /**
   * Verificar seguimientos de leads pendientes
   */
  static async checkLeadFollowUps(): Promise<number> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let notificationsCreated = 0;

    try {
      // Buscar leads con seguimientos para hoy
      const leadsWithFollowUps = await Lead.find({
        'interactionHistory.date': { $gte: todayStart, $lt: todayEnd },
        'interactionHistory.type': 'other',
        'interactionHistory.title': 'Seguimiento programado',
        currentStage: 'Pendiente Seguimiento',
        assignedTo: { $exists: true }
      }).populate('assignedTo', 'firstName lastName email');

      console.log(`🔍 Encontrados ${leadsWithFollowUps.length} leads con seguimientos para hoy`);

      for (const lead of leadsWithFollowUps) {
        // Verificar si ya existe una notificación para este lead hoy
        const existingNotification = await ScheduledNotification.findOne({
          entityType: 'lead',
          entityId: lead._id.toString(),
          scheduledFor: { $gte: todayStart, $lt: todayEnd },
          executed: false,
          type: 'lead'
        });

        if (!existingNotification && lead.assignedTo) {
          // Encontrar el seguimiento programado para hoy
          const todayFollowUp = lead.interactionHistory?.find(interaction => {
            const interactionDate = new Date(interaction.date);
            return interactionDate >= todayStart && 
                   interactionDate < todayEnd && 
                   interaction.type === 'other' && 
                   interaction.title === 'Seguimiento programado';
          });

          if (todayFollowUp) {
            await this.create({
              title: `🔔 Seguimiento de Lead Programado`,
              message: `Tienes un seguimiento programado para ${lead.firstName} ${lead.lastName} de ${lead.company || 'empresa no especificada'}. Nota: ${todayFollowUp.description.split(': ')[1] || 'Sin detalles adicionales'}`,
              type: 'lead',
              priority: 'high',
              entityType: 'lead',
              entityId: lead._id.toString(),
              employeeId: (lead.assignedTo as any)._id.toString(),
              scheduledFor: todayFollowUp.date,
              metadata: {
                leadId: lead._id.toString(),
                leadName: `${lead.firstName} ${lead.lastName}`,
                company: lead.company,
                followUpNote: todayFollowUp.description,
                isLeadFollowUp: true
              }
            });

            notificationsCreated++;
            console.log(`✅ Notificación de seguimiento creada para lead: ${lead.firstName} ${lead.lastName}`);
          }
        }
      }

      console.log(`🎯 Creadas ${notificationsCreated} notificaciones de seguimiento de leads`);
      return notificationsCreated;
    } catch (error) {
      console.error('❌ Error en checkLeadFollowUps:', error);
      return notificationsCreated;
    }
  }

  /**
   * Verificar tareas vencidas o próximas a vencer
   */
  static async checkOverdueTasks(): Promise<number> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let notificationsCreated = 0;

    try {
      // Importar dinámicamente el modelo Task si existe
      let Task;
      try {
        Task = require('../models/Task').default;
      } catch (error) {
        console.log('📝 Modelo Task no encontrado, saltando verificación de tareas');
        return 0;
      }

      // Buscar tareas vencidas (que no estén completadas)
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $ne: 'completed' },
        isActive: true
      }).populate('assignedTo', 'firstName lastName email');

      // Buscar tareas que vencen mañana
      const upcomingTasks = await Task.find({
        dueDate: { $gte: now, $lt: tomorrow },
        status: { $ne: 'completed' },
        isActive: true
      }).populate('assignedTo', 'firstName lastName email');

      // Procesar tareas vencidas
      for (const task of overdueTasks) {
        if (task.assignedTo) {
          const existingNotification = await ScheduledNotification.findOne({
            entityType: 'task',
            entityId: task._id.toString(),
            type: 'task',
            scheduledFor: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
            executed: false
          });

          if (!existingNotification) {
            await this.create({
              title: `⚠️ Tarea Vencida`,
              message: `La tarea "${task.title}" está vencida desde ${task.dueDate.toLocaleDateString()}`,
              type: 'task',
              priority: 'high',
              entityType: 'task',
              entityId: task._id.toString(),
              employeeId: (task.assignedTo as any)._id.toString(),
              scheduledFor: now,
              metadata: {
                taskId: task._id.toString(),
                taskTitle: task.title,
                dueDate: task.dueDate,
                isOverdue: true
              }
            });

            notificationsCreated++;
          }
        }
      }

      // Procesar tareas próximas a vencer
      for (const task of upcomingTasks) {
        if (task.assignedTo) {
          const existingNotification = await ScheduledNotification.findOne({
            entityType: 'task',
            entityId: task._id.toString(),
            type: 'task',
            scheduledFor: { $gte: now, $lt: tomorrow },
            executed: false
          });

          if (!existingNotification) {
            await this.create({
              title: `📅 Tarea Próxima a Vencer`,
              message: `La tarea "${task.title}" vence mañana (${task.dueDate.toLocaleDateString()})`,
              type: 'task',
              priority: 'medium',
              entityType: 'task',
              entityId: task._id.toString(),
              employeeId: (task.assignedTo as any)._id.toString(),
              scheduledFor: now,
              metadata: {
                taskId: task._id.toString(),
                taskTitle: task.title,
                dueDate: task.dueDate,
                isDueSoon: true
              }
            });

            notificationsCreated++;
          }
        }
      }

      console.log(`🎯 Creadas ${notificationsCreated} notificaciones de tareas`);
      return notificationsCreated;
    } catch (error) {
      console.error('❌ Error en checkOverdueTasks:', error);
      return notificationsCreated;
    }
  }

  /**
   * Verificar facturas próximas a vencer
   */
  static async checkUpcomingInvoices(): Promise<number> {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let notificationsCreated = 0;

    try {
      // Importar dinámicamente el modelo Invoice si existe
      let Invoice;
      try {
        Invoice = require('../models/Finance/Invoice').Invoice;
      } catch (error) {
        console.log('💰 Modelo Invoice no encontrado, saltando verificación de facturas');
        return 0;
      }

      // Buscar facturas que vencen en los próximos 7 días
      const upcomingInvoices = await Invoice.find({
        dueDate: { $gte: now, $lte: nextWeek },
        status: { $in: ['draft', 'sent'] },
        isActive: { $ne: false }
      }).populate('createdBy', 'firstName lastName email');

      for (const invoice of upcomingInvoices) {
        if (invoice.createdBy) {
          const existingNotification = await ScheduledNotification.findOne({
            entityType: 'invoice',
            entityId: invoice._id.toString(),
            type: 'invoice',
            scheduledFor: { $gte: now },
            executed: false
          });

          if (!existingNotification) {
            const daysUntilDue = Math.ceil((invoice.dueDate - now) / (1000 * 60 * 60 * 24));
            
            await this.create({
              title: `💰 Factura Próxima a Vencer`,
              message: `La factura #${invoice.number} vence en ${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''} (${invoice.dueDate.toLocaleDateString()})`,
              type: 'invoice',
              priority: daysUntilDue <= 3 ? 'high' : 'medium',
              entityType: 'invoice',
              entityId: invoice._id.toString(),
              employeeId: (invoice.createdBy as any)._id.toString(),
              scheduledFor: now,
              metadata: {
                invoiceId: invoice._id.toString(),
                invoiceNumber: invoice.number,
                dueDate: invoice.dueDate,
                amount: invoice.total,
                daysUntilDue
              }
            });

            notificationsCreated++;
          }
        }
      }

      console.log(`🎯 Creadas ${notificationsCreated} notificaciones de facturas`);
      return notificationsCreated;
    } catch (error) {
      console.error('❌ Error en checkUpcomingInvoices:', error);
      return notificationsCreated;
    }
  }

  /**
   * Limpiar notificaciones programadas ejecutadas o vencidas
   */
  static async cleanupExecutedNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await ScheduledNotification.deleteMany({
        $or: [
          { executed: true, executedAt: { $lt: thirtyDaysAgo } },
          { scheduledFor: { $lt: thirtyDaysAgo }, executed: false, isActive: false }
        ]
      });

      console.log(`🧹 Limpiadas ${result.deletedCount} notificaciones programadas antiguas`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Error en cleanupExecutedNotifications:', error);
      return 0;
    }
  }

  /**
   * Calcular la próxima ejecución para notificaciones recurrentes
   */
  private static calculateNextExecution(lastExecution: Date, frequency: string): Date {
    const next = new Date(lastExecution);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return next;
    }
    
    return next;
  }

  /**
   * Ejecutar todas las verificaciones automáticas
   */
  static async runAllChecks(): Promise<{ executed: number; followUps: number; tasks: number; invoices: number; cleanup: number }> {
    console.log('🚀 Iniciando verificaciones automáticas de notificaciones...');
    
    const results = {
      executed: await this.executeScheduledNotifications(),
      followUps: await this.checkLeadFollowUps(),
      tasks: await this.checkOverdueTasks(),
      invoices: await this.checkUpcomingInvoices(),
      cleanup: await this.cleanupExecutedNotifications()
    };

    console.log('✅ Verificaciones automáticas completadas:', results);
    return results;
  }
} 