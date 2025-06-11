import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { RoleController } from '../controllers/role.controller';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = Router();

// Middleware de autenticación
router.use(authenticateToken as RequestHandler);

// Rutas para roles (solo para administradores)
router.get('/', 
  checkPermissions(['roles:read']) as RequestHandler, 
  RoleController.getRoles as RequestHandler
);

router.get('/:id', 
  checkPermissions(['roles:read']) as RequestHandler, 
  RoleController.getRoleById as RequestHandler
);

router.post('/', 
  checkPermissions(['roles:create']) as RequestHandler, 
  auditCreation('rol', {
    module: 'roles',
    getDescription: (req) => `Creación de rol: ${req.body.name}`
  }) as any,
  RoleController.createRole as RequestHandler
);

router.put('/:id', 
  checkPermissions(['roles:update']) as RequestHandler, 
  auditUpdate('rol', {
    module: 'roles',
    getPreviousData: async (req) => {
      const { default: Role } = require('../models/Role');
      return await Role.findById(req.params.id);
    }
  }) as any,
  RoleController.updateRole as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['roles:delete']) as RequestHandler, 
  auditDeletion('rol', {
    module: 'roles',
    getPreviousData: async (req) => {
      const { default: Role } = require('../models/Role');
      return await Role.findById(req.params.id);
    }
  }) as any,
  RoleController.deleteRole as RequestHandler
);

// Rutas para gestionar permisos de un rol
router.get('/:id/permissions', 
  checkPermissions(['roles:read']) as RequestHandler, 
  RoleController.getRolePermissions as RequestHandler
);

router.post('/:id/permissions', 
  checkPermissions(['roles:update']) as RequestHandler, 
  auditUpdate('rol', {
    module: 'roles',
    action: 'agregar_permiso',
    getDescription: (req) => `Agregar permiso al rol ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Role } = require('../models/Role');
      const role = await Role.findById(req.params.id).populate('permissions');
      return { permissions: role?.permissions };
    }
  }) as any,
  RoleController.addPermissionToRole as RequestHandler
);

router.delete('/:id/permissions/:permissionId', 
  checkPermissions(['roles:update']) as RequestHandler, 
  auditUpdate('rol', {
    module: 'roles',
    action: 'eliminar_permiso',
    getDescription: (req) => `Eliminar permiso ${req.params.permissionId} del rol ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Role } = require('../models/Role');
      const role = await Role.findById(req.params.id).populate('permissions');
      return { permissions: role?.permissions };
    }
  }) as any,
  RoleController.removePermissionFromRole as RequestHandler
);

router.put('/:id/toggle-status', 
  checkPermissions(['roles:update']) as RequestHandler, 
  auditUpdate('rol', {
    module: 'roles',
    action: 'cambio_estado',
    getDescription: (req) => `Cambio de estado del rol ID: ${req.params.id}`,
    getPreviousData: async (req) => {
      const { default: Role } = require('../models/Role');
      const role = await Role.findById(req.params.id);
      return { isActive: role?.isActive };
    }
  }) as any,
  RoleController.toggleRoleStatus as RequestHandler
);

export default router; 