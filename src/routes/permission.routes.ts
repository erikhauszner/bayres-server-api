import { Router } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { PermissionController } from '../controllers/permission.controller';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken);

// Rutas para permisos (solo para administradores)
router.get('/', 
  checkPermissions(['roles:read']), 
  PermissionController.getPermissions
);

export default router; 