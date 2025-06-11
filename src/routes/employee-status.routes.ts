import { Router, RequestHandler } from 'express';
import { EmployeeStatusController } from '../controllers/employee-status.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';

const router = Router();

// Ruta para obtener el estado de todos los empleados
router.get('/status/all', authenticateToken as RequestHandler, EmployeeStatusController.getEmployeesStatus);

// Ruta para obtener el estado del empleado actual
router.get('/status/current', authenticateToken as RequestHandler, EmployeeStatusController.getCurrentEmployeeStatus);

// Ruta para actualizar el estado del empleado actual
router.put('/status/current', authenticateToken as RequestHandler, EmployeeStatusController.updateCurrentEmployeeStatus);

// Ruta para obtener el estado de un empleado específico
router.get('/:id/status', authenticateToken as RequestHandler, EmployeeStatusController.getEmployeeStatus);

// Ruta para obtener estadísticas diarias de un empleado específico
router.get('/daily-stats/:id', 
  authenticateToken as RequestHandler, 
  checkPermissions(['monitoring:read']) as RequestHandler,
  EmployeeStatusController.getEmployeeDailyStats as RequestHandler
);

// Ruta para actualizar el estado de un empleado específico (requiere permiso de administrador)
router.put('/:id/status', 
  authenticateToken as RequestHandler, 
  checkPermissions(['employees:update']) as RequestHandler, 
  EmployeeStatusController.updateEmployeeStatus
);

export default router; 