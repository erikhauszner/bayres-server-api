import { Router } from 'express';
import { leadCategoryController } from '../controllers/lead-category.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para orígenes de leads
router.get('/origins', leadCategoryController.getAllOrigins as any);
router.get('/origins/:id', leadCategoryController.getOriginById as any);
router.post('/origins', leadCategoryController.createOrigin as any);
router.put('/origins/:id', leadCategoryController.updateOrigin as any);
router.delete('/origins/:id', leadCategoryController.deleteOrigin as any);

// Rutas para etapas de leads
router.get('/stages', leadCategoryController.getAllStages as any);
router.get('/stages/:id', leadCategoryController.getStageById as any);
router.post('/stages', leadCategoryController.createStage as any);
router.put('/stages/:id', leadCategoryController.updateStage as any);
router.delete('/stages/:id', leadCategoryController.deleteStage as any);

export default router; 