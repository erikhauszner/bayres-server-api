import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProjectTask from '../models/ProjectTask';
import { Project } from '../models/Project';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

// Obtener todas las tareas de un proyecto
export const getProjectTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Buscando tareas para el proyecto con ID: ${req.params.projectId}`);
    
    // Verificar que el ID del proyecto tenga un formato válido
    if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
      console.error(`ID de proyecto inválido: ${req.params.projectId}`);
      res.status(400).json({ message: 'ID de proyecto inválido' });
      return;
    }
    
    // Verificar que el proyecto existe
    const projectExists = await Project.findById(req.params.projectId);
    if (!projectExists) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    // Buscar todas las tareas asociadas al proyecto
    const tasks = await ProjectTask.find({ project: req.params.projectId })
      .populate('assignedTo', 'firstName lastName email position')
      .sort({ startDate: 1 });
    
    console.log(`Se encontraron ${tasks.length} tareas para el proyecto ${req.params.projectId}`);
    
    res.json(tasks);
  } catch (error: any) {
    console.error(`Error al obtener tareas del proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener las tareas del proyecto',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Obtener una tarea específica
export const getProjectTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    
    // Verificar que los IDs tengan un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(taskId)) {
      res.status(400).json({ message: 'ID de proyecto o tarea inválido' });
      return;
    }
    
    // Buscar la tarea específica
    const task = await ProjectTask.findOne({ 
      _id: taskId,
      project: projectId
    }).populate('assignedTo', 'firstName lastName email position');
    
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    
    res.json(task);
  } catch (error: any) {
    console.error(`Error al obtener la tarea ${req.params.taskId} del proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener la tarea',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Crear una nueva tarea en un proyecto
export const createProjectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    console.log(`Creando tarea para el proyecto con ID: ${projectId}`);
    console.log('Datos de la tarea:', req.body);
    
    // Verificar que el ID del proyecto tenga un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'ID de proyecto inválido' });
      return;
    }
    
    // Verificar que el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    // Verificar si hay un empleado asignado y si existe
    if (req.body.assignedTo && mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
      const employeeExists = await mongoose.model('Employee').findById(req.body.assignedTo);
      if (!employeeExists) {
        res.status(400).json({ message: 'El empleado asignado no existe' });
        return;
      }
    }
    
    // Crear la nueva tarea
    const newTask = new ProjectTask({
      ...req.body,
      project: projectId
    });
    
    await newTask.save();
    
    // Actualizar el proyecto para incluir la referencia a la nueva tarea
    await Project.findByIdAndUpdate(
      projectId,
      { $push: { tasks: newTask._id } }
    );
    
    // Devolver la tarea creada con información del asignado
    const createdTask = await ProjectTask.findById(newTask._id)
      .populate('assignedTo', 'firstName lastName email position');
    
    res.status(201).json(createdTask);
  } catch (error: any) {
    console.error(`Error al crear tarea para el proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al crear la tarea',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Actualizar una tarea existente
export const updateProjectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    
    // Verificar que los IDs tengan un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(taskId)) {
      res.status(400).json({ message: 'ID de proyecto o tarea inválido' });
      return;
    }
    
    // Verificar que la tarea existe y pertenece al proyecto
    const existingTask = await ProjectTask.findOne({ 
      _id: taskId,
      project: projectId
    });
    
    if (!existingTask) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    
    // Verificar si hay un empleado asignado y si existe
    if (req.body.assignedTo && mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
      const employeeExists = await mongoose.model('Employee').findById(req.body.assignedTo);
      if (!employeeExists) {
        res.status(400).json({ message: 'El empleado asignado no existe' });
        return;
      }
    }
    
    // Actualizar la tarea
    const updatedTask = await ProjectTask.findByIdAndUpdate(
      taskId,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName email position');
    
    res.json(updatedTask);
  } catch (error: any) {
    console.error(`Error al actualizar la tarea ${req.params.taskId} del proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Eliminar una tarea
export const deleteProjectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    
    // Verificar que los IDs tengan un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(taskId)) {
      res.status(400).json({ message: 'ID de proyecto o tarea inválido' });
      return;
    }
    
    // Verificar que la tarea existe y pertenece al proyecto
    const task = await ProjectTask.findOne({ 
      _id: taskId,
      project: projectId
    });
    
    if (!task) {
      res.status(404).json({ message: 'Tarea no encontrada' });
      return;
    }
    
    // Eliminar la tarea
    await ProjectTask.findByIdAndDelete(taskId);
    
    // Actualizar el proyecto para eliminar la referencia a la tarea
    await Project.findByIdAndUpdate(
      projectId,
      { $pull: { tasks: taskId } }
    );
    
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error: any) {
    console.error(`Error al eliminar la tarea ${req.params.taskId} del proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Actualizar fechas de una tarea (maneja IDs numéricos o de MongoDB)
export const updateProjectTaskDates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const { startDate, endDate } = req.body;
    
    console.log(`Actualizando fechas para la tarea ID: ${taskId} del proyecto ID: ${projectId}`);
    console.log('Fechas recibidas:', { startDate, endDate });
    
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Se requieren las fechas de inicio y fin' });
      return;
    }
    
    // Intentar buscar el proyecto primero con el ID como está
    let project;
    
    try {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        project = await Project.findById(projectId);
      }
      
      // Si no encontramos el proyecto, buscar de manera más flexible
      if (!project) {
        console.log(`Buscando proyecto con ID numérico: ${projectId}`);
        // Buscar todos los proyectos y filtrar por coincidencia parcial de ID
        const allProjects = await Project.find({});
        project = allProjects.find(p => {
          // Usamos type assertion para indicar que p es un documento de Project
          const doc = p as any;
          return doc._id && doc._id.toString().includes(projectId);
        });
        
        if (!project) {
          res.status(404).json({ message: `Proyecto con ID ${projectId} no encontrado` });
          return;
        }
      }
      
      // Buscar la tarea de manera similar
      let task;
      if (mongoose.Types.ObjectId.isValid(taskId)) {
        task = await ProjectTask.findOne({ 
          _id: taskId,
          project: project._id
        });
      }
      
      if (!task) {
        console.log(`Buscando tarea con ID numérico: ${taskId}`);
        // Buscar todas las tareas del proyecto y filtrar
        const allTasks = await ProjectTask.find({ project: project._id });
        task = allTasks.find(t => {
          // Usamos type assertion para indicar que t es un documento de ProjectTask
          const doc = t as any;
          return doc._id && doc._id.toString().includes(taskId);
        });
        
        if (!task) {
          res.status(404).json({ message: `Tarea con ID ${taskId} no encontrada en el proyecto ${projectId}` });
          return;
        }
      }
      
      // Usamos type assertion para acceder a _id
      const taskDoc = task as any;
      const taskIdString = taskDoc._id.toString();
      
      console.log('Tarea encontrada:', {
        id: taskIdString,
        title: task.title,
        startDateAntes: task.startDate,
        dueDateAntes: task.dueDate
      });
      
      // Crear objetos Date a partir de las cadenas ISO
      const newStartDate = new Date(startDate);
      const newEndDate = new Date(endDate);
      
      console.log('Fechas parseadas para guardar:', {
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString()
      });
      
      // Actualizar las fechas de la tarea usando el método findByIdAndUpdate para garantizar que se guarde
      const updatedTask = await ProjectTask.findByIdAndUpdate(
        taskIdString,
        { 
          startDate: newStartDate,
          dueDate: newEndDate
        },
        { 
          new: true,           // Devuelve el documento actualizado
          runValidators: true, // Ejecuta validadores de esquema
          upsert: false,       // No crea un documento si no existe
          strict: true         // Aplica restricciones de esquema
        }
      );
      
      // Verificar que la tarea se actualizó
      if (!updatedTask) {
        console.error('Error: La tarea no se actualizó correctamente');
        res.status(500).json({ message: 'Error al actualizar las fechas de la tarea' });
        return;
      }
      
      // Verificación adicional: Comprobar si las fechas se actualizaron correctamente
      const verifyTask = await ProjectTask.findById(taskIdString);
      if (!verifyTask) {
        console.error('Error: No se pudo verificar la tarea después de la actualización');
      } else {
        console.log('Verificación después de actualizar:', {
          startDateVerificada: verifyTask.startDate,
          dueDateVerificada: verifyTask.dueDate
        });
        
        // Comprobar si las fechas coinciden con lo que intentamos guardar
        const startDateMatch = verifyTask.startDate?.toISOString() === newStartDate.toISOString();
        const dueDateMatch = verifyTask.dueDate?.toISOString() === newEndDate.toISOString();
        
        if (!startDateMatch || !dueDateMatch) {
          console.warn('Advertencia: Las fechas verificadas no coinciden con las que intentamos guardar');
        }
      }
      
      // Usamos type assertion para acceder a _id
      const updatedTaskDoc = updatedTask as any;
      
      console.log('Tarea actualizada correctamente:', {
        id: updatedTaskDoc._id.toString(),
        startDateDespues: updatedTask.startDate,
        dueDateDespues: updatedTask.dueDate
      });
      
      // Enviar una respuesta explícita al cliente con las fechas actualizadas
      res.json({ 
        message: 'Fechas de tarea actualizadas correctamente',
        task: updatedTask,
        fechas: {
          startDate: updatedTask.startDate,
          dueDate: updatedTask.dueDate
        }
      });
    } catch (error) {
      console.error('Error en la búsqueda del proyecto o tarea:', error);
      res.status(500).json({ message: 'Error interno al buscar proyecto o tarea' });
    }
  } catch (error: any) {
    console.error(`Error al actualizar fechas de tarea ${req.params.taskId} del proyecto ${req.params.projectId}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar las fechas de la tarea',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}; 