import express, { Router, RequestHandler } from 'express';
import { AppConfigController } from '../controllers/appConfig.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas (no requieren autenticación)
router.get('/public/:appName/:appKey', AppConfigController.getAppConfig as RequestHandler);

// Rutas protegidas (requieren autenticación)
router.get('/:appName', authenticateToken, AppConfigController.getAllAppConfigs as RequestHandler);
router.post('/:appName/:appKey', authenticateToken, AppConfigController.upsertAppConfig as RequestHandler);
router.delete('/:id', authenticateToken, AppConfigController.deleteAppConfig as RequestHandler);

export default router; 