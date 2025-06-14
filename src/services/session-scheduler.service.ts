import { SessionCleanupService } from './session-cleanup.service';
import Logger from '../utils/logger';

export class SessionSchedulerService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Inicia el sistema de limpieza automática de sesiones
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      Logger.warn('El servicio de limpieza de sesiones ya está ejecutándose');
      return;
    }

    try {
      Logger.info('🚀 Iniciando sistema de limpieza automática de sesiones...');

      // **LIMPIEZA INICIAL**: Limpiar sesiones expiradas al iniciar el servidor
      const initialCleanup = await SessionCleanupService.cleanupExpiredSessions();
      const initialStats = await SessionCleanupService.getSessionStats();

      Logger.info('Limpieza inicial de sesiones completada', {
        deletedCount: initialCleanup,
        currentStats: initialStats
      });

      // **PROGRAMAR LIMPIEZA PERIÓDICA**: Cada 15 minutos
      const intervalMinutes = 15;
      this.cleanupInterval = setInterval(async () => {
        try {
          const deletedCount = await SessionCleanupService.cleanupExpiredSessions();
          if (deletedCount > 0) {
            const stats = await SessionCleanupService.getSessionStats();
            Logger.info('Limpieza automática programada ejecutada', {
              deletedCount,
              remainingStats: stats
            });
          }
        } catch (error) {
          Logger.error('Error en limpieza automática programada', error);
        }
      }, intervalMinutes * 60 * 1000);
      
      this.isRunning = true;

      Logger.info(`✅ Sistema de limpieza automática iniciado correctamente (cada ${intervalMinutes} minutos)`);

    } catch (error) {
      Logger.error('❌ Error al iniciar el sistema de limpieza de sesiones', error);
      throw error;
    }
  }

  /**
   * Detiene el sistema de limpieza automática
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.isRunning = false;
      Logger.info('🛑 Sistema de limpieza automática de sesiones detenido');
    }
  }

  /**
   * Verifica si el sistema está ejecutándose
   */
  static isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Ejecuta una limpieza manual inmediata
   */
  static async executeManualCleanup(): Promise<{
    deletedCount: number;
    stats: any;
  }> {
    try {
      Logger.info('🧹 Ejecutando limpieza manual de sesiones...');
      
      const deletedCount = await SessionCleanupService.cleanupExpiredSessions();
      const stats = await SessionCleanupService.getSessionStats();
      
      Logger.info('Limpieza manual completada', {
        deletedCount,
        stats
      });
      
      return { deletedCount, stats };
    } catch (error) {
      Logger.error('Error durante limpieza manual', error);
      throw error;
    }
  }
} 