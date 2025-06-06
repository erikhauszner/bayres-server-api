import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/register', AuthController.register as RequestHandler);
router.post('/login', AuthController.login as RequestHandler);
router.post('/reset-password', AuthController.resetPassword as RequestHandler);

// Rutas protegidas (requieren autenticación)
router.get('/me', authenticateToken, AuthController.getCurrentEmployee as RequestHandler);
router.post('/logout', authenticateToken, AuthController.logout as RequestHandler);
router.post('/change-password', authenticateToken, AuthController.changePassword as RequestHandler);

// Ruta para cambiar la contraseña cuando es forzado
router.post('/change-password/forced', authenticateToken, AuthController.changePasswordForced as RequestHandler);

export default router;