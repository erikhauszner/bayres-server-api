import { Request, Response } from 'express';
import auditService from '../services/auditService';
import { handleError as errorUtils } from '../utils/error';

class AuditController {
  /**
   * Obtiene logs de auditoría con filtros
   */
  async getLogs(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = '-timestamp',
        userId,
        action,
        module,
        targetType,
        targetId,
        startDate,
        endDate,
        searchText
      } = req.query;

      const filters: any = {
        userId,
        action,
        module,
        targetType,
        targetId,
        startDate,
        endDate,
        searchText
      };

      // Elimina propiedades undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await auditService.getLogs(
        filters,
        Number(page),
        Number(limit),
        sortBy as string
      );

      return res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          pages: result.pages,
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene los detalles de un log específico
   */
  async getLogDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const log = await auditService.getLogById(id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Registro de auditoría no encontrado'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: log
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate, includeSystemActivities } = req.query;
      
      // Crear filtros para las estadísticas
      const statsFilters: any = {};
      if (startDate) statsFilters.startDate = startDate as string;
      if (endDate) statsFilters.endDate = endDate as string;
      if (includeSystemActivities !== undefined) {
        statsFilters.includeSystemActivities = includeSystemActivities === 'true';
      }
      
      const stats = await auditService.getStatistics(
        statsFilters.startDate,
        statsFilters.endDate,
        statsFilters.includeSystemActivities
      );
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene las últimas actividades
   */
  async getRecentActivity(req: Request, res: Response) {
    try {
      const { limit = 10, includeSystemActivities } = req.query;
      
      const activities = await auditService.getRecentActivities(
        Number(limit),
        includeSystemActivities === 'true'
      );
      
      return res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene el historial de actividades de un usuario
   */
  async getUserActivityHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const history = await auditService.getUserActivityHistory(
        userId,
        Number(page),
        Number(limit)
      );
      
      return res.status(200).json({
        success: true,
        data: history.logs,
        pagination: {
          total: history.total,
          pages: history.pages,
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Aplica política de retención (elimina registros antiguos)
   */
  async applyRetentionPolicy(req: Request, res: Response) {
    try {
      const { retentionDays = 365 } = req.body;
      
      if (retentionDays < 30) {
        return res.status(400).json({
          success: false,
          message: 'El periodo de retención debe ser de al menos 30 días'
        });
      }
      
      const result = await auditService.applyRetentionPolicy(Number(retentionDays));
      
      return res.status(200).json({
        success: true,
        message: `Política de retención aplicada. ${result.deletedCount} registros eliminados.`,
        data: result
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Archiva registros antiguos
   */
  async archiveOldLogs(req: Request, res: Response) {
    try {
      const { archiveDays = 90 } = req.body;
      
      if (archiveDays < 30) {
        return res.status(400).json({
          success: false,
          message: 'El periodo de archivo debe ser de al menos 30 días'
        });
      }
      
      const result = await auditService.archiveOldLogs(Number(archiveDays));
      
      return res.status(200).json({
        success: true,
        message: `${result.archivedCount} registros archivados.`,
        data: result
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene estadísticas de almacenamiento
   */
  async getStorageStats(req: Request, res: Response) {
    try {
      const stats = await auditService.getStorageStats();
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Optimiza los índices de auditoría
   */
  async optimizeIndexes(req: Request, res: Response) {
    try {
      await auditService.optimizeIndexes();
      
      return res.status(200).json({
        success: true,
        message: 'Índices de auditoría optimizados correctamente'
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Registra una acción de auditoría desde el frontend
   */
  async logAction(req: Request, res: Response) {
    try {
      const auditData = req.body;
      
      // Obtener IP del cliente
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'];
      
      const log = await auditService.logAction(req, {
        ...auditData,
        ip,
        userAgent
      });
      
      return res.status(201).json({
        success: true,
        data: log
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }

  /**
   * Obtiene estadísticas de actividad del usuario actual
   */
  async getUserActivityStats(req: Request, res: Response) {
    try {
      const userId = (req as any).employee?._id || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener actividades del último día
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const filters = {
        userId: userId.toString(),
        startDate: yesterday.toISOString()
      };

      const result = await auditService.getLogs(filters, 1, 1000);
      
      // Procesar estadísticas
      const activityStats = result.logs.reduce((acc: any, log: any) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      const lastActivity = result.logs.length > 0 ? result.logs[0].timestamp : null;
      
      return res.status(200).json({
        success: true,
        data: {
          userId,
          lastActivity,
          totalActivities: result.logs.length,
          activityByType: activityStats,
          isActive: lastActivity ? (new Date().getTime() - new Date(lastActivity).getTime()) < 20 * 60 * 1000 : false
        }
      });
    } catch (error) {
      const errorResponse = errorUtils(error as Error);
      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message
      });
    }
  }
}

export default new AuditController(); 