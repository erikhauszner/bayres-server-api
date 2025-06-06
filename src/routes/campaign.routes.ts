import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { createCampaign, getCampaigns, getCampaignById, updateCampaign, deleteCampaign, searchCampaigns } from '../controllers/campaign.controller';

const router = Router();

// Middleware de autenticación y autorización
router.use(authenticateToken as RequestHandler);
router.use(checkPermissions(['read:campaigns', 'write:campaigns']) as RequestHandler);

// Rutas de campañas
router.get('/', getCampaigns as RequestHandler);
router.get('/search', searchCampaigns as RequestHandler);
router.get('/:id', getCampaignById as RequestHandler);
router.post('/', checkPermissions(['write:campaigns']) as RequestHandler, createCampaign as RequestHandler);
router.put('/:id', checkPermissions(['write:campaigns']) as RequestHandler, updateCampaign as RequestHandler);
router.delete('/:id', checkPermissions(['write:campaigns']) as RequestHandler, deleteCampaign as RequestHandler);

export default router; 