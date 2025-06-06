import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { createMetric, getMetrics, getMetricById, updateMetric, deleteMetric, getMetricsByCampaign, getMetricsByDateRange } from '../controllers/metric.controller';

const router = Router();

// Middleware de autenticación y autorización
router.use(authenticateToken as RequestHandler);
router.use(checkPermissions(['read:metrics', 'write:metrics']) as RequestHandler);

// Rutas de métricas
router.get('/', getMetrics as RequestHandler);
router.get('/campaign/:campaignId', getMetricsByCampaign as RequestHandler);
router.get('/date-range', getMetricsByDateRange as RequestHandler);
router.get('/:id', getMetricById as RequestHandler);
router.post('/', checkPermissions(['write:metrics']) as RequestHandler, createMetric as RequestHandler);
router.put('/:id', checkPermissions(['write:metrics']) as RequestHandler, updateMetric as RequestHandler);
router.delete('/:id', checkPermissions(['write:metrics']) as RequestHandler, deleteMetric as RequestHandler);

export default router; 