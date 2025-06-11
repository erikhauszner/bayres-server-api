import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas de departamentos
router.get('/', departmentController.getAllDepartments as any);
router.get('/:id', departmentController.getDepartmentById as any);
router.post('/', 
  auditCreation('departamento', {
    module: 'departamentos',
    getDescription: (req) => `Creación de departamento: ${req.body.name}`
  }) as any,
  departmentController.createDepartment as any
);
router.put('/:id', 
  auditUpdate('departamento', {
    module: 'departamentos',
    getPreviousData: async (req) => {
      const { default: Department } = require('../models/Department');
      return await Department.findById(req.params.id);
    }
  }) as any,
  departmentController.updateDepartment as any
);
router.delete('/:id', 
  auditDeletion('departamento', {
    module: 'departamentos',
    getPreviousData: async (req) => {
      const { default: Department } = require('../models/Department');
      return await Department.findById(req.params.id);
    }
  }) as any,
  departmentController.deleteDepartment as any
);

export default router; 