import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { auditCreation, auditUpdate } from '../middleware/audit.middleware';

const router = Router();

// Rutas públicas
router.post('/register', AuthController.register as RequestHandler);
router.post('/login', 
  auditCreation('sesión', {
    module: 'autenticación',
    action: 'login',
    getDescription: (req) => `Inicio de sesión: ${req.body.email}`
  }) as any,
  AuthController.login as RequestHandler
);
router.post('/reset-password', AuthController.resetPassword as RequestHandler);

// Rutas protegidas (requieren autenticación)
router.get('/me', authenticateToken, AuthController.getCurrentEmployee as RequestHandler);
router.post('/logout', 
  authenticateToken, 
  auditCreation('sesión', {
    module: 'autenticación',
    action: 'logout',
    getDescription: (req) => `Cierre de sesión del usuario ID: ${req.employee?._id}`
  }) as any,
  AuthController.logout as RequestHandler
);
router.post('/change-password', 
  authenticateToken, 
  auditUpdate('empleado', {
    module: 'autenticación',
    action: 'cambio_password',
    getDescription: (req) => `Cambio de contraseña por usuario ID: ${req.employee?._id}`
  }) as any,
  AuthController.changePassword as RequestHandler
);

// Ruta para cambiar la contraseña cuando es forzado
router.post('/change-password/forced', 
  authenticateToken, 
  auditUpdate('empleado', {
    module: 'autenticación',
    action: 'cambio_password_forzado',
    getDescription: (req) => `Cambio de contraseña forzado por usuario ID: ${req.employee?._id}`
  }) as any,
  AuthController.changePasswordForced as RequestHandler
);

export default router;