import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

// Proteger ruta con JWT
router.use(authenticateToken as RequestHandler);

router.get('/stats', DashboardController.getStats as RequestHandler);

export default router; 