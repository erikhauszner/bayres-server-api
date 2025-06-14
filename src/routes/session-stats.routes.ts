import { Router, RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import { SessionCleanupService } from '../services/session-cleanup.service';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

import Logger from '../utils/logger';

const router = Router();

/**
 * Obtener estadísticas de sesiones (solo para administradores)
 */
router.get('/stats', 
  authenticateToken as RequestHandler,
  checkPermissions(['system:admin']) as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await SessionCleanupService.getSessionStats();
      
      Logger.info('Estadísticas de sesiones solicitadas', {
        requestedBy: req.employee?._id,
        stats
      });
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      Logger.error('Error al obtener estadísticas de sesiones', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de sesiones'
      });
    }
  }
);

/**
 * Ejecutar limpieza manual de sesiones expiradas (solo para administradores)
 */
router.post('/cleanup', 
  authenticateToken as RequestHandler,
  checkPermissions(['system:admin']) as RequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deletedCount = await SessionCleanupService.cleanupExpiredSessions();
      const newStats = await SessionCleanupService.getSessionStats();
      
      Logger.info('Limpieza manual de sesiones ejecutada', {
        executedBy: req.employee?._id,
        deletedCount,
        newStats
      });
      
      res.json({
        success: true,
        message: `Se eliminaron ${deletedCount} sesiones expiradas`,
        data: {
          deletedCount,
          currentStats: newStats
        },
        timestamp: new Date()
      });
    } catch (error) {
      Logger.error('Error durante limpieza manual de sesiones', error);
      res.status(500).json({
        success: false,
        message: 'Error durante la limpieza de sesiones'
      });
    }
  }
);



export default router; 