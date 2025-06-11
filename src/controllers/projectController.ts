import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Client } from '../models/Client';
import Employee, { IEmployee } from '../models/Employee';
import mongoose from 'mongoose';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

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

    // Registrar acción en el log de auditoría
    if (project && req.employee && project._id) {
      await logAuditAction(
        req,
        'creación',
        `Creación de proyecto: ${project.name}`,
        'proyecto',
        project._id.toString(),
        null,
        sanitizeDataForAudit(project),
        'proyectos'
      );
    }

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error al crear el proyecto:', error);
    res.status(500).json({ message: 'Error al crear el proyecto', error: error.message });
  }
};

// Actualizar un proyecto
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Actualizando proyecto con ID: ${req.params.id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'ID de proyecto inválido' });
      return;
    }
    
    // Obtener el proyecto original para auditoría
    const originalProject = await Project.findById(req.params.id);
    if (!originalProject) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    const sanitizedOldData = sanitizeDataForAudit(originalProject);
    
    // Actualizar campos específicos
    const {
      name,
      description,
      client,
      startDate,
      endDate,
      status,
      budget,
      priority,
      progress,
      manager,
      assignedTo,
      notes,
      objectives,
      deliverables,
      totalHours
    } = req.body;
    
    // Verificar que el cliente existe si se proporciona
    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        res.status(404).json({ message: 'Cliente no encontrado' });
        return;
      }
    }
    
    // Preparar objeto de actualización
    const updateData: any = {};
    
    // Actualizar solo los campos proporcionados
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (client !== undefined) updateData.client = client;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (status !== undefined) updateData.status = status;
    if (budget !== undefined) updateData.budget = budget;
    if (priority !== undefined) updateData.priority = priority;
    if (progress !== undefined) updateData.progress = progress;
    if (manager !== undefined) updateData.manager = manager;
    if (assignedTo !== undefined) updateData.team = assignedTo;
    if (notes !== undefined) updateData.notes = notes;
    if (objectives !== undefined) updateData.objectives = objectives;
    if (deliverables !== undefined) updateData.deliverables = deliverables;
    if (totalHours !== undefined) updateData.totalHours = totalHours;
    
    // Realizar la actualización
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position');
    
    if (!updatedProject) {
      res.status(404).json({ message: 'Proyecto no encontrado después de la actualización' });
      return;
    }
    
    // Registrar acción en el log de auditoría
    if (updatedProject && req.employee && updatedProject._id) {
      const sanitizedNewData = sanitizeDataForAudit(updatedProject);
      
      await logAuditAction(
        req,
        'actualización',
        `Actualización de proyecto: ${updatedProject.name}`,
        'proyecto',
        updatedProject._id.toString(),
        sanitizedOldData,
        sanitizedNewData,
        'proyectos'
      );
    }
    
    // Si se cambió el estado, registrar específicamente este cambio
    if (status && originalProject.status !== status) {
      await logAuditAction(
        req,
        'cambio_estado',
        `Cambio de estado de proyecto: ${originalProject.name} (${originalProject.status} → ${status})`,
        'proyecto',
        req.params.id,
        { status: originalProject.status },
        { status },
        'proyectos'
      );
    }
    
    // Si se cambió el progreso, registrar específicamente este cambio
    if (progress !== undefined && originalProject.progress !== progress) {
      await logAuditAction(
        req,
        'actualización_progreso',
        `Actualización de progreso en proyecto: ${originalProject.name} (${originalProject.progress}% → ${progress}%)`,
        'proyecto',
        req.params.id,
        { progress: originalProject.progress },
        { progress },
        'proyectos'
      );
    }
    
    res.json(updatedProject);
  } catch (error: any) {
    console.error(`Error al actualizar el proyecto con ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar el proyecto',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Eliminar un proyecto
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Eliminando proyecto con ID: ${req.params.id}`);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'ID de proyecto inválido' });
      return;
    }
    
    // Obtener el proyecto que se va a eliminar para auditoría
    const projectToDelete = await Project.findById(req.params.id);
    if (!projectToDelete) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    const sanitizedData = sanitizeDataForAudit(projectToDelete);
    
    // Actualizar a inactivo en lugar de eliminar
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!updatedProject) {
      res.status(404).json({ message: 'Proyecto no encontrado después de la desactivación' });
      return;
    }
    
    // Registrar acción en el log de auditoría
    if (req.employee && projectToDelete._id) {
      await logAuditAction(
        req,
        'eliminación',
        `Eliminación de proyecto: ${projectToDelete.name}`,
        'proyecto',
        projectToDelete._id.toString(),
        sanitizedData,
        null,
        'proyectos'
      );
    }
    
    res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error: any) {
    console.error(`Error al eliminar el proyecto con ID ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar el proyecto',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// Actualizar estado del proyecto
export const updateProjectStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({ message: 'El estado es requerido' });
      return;
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position');
    
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    res.json(project);
  } catch (error: any) {
    console.error(`Error al actualizar estado del proyecto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al actualizar el estado del proyecto' });
  }
};

