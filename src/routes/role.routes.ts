import { Router, RequestHandler } from 'express';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { RoleController } from '../controllers/role.controller';

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
  RoleController.createRole as RequestHandler
);

router.put('/:id', 
  checkPermissions(['roles:update']) as RequestHandler, 
  RoleController.updateRole as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['roles:delete']) as RequestHandler, 
  RoleController.deleteRole as RequestHandler
);

// Rutas para gestionar permisos de un rol
router.get('/:id/permissions', 
  checkPermissions(['roles:read']) as RequestHandler, 
  RoleController.getRolePermissions as RequestHandler
);

router.post('/:id/permissions', 
  checkPermissions(['roles:update']) as RequestHandler, 
  RoleController.addPermissionToRole as RequestHandler
);

router.delete('/:id/permissions/:permissionId', 
  checkPermissions(['roles:update']) as RequestHandler, 
  RoleController.removePermissionFromRole as RequestHandler
);

router.put('/:id/toggle-status', 
  checkPermissions(['roles:update']) as RequestHandler, 
  RoleController.toggleRoleStatus as RequestHandler
);

export default router; 