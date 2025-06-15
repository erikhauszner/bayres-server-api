import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Task, ITask } from '../models/Task';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

// Interfaz extendida para incluir historial y fechas si no están en el modelo original
interface TaskWithHistory extends ITask {
  history?: Array<{
    action: string;
    timestamp: Date;
    user: string;
    changes: any;
  }>;
  startDate?: Date;
  endDate?: Date;
}

export const getTasks: RequestHandler = async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'firstName lastName email')
      .populate('campaign', 'name description')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById: RequestHandler = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('campaign', 'name description');
    
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('assignedTo', 'firstName lastName email')
    .populate('campaign', 'name description');
    
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getTasksByCampaign: RequestHandler = async (req, res, next) => {
  try {
    const tasks = await Task.find({ campaign: req.params.campaignId })
      .populate('assignedTo', 'firstName lastName email')
      .populate('campaign', 'name description')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus: RequestHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    .populate('assignedTo', 'firstName lastName email')
    .populate('campaign', 'name description');
    
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza las fechas de inicio y fin de una tarea específica
 * Este endpoint está optimizado para las actualizaciones desde el diagrama Gantt
 */
export const updateTaskDates: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.body;

    // Validación de fechas
    if (new Date(startDate) >= new Date(endDate)) {
      res.status(400).json({ 
        message: 'La fecha de inicio debe ser anterior a la fecha de fin' 
      });
      return;
    }

    // Buscar la tarea para verificar si existe y obtener datos para validación
    const existingTask = await Task.findById(req.params.id) as TaskWithHistory | null;
    if (!existingTask) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }

    // Campos a actualizar (ajustados según el modelo real)
    const updateFields: any = {
      updatedAt: new Date()
    };

    // Usar los nombres de campos correctos según el modelo
    if ('startDate' in existingTask) {
      updateFields.startDate = new Date(startDate);
    } else if ('fechaInicio' in existingTask) {
      updateFields.fechaInicio = new Date(startDate);
    } else if ('dueDate' in existingTask) {
      updateFields.dueDate = new Date(startDate);
    }

    if ('endDate' in existingTask) {
      updateFields.endDate = new Date(endDate);
    } else if ('fechaFin' in existingTask) {
      updateFields.fechaFin = new Date(endDate);
    } else if ('completedAt' in existingTask) {
      updateFields.completedAt = new Date(endDate);
    }

    // Actualizar solo las fechas
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    )
    .populate('assignedTo', 'firstName lastName email')
    .populate('campaign', 'name description');
    
    if (!task) {
      res.status(500).json({ message: 'Error al actualizar la tarea' });
      return;
    }

    // Convertir a la interfaz extendida para acceder a history si existe
    const taskWithHistory = task as unknown as TaskWithHistory;
    
    // Registrar la actualización en el historial (si existe el campo)
    if (taskWithHistory.history) {
      taskWithHistory.history.push({
        action: 'update_dates',
        timestamp: new Date(),
        user: (req as any).user?._id || 'system',
        changes: {
          startDate: {
            old: existingTask.startDate || existingTask.dueDate,
            new: new Date(startDate)
          },
          endDate: {
            old: existingTask.endDate || existingTask.completedAt,
            new: new Date(endDate)
          }
        }
      });
      await task.save();
    }

    res.json({
      task,
      message: 'Fechas actualizadas correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar fechas de tarea:', error);
    next(error);
  }
}; 