// Obtener estadísticas financieras del proyecto
export const getProjectFinances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verificar que el proyecto existe
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    // Obtener gastos asociados al proyecto
    const expenses = await mongoose.model('Expense').find({ projectId: id });
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
    
    // Obtener facturas asociadas al proyecto
    const invoices = await mongoose.model('Invoice').find({ projectId: id });
    const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + invoice.amount, 0);
    
    // Calcular estadísticas
    const budgetUsed = (totalExpenses / project.budget) * 100;
    const profitMargin = totalInvoiced - totalExpenses;
    const profitPercentage = totalInvoiced > 0 ? ((profitMargin / totalInvoiced) * 100) : 0;
    
    const financialData = {
      budget: project.budget,
      spent: totalExpenses,
      invoiced: totalInvoiced,
      remaining: project.budget - totalExpenses,
      budgetUsedPercentage: budgetUsed,
      profitMargin,
      profitPercentage,
      expenses: expenses.map((expense: any) => ({
        _id: expense._id,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        status: expense.status
      })),
      invoices: invoices.map((invoice: any) => ({
        _id: invoice._id,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        status: invoice.status
      }))
    };
    
    res.json(financialData);
  } catch (error: any) {
    console.error(`Error al obtener finanzas del proyecto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al obtener las finanzas del proyecto' });
  }
};

// Agregar gasto al proyecto
export const addProjectExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, amount, category, date } = req.body;
    
    // Verificar que el proyecto existe
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    // Crear el gasto
    const Expense = mongoose.model('Expense');
    const expense = new Expense({
      projectId: id,
      description,
      amount,
      category,
      date: date || new Date(),
      status: 'pending',
      createdBy: req.user?._id
    });
    
    await expense.save();
    
    res.status(201).json(expense);
  } catch (error: any) {
    console.error(`Error al agregar gasto al proyecto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al agregar el gasto al proyecto' });
  }
};

// Subir documento al proyecto
export const uploadProjectDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const employeeId = req.employee?._id || req.user?._id;
    
    if (!employeeId) {
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }

    const { name, description, type, tags } = req.body;
    
    if (!req.file) {
      res.status(400).json({ message: 'Se requiere un archivo' });
      return;
    }

    // Crear el documento
    const newDocument = {
      name: name || req.file.originalname || 'Documento sin nombre',
      description: description || "",
      type: type || "other",
      url: `/uploads/${req.file.filename}`,
      size: req.file.size || 0,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      uploadedAt: new Date(),
      uploadedBy: employeeId
    };

    // Actualizar el proyecto con el nuevo documento
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { documents: newDocument }
      },
      { new: true }
    )
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position')
      .populate('documents.uploadedBy', 'firstName lastName email');

    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    // Registrar acción en el log de auditoría
    if (req.employee && project._id) {
      await logAuditAction(
        req,
        'creación',
        `Nuevo documento subido al proyecto: ${project.name} - ${newDocument.name}`,
        'documento_proyecto',
        project._id.toString(),
        null,
        sanitizeDataForAudit(newDocument),
        'proyectos'
      );
    }

    res.status(201).json(project);
  } catch (error: any) {
    console.error(`Error al subir documento al proyecto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al subir el documento' });
  }
};

// Eliminar documento del proyecto
export const deleteProjectDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, documentId } = req.params;

    // Obtener el proyecto
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    // Actualizar el proyecto removiendo el documento
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { 
        $pull: { documents: { _id: documentId } }
      },
      { new: true }
    )
      .populate('client', 'name email')
      .populate('team', 'firstName lastName email position')
      .populate('manager', 'firstName lastName email position')
      .populate('documents.uploadedBy', 'firstName lastName email');

    if (!updatedProject) {
      res.status(404).json({ message: 'Proyecto no encontrado después de la eliminación' });
      return;
    }

    // Registrar acción en el log de auditoría
    if (req.employee && updatedProject._id) {
      await logAuditAction(
        req,
        'eliminación',
        `Documento eliminado del proyecto: ${updatedProject.name} (ID: ${documentId})`,
        'documento_proyecto',
        updatedProject._id.toString(),
        { documentId },
        null,
        'proyectos'
      );
    }

    res.json(updatedProject);
  } catch (error: any) {
    console.error(`Error al eliminar documento del proyecto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al eliminar el documento' });
  }
}; 