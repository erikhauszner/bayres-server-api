import Session from '../models/EmployeeSession';
import Logger from '../utils/logger';

export class SessionCleanupService {
  /**
   * Limpia todas las sesiones expiradas de la base de datos
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      
      // Encontrar todas las sesiones expiradas
      const expiredSessions = await Session.find({
        $or: [
          { expiresAt: { $lt: now } }, // Sesiones que ya expiraron por fecha
          { isActive: false }          // Sesiones marcadas como inactivas
        ]
      });

      if (expiredSessions.length === 0) {
        Logger.debug('No hay sesiones expiradas para limpiar');
        return 0;
      }

      // Eliminar las sesiones expiradas
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: now } },
          { isActive: false }
        ]
      });

      Logger.info(`Limpieza de sesiones completada: ${result.deletedCount} sesiones eliminadas`, {
        deletedCount: result.deletedCount,
        foundExpired: expiredSessions.length
      });

      return result.deletedCount;
    } catch (error) {
      Logger.error('Error durante la limpieza de sesiones expiradas', error);
      throw error;
    }
  }

  /**
   * Limpia las sesiones expiradas de un usuario específico
   */
  static async cleanupUserExpiredSessions(userId: string): Promise<number> {
    try {
      const now = new Date();
      
      const result = await Session.deleteMany({
        userId,
        $or: [
          { expiresAt: { $lt: now } },
          { isActive: false }
        ]
      });

      if (result.deletedCount > 0) {
        Logger.info(`Sesiones expiradas del usuario ${userId} eliminadas: ${result.deletedCount}`);
      }

      return result.deletedCount;
    } catch (error) {
      Logger.error(`Error al limpiar sesiones del usuario ${userId}`, error);
      throw error;
    }
  }

  /**
   * Desactiva todas las sesiones de un usuario (para logout completo)
   */
  static async deactivateAllUserSessions(userId: string): Promise<number> {
    try {
      const result = await Session.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );

      Logger.info(`Todas las sesiones del usuario ${userId} desactivadas: ${result.modifiedCount}`);
      return result.modifiedCount;
    } catch (error) {
      Logger.error(`Error al desactivar sesiones del usuario ${userId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de sesiones
   */
  static async getSessionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
  }> {
    try {
      const now = new Date();
      
      const [total, active, expired, inactive] = await Promise.all([
        Session.countDocuments({}),
        Session.countDocuments({ 
          isActive: true, 
          expiresAt: { $gt: now } 
        }),
        Session.countDocuments({ 
          isActive: true, 
          expiresAt: { $lt: now } 
        }),
        Session.countDocuments({ isActive: false })
      ]);

      return { total, active, expired, inactive };
    } catch (error) {
      Logger.error('Error al obtener estadísticas de sesiones', error);
      throw error;
    }
  }

  /**
   * Inicia el proceso de limpieza automática periódica
   */
  static startPeriodicCleanup(intervalMinutes: number = 30): NodeJS.Timer {
    Logger.info(`Iniciando limpieza automática de sesiones cada ${intervalMinutes} minutos`);
    
    return setInterval(async () => {
      try {
        const deletedCount = await this.cleanupExpiredSessions();
        if (deletedCount > 0) {
          const stats = await this.getSessionStats();
          Logger.info('Limpieza automática ejecutada', {
            deletedCount,
            remainingStats: stats
          });
        }
      } catch (error) {
        Logger.error('Error en limpieza automática de sesiones', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
} 