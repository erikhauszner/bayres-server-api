import { Request, Response, NextFunction } from 'express';
import { ExpenseCategory, IExpenseCategory } from '../../models/Finance';
import { logAuditAction, sanitizeDataForAudit } from '../../utils/auditUtils';

export class ExpenseCategoryController {
  /**
   * Obtener todas las categorías de gastos
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await ExpenseCategory.find({ isActive: true })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');

      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener una categoría de gasto por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await ExpenseCategory.findById(id)
        .populate('createdBy', 'firstName lastName');
      
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear una nueva categoría de gasto
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { name, description } = req.body;
      
      // Verificar si ya existe una categoría con el mismo nombre
      const existingCategory = await ExpenseCategory.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: 'Ya existe una categoría con este nombre' });
      }
      
      // Crear la categoría
      const category = new ExpenseCategory({
        name,
        description,
        createdBy: employeeId
      });
      
      await category.save();
      
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar una categoría de gasto
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      // Si se está actualizando el nombre, verificar que no exista otro con ese nombre
      if (name) {
        const existingCategory = await ExpenseCategory.findOne({ 
          name, 
          _id: { $ne: id } 
        });
        
        if (existingCategory) {
          return res.status(400).json({ message: 'Ya existe otra categoría con este nombre' });
        }
      }
      
      const category = await ExpenseCategory.findByIdAndUpdate(
        id,
        { $set: { name, description } },
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'firstName lastName');
      
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar una categoría de gasto (desactivar)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await ExpenseCategory.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );
      
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      res.json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
} 