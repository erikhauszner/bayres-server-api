import * as cron from 'node-cron';
import { ScheduledNotificationService } from './scheduledNotification.service';

export class CronService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Inicializar todos los trabajos programados
   */
  static initializeJobs(): void {
    console.log('🚀 Inicializando trabajos programados de notificaciones...');

    // Ejecutar verificaciones cada 5 minutos
    this.scheduleJob('notifications-check', '*/5 * * * *', async () => {
      try {
        await ScheduledNotificationService.executeScheduledNotifications();
      } catch (error) {
        console.error('❌ Error en verificación de notificaciones cada 5 minutos:', error);
      }
    });

    // Verificar seguimientos de leads cada hora
    this.scheduleJob('lead-followups', '0 * * * *', async () => {
      try {
        await ScheduledNotificationService.checkLeadFollowUps();
      } catch (error) {
        console.error('❌ Error en verificación de seguimientos de leads:', error);
      }
    });

    // Verificar tareas vencidas cada 2 horas
    this.scheduleJob('overdue-tasks', '0 */2 * * *', async () => {
      try {
        await ScheduledNotificationService.checkOverdueTasks();
      } catch (error) {
        console.error('❌ Error en verificación de tareas vencidas:', error);
      }
    });

    // Verificar facturas próximas a vencer cada 4 horas
    this.scheduleJob('upcoming-invoices', '0 */4 * * *', async () => {
      try {
        await ScheduledNotificationService.checkUpcomingInvoices();
      } catch (error) {
        console.error('❌ Error en verificación de facturas próximas a vencer:', error);
      }
    });

    // Limpieza diaria a las 2:00 AM
    this.scheduleJob('daily-cleanup', '0 2 * * *', async () => {
      try {
        await ScheduledNotificationService.cleanupExecutedNotifications();
      } catch (error) {
        console.error('❌ Error en limpieza diaria:', error);
      }
    });

    // Verificación completa cada 6 horas
    this.scheduleJob('complete-check', '0 */6 * * *', async () => {
      try {
        const results = await ScheduledNotificationService.runAllChecks();
        console.log('🎯 Verificación completa realizada:', results);
      } catch (error) {
        console.error('❌ Error en verificación completa:', error);
      }
    });

    console.log(`✅ ${this.jobs.size} trabajos programados iniciados correctamente`);
  }

  /**
   * Programar un trabajo específico
   */
  private static scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      console.log(`⚠️ El trabajo '${name}' ya existe, sobrescribiendo...`);
      this.jobs.get(name)?.destroy();
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`⏰ Ejecutando trabajo programado: ${name}`);
      const startTime = Date.now();
      
      try {
        await task();
        const duration = Date.now() - startTime;
        console.log(`✅ Trabajo '${name}' completado en ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Error en trabajo '${name}' después de ${duration}ms:`, error);
      }
    }, {
      timezone: 'America/Argentina/Buenos_Aires' // Ajustar según tu zona horaria
    });

    this.jobs.set(name, job);
    console.log(`📅 Trabajo '${name}' programado con expresión: ${cronExpression}`);
  }

  /**
   * Detener un trabajo específico
   */
  static stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      console.log(`🛑 Trabajo '${name}' detenido`);
      return true;
    }
    return false;
  }

  /**
   * Detener todos los trabajos
   */
  static stopAllJobs(): void {
    console.log('🛑 Deteniendo todos los trabajos programados...');
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`🛑 Trabajo '${name}' detenido`);
    });
    this.jobs.clear();
    console.log('✅ Todos los trabajos programados han sido detenidos');
  }

  /**
   * Obtener el estado de todos los trabajos
   */
  static getJobsStatus(): { name: string; running: boolean; nextExecution?: Date }[] {
    const status: { name: string; running: boolean; nextExecution?: Date }[] = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: job.getStatus() === 'scheduled',
        nextExecution: job.getStatus() === 'scheduled' ? new Date() : undefined // node-cron no expone la próxima ejecución fácilmente
      });
    });

    return status;
  }

  /**
   * Ejecutar manualmente todas las verificaciones
   */
  static async runManualCheck(): Promise<any> {
    console.log('🔧 Ejecutando verificación manual de notificaciones...');
    try {
      const results = await ScheduledNotificationService.runAllChecks();
      console.log('✅ Verificación manual completada:', results);
      return results;
    } catch (error) {
      console.error('❌ Error en verificación manual:', error);
      throw error;
    }
  }

  /**
   * Programar una notificación personalizada
   */
  static async scheduleCustomNotification(options: {
    title: string;
    message: string;
    employeeId: string;
    scheduledFor: Date;
    type?: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead';
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await ScheduledNotificationService.create({
        title: options.title,
        message: options.message,
        type: options.type || 'system',
        priority: options.priority || 'medium',
        employeeId: options.employeeId,
        scheduledFor: options.scheduledFor,
        metadata: options.metadata
      });
      
      console.log(`📅 Notificación personalizada programada: ${options.title} para ${options.scheduledFor}`);
    } catch (error) {
      console.error('❌ Error programando notificación personalizada:', error);
      throw error;
    }
  }
} 