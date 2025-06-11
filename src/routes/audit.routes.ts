import { Router } from 'express';
import auditController from '../controllers/audit.controller';
import { authenticateToken } from '../middleware/auth.middleware';
// import { authorize } from '../middlewares/authz.middleware';

const router = Router();

// Obtener logs de auditoría con filtros
router.get(
  '/logs',
  authenticateToken,
  // authorize(['ver_auditoria']),
  auditController.getLogs as any
);

// Obtener detalles de un log específico
router.get(
  '/logs/:id',
  authenticateToken,
  // authorize(['ver_auditoria']),
  auditController.getLogDetails as any
);

// Obtener estadísticas de auditoría
router.get(
  '/statistics',
  authenticateToken,
  // authorize(['ver_auditoria']),
  auditController.getStatistics as any
);

// Obtener actividades recientes
router.get(
  '/recent-activity',
  authenticateToken,
  // authorize(['ver_auditoria']),
  auditController.getRecentActivity as any
);

// Obtener historial de actividades de un usuario
router.get(
  '/user-activity/:userId',
  authenticateToken,
  // authorize(['ver_auditoria']),
  auditController.getUserActivityHistory as any
);

// Obtener estadísticas de almacenamiento
router.get(
  '/storage-stats',
  authenticateToken,
  // authorize(['admin_auditoria']),
  auditController.getStorageStats as any
);

// Aplicar política de retención
router.post(
  '/retention/apply',
  authenticateToken,
  // authorize(['admin_auditoria']),
  auditController.applyRetentionPolicy as any
);

// Archivar registros antiguos
router.post(
  '/archive',
  authenticateToken,
  // authorize(['admin_auditoria']),
  auditController.archiveOldLogs as any
);

// Optimizar índices
router.post(
  '/optimize',
  authenticateToken,
  // authorize(['admin_auditoria']),
  auditController.optimizeIndexes as any
);

export default router; 