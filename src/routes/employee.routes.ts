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
import { EmployeeStatusController } from '../controllers/employee-status.controller';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken as RequestHandler);

// Ruta para que un usuario actualice su propio perfil (sin verificación de permisos)
router.put('/profile/me', 
  auditUpdate('empleado', {
    module: 'empleados',
    action: 'actualización_perfil',
    getDescription: (req) => `Actualización de perfil propio`,
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      return await Employee.findById(req.employee?._id);
    }
  }) as any,
  updateEmployee as RequestHandler
);

// Rutas de empleados con permisos específicos para cada operación
router.get('/', checkPermissions(['employees:read']) as RequestHandler, getEmployees as RequestHandler);
router.get('/:id', checkPermissions(['employees:read']) as RequestHandler, getEmployeeById as RequestHandler);
router.post('/', 
  checkPermissions(['employees:create']) as RequestHandler, 
  auditCreation('empleado', {
    module: 'empleados',
    getDescription: (req) => `Creación de empleado: ${req.body.firstName} ${req.body.lastName}`
  }) as any,
  createEmployee as RequestHandler
);
router.put('/:id', 
  checkPermissions(['employees:update']) as RequestHandler, 
  auditUpdate('empleado', {
    module: 'empleados',
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      return await Employee.findById(req.params.id);
    }
  }) as any,
  updateEmployee as RequestHandler
);
router.delete('/:id', 
  checkPermissions(['employees:delete']) as RequestHandler, 
  auditDeletion('empleado', {
    module: 'empleados',
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      return await Employee.findById(req.params.id);
    }
  }) as any,
  deleteEmployee as RequestHandler
);

// Rutas para activar/desactivar empleados
router.put('/:id/activate', 
  checkPermissions(['employees:update']) as RequestHandler, 
  auditUpdate('empleado', {
    module: 'empleados',
    action: 'activación',
    getDescription: (req) => `Activación de empleado ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      const employee = await Employee.findById(req.params.id);
      return { isActive: employee?.isActive };
    },
    getNewData: () => ({ isActive: true })
  }) as any,
  activateEmployee as RequestHandler
);
router.put('/:id/deactivate', 
  checkPermissions(['employees:update']) as RequestHandler, 
  auditUpdate('empleado', {
    module: 'empleados',
    action: 'desactivación',
    getDescription: (req) => `Desactivación de empleado ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      const employee = await Employee.findById(req.params.id);
      return { isActive: employee?.isActive };
    },
    getNewData: () => ({ isActive: false })
  }) as any,
  deactivateEmployee as RequestHandler
);

// Ruta para resetear la contraseña de un empleado
router.post('/:id/reset-password', 
  checkPermissions(['employees:update']) as RequestHandler, 
  auditUpdate('empleado', {
    module: 'empleados',
    action: 'reset_password',
    getDescription: (req) => `Reseteo de contraseña para empleado ID: ${req.params.id}`
  }) as any,
  resetEmployeePassword as RequestHandler
);

// Rutas para gestión de permisos de empleados (solo para administradores)
router.get('/:id/permissions', 
  checkPermissions(['employees:read', 'roles:read']) as RequestHandler, 
  EmployeePermissionController.getEmployeePermissions as RequestHandler
);

router.put('/:id/permissions', 
  checkPermissions(['employees:update', 'roles:update']) as RequestHandler, 
  auditUpdate('empleado', {
    module: 'empleados',
    action: 'actualización_permisos',
    getDescription: (req) => `Actualización de permisos para empleado ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Employee } = require('../models/Employee');
      const employee = await Employee.findById(req.params.id).populate('permissions');
      return { permissions: employee?.permissions };
    }
  }) as any,
  EmployeePermissionController.updateEmployeePermissions as RequestHandler
);

// Rutas de estado de empleados ahora están definidas en employee-status.routes.ts

export default router; 