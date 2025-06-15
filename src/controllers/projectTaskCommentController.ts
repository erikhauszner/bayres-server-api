import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ProjectTaskComment } from '../models/ProjectTaskComment';
import ProjectTask from '../models/ProjectTask';
import { Project } from '../models/Project';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

// Obtener todos los comentarios de una tarea
export const getTaskComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    
    console.log(`Buscando comentarios para la tarea ${taskId} del proyecto ${projectId}`);
    
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
    
    // Buscar todos los comentarios asociados a la tarea
    const comments = await ProjectTaskComment.find({ 
      task: taskId,
      project: projectId
    })
      .sort({ createdAt: -1 }) // Ordenar por fecha, más recientes primero
      .populate('author', 'firstName lastName email position');
    
    console.log(`Se encontraron ${comments.length} comentarios para la tarea ${taskId}`);
    
    res.json(comments);
  } catch (error: any) {
    console.error(`Error al obtener comentarios de la tarea ${req.params.taskId}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener los comentarios',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Crear un nuevo comentario
export const createTaskComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const { content } = req.body;
    
    console.log(`Creando comentario para la tarea ${taskId} del proyecto ${projectId}`);
    console.log('Usuario autenticado:', req.user);
    
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
    
    // Verificar que el contenido del comentario no esté vacío
    if (!content || !content.trim()) {
      res.status(400).json({ message: 'El contenido del comentario es requerido' });
      return;
    }
    
    // Verificar si hay un usuario autenticado
    let authorId;
    if (req.user && req.user._id) {
      authorId = req.user._id;
    } else {
      // Para desarrollo/pruebas: buscar un empleado existente para usar como autor
      console.log('No hay usuario autenticado. Usando autor por defecto para desarrollo.');
      const defaultAuthor = await mongoose.model('Employee').findOne();
      if (!defaultAuthor) {
        res.status(500).json({ message: 'No se pudo encontrar un autor por defecto' });
        return;
      }
      authorId = defaultAuthor._id;
    }
    
    // Crear el nuevo comentario
    const newComment = new ProjectTaskComment({
      content: content.trim(),
      task: taskId,
      project: projectId,
      author: authorId
    });
    
    await newComment.save();
    
    // Devolver el comentario creado con información del autor
    const createdComment = await ProjectTaskComment.findById(newComment._id)
      .populate('author', 'firstName lastName email position');
    
    res.status(201).json(createdComment);
  } catch (error: any) {
    console.error(`Error al crear comentario para la tarea ${req.params.taskId}:`, error);
    res.status(500).json({ 
      message: 'Error al crear el comentario',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Actualizar un comentario
export const updateTaskComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId, commentId } = req.params;
    const { content } = req.body;
    
    console.log(`Actualizando comentario ${commentId} de la tarea ${taskId}`);
    console.log('Usuario autenticado:', req.user);
    
    // Verificar que los IDs tengan un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId) || 
        !mongoose.Types.ObjectId.isValid(taskId) || 
        !mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ message: 'ID de proyecto, tarea o comentario inválido' });
      return;
    }
    
    // Verificar que el comentario existe y pertenece a la tarea y proyecto
    const comment = await ProjectTaskComment.findOne({
      _id: commentId,
      task: taskId,
      project: projectId
    });
    
    if (!comment) {
      res.status(404).json({ message: 'Comentario no encontrado' });
      return;
    }
    
    // En desarrollo, omitimos la verificación de permisos
    // Verificación de permisos para producción:
    /*
    if (comment.author.toString() !== req.user?._id.toString() && 
        !req.user?.permissions?.includes('comments:edit_any')) {
      res.status(403).json({ message: 'No tienes permiso para editar este comentario' });
      return;
    }
    */
    
    // Verificar que el contenido del comentario no esté vacío
    if (!content || !content.trim()) {
      res.status(400).json({ message: 'El contenido del comentario es requerido' });
      return;
    }
    
    // Actualizar el comentario
    comment.content = content.trim();
    await comment.save();
    
    res.json(comment);
  } catch (error: any) {
    console.error(`Error al actualizar comentario ${req.params.commentId}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar el comentario',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Eliminar un comentario
export const deleteTaskComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId, commentId } = req.params;
    
    console.log(`Eliminando comentario ${commentId} de la tarea ${taskId}`);
    console.log('Usuario autenticado:', req.user);
    
    // Verificar que los IDs tengan un formato válido
    if (!mongoose.Types.ObjectId.isValid(projectId) || 
        !mongoose.Types.ObjectId.isValid(taskId) || 
        !mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ message: 'ID de proyecto, tarea o comentario inválido' });
      return;
    }
    
    // Verificar que el comentario existe y pertenece a la tarea y proyecto
    const comment = await ProjectTaskComment.findOne({
      _id: commentId,
      task: taskId,
      project: projectId
    });
    
    if (!comment) {
      res.status(404).json({ message: 'Comentario no encontrado' });
      return;
    }
    
    // En desarrollo, omitimos la verificación de permisos
    // Verificación de permisos para producción:
    /*
    if (comment.author.toString() !== req.user?._id.toString() && 
        !req.user?.permissions?.includes('comments:delete_any')) {
      res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
      return;
    }
    */
    
    // Eliminar el comentario
    await ProjectTaskComment.findByIdAndDelete(commentId);
    
    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error: any) {
    console.error(`Error al eliminar comentario ${req.params.commentId}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar el comentario',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}; 