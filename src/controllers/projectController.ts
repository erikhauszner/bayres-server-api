import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Client } from '../models/Client';
import Employee, { IEmployee } from '../models/Employee';
import mongoose from 'mongoose';

// Obtener todos los proyectos
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Query params recibidos:', req.query);

    // Extraer parámetros de paginación y filtros
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Filtros
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const search = req.query.search as string;
    
    // Construir filtro
    const filter: any = { isActive: true };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    // Buscar por término
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Filtros aplicados:', filter);
    
    // Obtener total de documentos para paginación
    const total = await Project.countDocuments(filter);
    
    // Obtener proyectos con filtros y paginación
    const projects = await Project.find(filter)
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Transformar los datos para el formato esperado por el frontend
    const projectsData = projects.map(project => ({
      _id: project._id,
      name: project.name,
      description: project.description,
      client: project.client,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      assignedTo: project.team,
      manager: project.manager,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      totalHours: project.totalHours
    }));
    
    // Devolver respuesta con formato estructurado
    res.json({
      data: projectsData,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error al obtener los proyectos:', error);
    res.status(500).json({ message: 'Error al obtener los proyectos' });
  }
};

// Obtener un proyecto por ID
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Buscando proyecto con ID: ${req.params.id}`);
    
    // Verificar que el ID tenga un formato válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(`ID de proyecto inválido: ${req.params.id}`);
      res.status(400).json({ message: 'ID de proyecto inválido' });
      return;
    }
    
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position')
      .populate({
        path: 'tasks',
        populate: {
          path: 'assignedTo',
          select: 'firstName lastName email position'
        }
      });
    
    console.log('Resultado de la búsqueda:', project ? 'Proyecto encontrado' : 'Proyecto no encontrado');
    
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    // Transformar a formato esperado por el frontend
    const projectData = {
      _id: project._id,
      name: project.name,
      description: project.description,
      client: project.client,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      assignedTo: project.team,
      manager: project.manager,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      totalHours: project.totalHours,
      // Campos adicionales si son necesarios
      objectives: project.objectives,
      deliverables: project.deliverables,
      notes: project.notes,
      tasks: project.tasks
    };
    
    res.json(projectData);
  } catch (error: any) {
    console.error(`Error al obtener el proyecto con ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error al obtener el proyecto',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Obtener proyectos por cliente
export const getProjectsByClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({ 
      client: req.params.clientId,
      isActive: true 
    })
      .populate('team', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los proyectos del cliente' });
  }
};

// Crear un nuevo proyecto
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Datos recibidos para crear proyecto:', req.body);
    
    const {
      name,
      description,
      client,
      startDate,
      endDate,
      status,
      budget,
      priority,
      manager,
      assignedTo,
      totalHours
    } = req.body;

    // Verificar que el cliente existe
    const clientId = client;
    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    // Verificar que los miembros del equipo existen
    if (assignedTo && assignedTo.length > 0) {
      const teamMembers = await Employee.find({ _id: { $in: assignedTo } });
      if (teamMembers.length !== assignedTo.length) {
        res.status(400).json({ message: 'Uno o más miembros del equipo no existen' });
        return;
      }
    }

    // Verificar que el manager existe si se proporciona
    if (manager) {
      const managerExists = await Employee.findById(manager);
      if (!managerExists) {
        res.status(400).json({ message: 'El manager especificado no existe' });
        return;
      }
    }

    // Crear el objeto proyecto
    const project = new Project({
      name,
      description,
      client: clientId,
      startDate,
      endDate,
      status: status || 'in_progress',
      priority: priority || 'medium',
      progress: 0,
      team: assignedTo || [],
      budget: budget || 0,
      manager: manager || undefined,
      createdBy: req.user?._id || undefined,
      objectives: [],
      deliverables: [],
      notes: '',
      totalHours: totalHours || 0
    });

    console.log('Proyecto a guardar:', project);
    await project.save();

    // Actualizar la lista de proyectos del cliente
    await Client.findByIdAndUpdate(clientId, {
      $push: { projects: project._id }
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error al crear el proyecto:', error);
    res.status(500).json({ message: 'Error al crear el proyecto', error: error.message });
  }
};

// Actualizar un proyecto
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      status,
      startDate,
      endDate,
      progress,
      team,
      budget,
      objectives,
      deliverables,
      notes
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    // Verificar que los miembros del equipo existen
    if (team && team.length > 0) {
      const teamMembers = await Employee.find({ _id: { $in: team } });
      if (teamMembers.length !== team.length) {
        res.status(400).json({ message: 'Uno o más miembros del equipo no existen' });
        return;
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        status,
        startDate,
        endDate,
        progress,
        team,
        budget,
        objectives,
        deliverables,
        notes
      },
      { new: true }
    ).populate('client', 'name email')
      .populate('team', 'firstName lastName email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el proyecto' });
  }
};

// Eliminar un proyecto (soft delete)
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    // Soft delete
    project.isActive = false;
    await project.save();

    // Remover el proyecto de la lista de proyectos del cliente
    await Client.findByIdAndUpdate(project.client, {
      $pull: { projects: project._id }
    });

    res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el proyecto' });
  }
}; 