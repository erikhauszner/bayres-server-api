import { Request, Response, NextFunction } from 'express';
import { Expense, IExpense, ExpenseCategory } from '../../models/Finance';
import { Project } from '../../models/Project';
import ProjectTask from '../../models/ProjectTask';

// Extender la interfaz Request para incluir el campo file
interface RequestWithFile extends Request {
  file?: any;
}

export class ExpenseController {
  /**
   * Obtener todos los gastos
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const expenses = await Expense.find()
        .sort({ date: -1 })
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

      res.json(expenses);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener gastos por proyecto
   */
  static async getByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      
      const expenses = await Expense.find({ projectId })
        .sort({ date: -1 })
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

      res.json(expenses);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener un gasto por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const expense = await Expense.findById(id)
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');
      
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado' });
      }
      
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear un nuevo gasto
   */
  static async create(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      // Manejar datos de formulario multipart
      let expenseData;
      let receiptFile;
      
      if (req.file) {
        // Si hay un archivo adjunto
        receiptFile = req.file;
        expenseData = JSON.parse(req.body.data);
      } else {
        // Si es un JSON normal
        expenseData = req.body;
      }
      
      const { projectId, taskId, date, amount, categoryId, description, vendor } = expenseData;
      
      // Verificar que el proyecto existe
      if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
          return res.status(404).json({ message: 'Proyecto no encontrado' });
        }
      }
      
      // Verificar que la tarea existe
      if (taskId) {
        const task = await ProjectTask.findById(taskId);
        if (!task) {
          return res.status(404).json({ message: 'Tarea no encontrada' });
        }
      }
      
      // Verificar que la categoría existe
      const category = await ExpenseCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      // Procesar el recibo si existe
      let receiptUrl;
      if (receiptFile) {
        // Aquí iría el código para subir el archivo a un servicio de almacenamiento
        // y obtener la URL. Por ahora, simulamos:
        receiptUrl = `https://storage.example.com/receipts/${Date.now()}-${receiptFile.originalname}`;
      }
      
      // Crear el gasto
      const expense = new Expense({
        projectId,
        taskId,
        date,
        amount,
        categoryId,
        description,
        vendor,
        receipt: receiptUrl,
        createdBy: employeeId,
        status: 'pending'
      });
      
      await expense.save();
      
      // Poblar referencias para devolver un objeto completo
      await expense.populate('projectId', 'name');
      await expense.populate('taskId', 'title');
      await expense.populate('categoryId', 'name');
      await expense.populate('createdBy', 'firstName lastName');
      
      res.status(201).json(expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar un gasto
   */
  static async update(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Manejar datos de formulario multipart
      let updateData;
      let receiptFile;
      
      if (req.file) {
        // Si hay un archivo adjunto
        receiptFile = req.file;
        updateData = JSON.parse(req.body.data);
      } else {
        // Si es un JSON normal
        updateData = { ...req.body };
      }
      
      // Procesar el recibo si existe
      if (receiptFile) {
        // Aquí iría el código para subir el archivo a un servicio de almacenamiento
        // y obtener la URL. Por ahora, simulamos:
        updateData.receipt = `https://storage.example.com/receipts/${Date.now()}-${receiptFile.originalname}`;
      }
      
      const expense = await Expense.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');
      
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado' });
      }
      
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aprobar un gasto
   */
  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const expense = await Expense.findByIdAndUpdate(
        id,
        { 
          $set: { 
            status: 'approved',
            approvedBy: employeeId,
            approvedAt: new Date()
          } 
        },
        { new: true, runValidators: true }
      )
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');
      
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado' });
      }
      
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechazar un gasto
   */
  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const expense = await Expense.findByIdAndUpdate(
        id,
        { $set: { status: 'rejected' } },
        { new: true, runValidators: true }
      )
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('categoryId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');
      
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado' });
      }
      
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar un gasto
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const expense = await Expense.findByIdAndDelete(id);
      
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado' });
      }
      
      res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
} 