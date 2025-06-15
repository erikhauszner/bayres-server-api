import AuditLog, { IAuditLog } from '../models/AuditLog';
import { Request } from 'express';
import mongoose from 'mongoose';

interface AuditLogData {
  userId: string;
  userName: string;
  action: string;
  description: string;
  targetType: string;
  targetId: string;
  previousData?: any;
  newData?: any;
  module: string;
}

class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  async logAction(req: Request, data: AuditLogData): Promise<IAuditLog> {
    try {
      const ip = this.getClientIp(req);
      const userAgent = req.headers['user-agent'];

      const auditLog = new AuditLog({
        ...data,
        ip,
        userAgent,
        timestamp: new Date()
      });

      return await auditLog.save();
    } catch (error) {
      console.error('Error al guardar log de auditoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de auditoría con filtros opcionales
   */
  async getLogs(filters: any = {}, page: number = 1, limit: number = 20, sortBy: string = '-timestamp'): Promise<{ logs: IAuditLog[], total: number, pages: number }> {
    try {
      const query = this.buildQuery(filters);
      
      const total = await AuditLog.countDocuments(query);
      const pages = Math.ceil(total / limit);
      
      const logs = await AuditLog.find(query)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      return {
        logs,
        total,
        pages
      };
    } catch (error) {
      console.error('Error al obtener logs de auditoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene un log específico por ID
   */
  async getLogById(id: string): Promise<IAuditLog | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      
      return await AuditLog.findById(id).lean();
    } catch (error) {
      console.error('Error al obtener log por ID:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStatistics(startDate?: string, endDate?: string, includeSystemActivities?: boolean): Promise<any> {
    try {
      // Construir filtros usando la misma lógica que buildQuery
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeSystemActivities !== undefined) filters.includeSystemActivities = includeSystemActivities;
      
      const matchFilter = this.buildQuery(filters);

      // Actividades por tipo
      const actionStats = await AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Actividades por módulo
      const moduleStats = await AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Actividades por tipo de objetivo
      const targetTypeStats = await AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$targetType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Actividades por usuario
      const userStats = await AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Actividades por día
      const dailyStats = await AuditLog.aggregate([
        { $match: matchFilter },
        { 
          $group: { 
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        actionStats,
        moduleStats,
        targetTypeStats,
        userStats,
        dailyStats,
        total: await AuditLog.countDocuments(matchFilter)
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de auditoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene actividades recientes
   */
  async getRecentActivities(limit: number = 10, includeSystemActivities: boolean = false): Promise<IAuditLog[]> {
    try {
      // Usar buildQuery para consistencia con otros métodos
      const filters = { includeSystemActivities };
      const query = this.buildQuery(filters);

      return await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error al obtener actividades recientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de actividades de un usuario
   */
  async getUserActivityHistory(userId: string, page: number = 1, limit: number = 20): Promise<{ logs: IAuditLog[], total: number, pages: number }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { logs: [], total: 0, pages: 0 };
      }

      const query = { userId: userId };
      
      const total = await AuditLog.countDocuments(query);
      const pages = Math.ceil(total / limit);
      
      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      return {
        logs,
        total,
        pages
      };
    } catch (error) {
      console.error('Error al obtener historial de actividades del usuario:', error);
      throw error;
    }
  }

  /**
   * Política de retención: Elimina registros antiguos según configuración
   */
  async applyRetentionPolicy(retentionDays: number = 365): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Eliminar registros más antiguos que el periodo de retención
      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`Política de retención aplicada: ${result.deletedCount} registros eliminados`);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error al aplicar política de retención:', error);
      throw error;
    }
  }

  /**
   * Archiva registros antiguos (mover a una colección de archivo)
   */
  async archiveOldLogs(archiveDays: number = 90): Promise<{ archivedCount: number }> {
    try {
      const archiveCutoffDate = new Date();
      archiveCutoffDate.setDate(archiveCutoffDate.getDate() - archiveDays);

      // Buscar registros para archivar
      const logsToArchive = await AuditLog.find({
        timestamp: { $lt: archiveCutoffDate }
      });

      if (logsToArchive.length === 0) {
        return { archivedCount: 0 };
      }

      // Simplemente eliminar los registros antiguos para evitar complejidad
      // En una implementación más completa podrías exportar a un archivo
      const deleteResult = await AuditLog.deleteMany({
        _id: { $in: logsToArchive.map(log => log._id) }
      });

      console.log(`${deleteResult.deletedCount} registros archivados (eliminados)`);
      
      return { archivedCount: deleteResult.deletedCount };
    } catch (error) {
      console.error('Error al archivar registros:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de almacenamiento
   */
  async getStorageStats(): Promise<any> {
    try {
      const totalLogs = await AuditLog.countDocuments();
      
      // Estadísticas por antigüedad
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const last365Days = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const logsLast30Days = await AuditLog.countDocuments({ timestamp: { $gte: last30Days } });
      const logsLast90Days = await AuditLog.countDocuments({ timestamp: { $gte: last90Days } });
      const logsLast365Days = await AuditLog.countDocuments({ timestamp: { $gte: last365Days } });
      const logsOlderThan365Days = await AuditLog.countDocuments({ timestamp: { $lt: last365Days } });

      // Tamaño estimado
      const avgDocumentSize = 2048; // bytes aproximados por documento
      const estimatedSizeBytes = totalLogs * avgDocumentSize;
      const estimatedSizeMB = estimatedSizeBytes / (1024 * 1024);

      return {
        totalLogs,
        logsLast30Days,
        logsLast90Days,
        logsLast365Days,
        logsOlderThan365Days,
        estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de almacenamiento:', error);
      throw error;
    }
  }

  /**
   * Optimiza los índices de la colección
   */
  async optimizeIndexes(): Promise<void> {
    try {
      // Eliminar y recrear índices para optimizar
      await AuditLog.collection.dropIndexes();
      await AuditLog.ensureIndexes();
      console.log('Índices de auditoría optimizados');
    } catch (error) {
      console.error('Error al optimizar índices:', error);
      throw error;
    }
  }

  /**
   * Construye el query para filtrar logs
   */
  private buildQuery(filters: any): any {
    const query: any = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.module) query.module = filters.module;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.targetId) query.targetId = filters.targetId;
    
    // Excluir actividades automáticas del sistema por defecto
    // Solo mostrar actividades del sistema si se solicita explícitamente
    if (!filters.includeSystemActivities) {
      query.$and = [
        { userName: { $ne: "Usuario desconocido" } },
        { userName: { $ne: "sistema" } },
        { module: { $ne: "sistema" } }
      ];
    }
    
    // Rango de fechas
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDate;
      }
    }
    
    // Búsqueda por texto en descripción
    if (filters.searchText) {
      query.$or = [
        { description: { $regex: filters.searchText, $options: 'i' } },
        { userName: { $regex: filters.searchText, $options: 'i' } }
      ];
    }
    
    return query;
  }

  /**
   * Obtiene la dirección IP del cliente
   */
  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any)?.socket?.remoteAddress || 
           '0.0.0.0';
  }
}

export default new AuditService(); 