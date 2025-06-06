import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas de departamentos
router.get('/', departmentController.getAllDepartments as any);
router.get('/:id', departmentController.getDepartmentById as any);
router.post('/', departmentController.createDepartment as any);
router.put('/:id', departmentController.updateDepartment as any);
router.delete('/:id', departmentController.deleteDepartment as any);

export default router; 