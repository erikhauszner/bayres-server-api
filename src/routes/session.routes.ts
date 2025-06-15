import { Router } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import Session from '../models/EmployeeSession';
import { SessionCleanupService } from '../services/session-cleanup.service';

const router = Router();

/**
 * Obtener estadísticas de sesiones
 */
router.get('/stats', authenticateToken, checkPermissions(['sessions:read']), async (req, res) => {
  try {
    const now = new Date();
    
    // Contar sesiones activas
    const activeSessions = await Session.countDocuments({
      isActive: true,
      expiresAt: { $gt: now }
    });
    
    // Contar sesiones expiradas
    const expiredSessions = await Session.countDocuments({
      isActive: true,
      expiresAt: { $lte: now }
    });
    
    // Contar sesiones inactivas
    const inactiveSessions = await Session.countDocuments({
      isActive: false
    });
    
    // Total de sesiones
    const totalSessions = await Session.countDocuments({});
    
    res.json({
      activeSessions,
      expiredSessions,
      inactiveSessions,
      totalSessions,
      timestamp: now
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de sesiones:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de sesiones' });
  }
});

/**
 * Ejecutar limpieza manual de sesiones
 */
router.post('/cleanup', authenticateToken, checkPermissions(['sessions:cleanup']), async (req, res) => {
  try {
    const result = await SessionCleanupService.cleanupExpiredSessions();
    
    res.json({
      message: 'Limpieza de sesiones completada',
      cleanedSessionsCount: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error al ejecutar limpieza de sesiones:', error);
    res.status(500).json({ message: 'Error al ejecutar limpieza de sesiones' });
  }
});

/**
 * Forzar desconexión automática de empleados inactivos
 */
router.post('/force-disconnect', authenticateToken, checkPermissions(['employees:update']), async (req, res) => {
  try {
    const { AutoDisconnectService } = await import('../services/AutoDisconnectService');
    await AutoDisconnectService.checkAndDisconnectInactiveEmployees();
    
    res.json({
      message: 'Verificación de desconexión automática ejecutada',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error al ejecutar desconexión automática:', error);
    res.status(500).json({ message: 'Error al ejecutar desconexión automática' });
  }
});

export default router; 