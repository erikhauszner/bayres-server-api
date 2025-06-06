import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { createReport, getReports, getReportById, updateReport, deleteReport, getReportsByCampaign } from '../controllers/report.controller';

const router = Router();

// Middleware de autenticación y autorización
router.use(authenticateToken as RequestHandler);
router.use(checkPermissions(['read:reports', 'write:reports']) as RequestHandler);

// Rutas de informes
router.get('/', getReports as RequestHandler);
router.get('/campaign/:campaignId', getReportsByCampaign as RequestHandler);
router.get('/:id', getReportById as RequestHandler);
router.post('/', checkPermissions(['write:reports']) as RequestHandler, createReport as RequestHandler);
router.put('/:id', checkPermissions(['write:reports']) as RequestHandler, updateReport as RequestHandler);
router.delete('/:id', checkPermissions(['write:reports']) as RequestHandler, deleteReport as RequestHandler);

export default router; 