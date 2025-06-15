import { Request, Response, NextFunction } from 'express';
import { TransactionCategory, ITransactionCategory } from '../../models/Finance';
import { logAuditAction, sanitizeDataForAudit } from '../../utils/auditUtils';

export class TransactionCategoryController {
  /**
   * Obtener todas las categorías de transacciones
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await TransactionCategory.find({ isActive: true })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');

      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener una categoría de transacción por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await TransactionCategory.findById(id)
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
   * Crear una nueva categoría de transacción
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { name, type, description, color } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ message: 'Nombre y tipo son campos requeridos' });
      }
      
      // Verificar si ya existe una categoría con el mismo nombre y tipo
      const existingCategory = await TransactionCategory.findOne({ name, type });
      if (existingCategory) {
        return res.status(400).json({ message: 'Ya existe una categoría con este nombre y tipo' });
      }
      
      // Crear la categoría
      const category = new TransactionCategory({
        name,
        type,
        description,
        color,
        createdBy: employeeId
      });
      
      await category.save();
      
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar una categoría de transacción
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, type, description, color } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (description !== undefined) updateData.description = description;
      if (color) updateData.color = color;
      
      // Si se está actualizando el nombre y tipo, verificar que no exista otro con esa combinación
      if (name && type) {
        const existingCategory = await TransactionCategory.findOne({ 
          name, 
          type,
          _id: { $ne: id } 
        });
        
        if (existingCategory) {
          return res.status(400).json({ message: 'Ya existe otra categoría con este nombre y tipo' });
        }
      }
      
      const category = await TransactionCategory.findByIdAndUpdate(
        id,
        { $set: updateData },
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
   * Eliminar una categoría de transacción (desactivar)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await TransactionCategory.findByIdAndUpdate(
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

  /**
   * Obtener categorías por tipo de transacción
   */
  static async getByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      
      if (!['income', 'expense', 'transfer'].includes(type)) {
        return res.status(400).json({ message: 'Tipo de transacción no válido' });
      }
      
      const categories = await TransactionCategory.find({ 
        type, 
        isActive: true 
      })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');
      
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }
} 