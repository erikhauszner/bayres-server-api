import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  activateEmployee,
  deactivateEmployee,
  resetEmployeePassword
} from '../controllers/employee.controller';
import { EmployeePermissionController } from '../controllers/employee-permission.controller';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken as RequestHandler);

// Ruta para que un usuario actualice su propio perfil (sin verificación de permisos)
router.put('/profile/me', updateEmployee as RequestHandler);

// Rutas de empleados con permisos específicos para cada operación
router.get('/', checkPermissions(['employees:read']) as RequestHandler, getEmployees as RequestHandler);
router.get('/:id', checkPermissions(['employees:read']) as RequestHandler, getEmployeeById as RequestHandler);
router.post('/', checkPermissions(['employees:create']) as RequestHandler, createEmployee as RequestHandler);
router.put('/:id', checkPermissions(['employees:update']) as RequestHandler, updateEmployee as RequestHandler);
router.delete('/:id', checkPermissions(['employees:delete']) as RequestHandler, deleteEmployee as RequestHandler);

// Rutas para activar/desactivar empleados
router.put('/:id/activate', checkPermissions(['employees:update']) as RequestHandler, activateEmployee as RequestHandler);
router.put('/:id/deactivate', checkPermissions(['employees:update']) as RequestHandler, deactivateEmployee as RequestHandler);

// Ruta para resetear la contraseña de un empleado
router.post('/:id/reset-password', checkPermissions(['employees:update']) as RequestHandler, resetEmployeePassword as RequestHandler);

// Rutas para gestión de permisos de empleados (solo para administradores)
router.get('/:id/permissions', 
  checkPermissions(['employees:read', 'roles:read']) as RequestHandler, 
  EmployeePermissionController.getEmployeePermissions as RequestHandler
);

router.put('/:id/permissions', 
  checkPermissions(['employees:update', 'roles:update']) as RequestHandler, 
  EmployeePermissionController.updateEmployeePermissions as RequestHandler
);

export default router; 