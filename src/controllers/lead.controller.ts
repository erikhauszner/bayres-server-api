import { Request, Response, NextFunction } from 'express';
import { Lead, ILead } from '../models/Lead';
import mongoose from 'mongoose';
import { Client, IClient } from '../models/Client';

export class LeadController {
  /**
   * Obtiene todos los leads con filtros opcionales
   */
  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        stage,
        assignedTo,
        priority,
        source,
        search,
        page = 1,
        limit = 10,
        isApproved
      } = req.query;

      const query: any = {};

      // Manejar el parámetro isApproved
      if (isApproved !== undefined) {
        // Convertir el string "true"/"false" a booleano
        query.isApproved = isApproved === 'true';
      }

      // Manejar el parámetro status (puede ser un string o un objeto para operaciones más complejas)
      if (status) {
        // Si el status es un objeto JSON serializado (para operaciones $ne, etc.)
        if (typeof status === 'string' && status.startsWith('{') && status.endsWith('}')) {
          try {
            query.status = JSON.parse(status);
          } catch (e) {
            // Si falla el parsing, usar el valor como está
            query.status = status;
          }
        } else {
          query.status = status;
        }
      }

      if (stage) query.currentStage = stage;
      if (assignedTo) query.assignedTo = assignedTo;
      if (priority) query.priority = priority;
      if (source) query.source = source;

      // Búsqueda por texto
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ];
      }

      console.log('Query de leads:', JSON.stringify(query, null, 2));

      const skip = (Number(page) - 1) * Number(limit);

      const [leads, total] = await Promise.all([
        Lead.find(query)
          .populate('assignedTo', 'firstName lastName email')
          .populate('createdBy', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Lead.countDocuments(query)
      ]);

      res.json({
        data: leads,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un lead por su ID
   */
  static async getLeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findById(req.params.id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea un nuevo lead
   */
  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const leadData = {
        ...req.body,
        createdBy: employeeId,
        isApproved: false
      };

      // Verificar unicidad de campos si están presentes
      const fieldsToCheck = ['email', 'linkedin', 'instagram', 'phone', 'facebook', 'company'];
      
      for (const field of fieldsToCheck) {
        if (leadData[field]) {
          const query: any = {};
          query[field] = leadData[field];
          
          const existingLead = await Lead.findOne(query);
          if (existingLead) {
            return res.status(400).json({ 
              message: `Ya existe un lead con este ${field}`,
              existingLeadId: existingLead._id,
              duplicatedField: field
            });
          }
        }
      }

      // Añadir valores por defecto para campos requeridos si no existen
      if (!leadData.status) leadData.status = 'nuevo';
      if (!leadData.currentStage) leadData.currentStage = 'asda';
      if (!leadData.source) leadData.source = 'manual';
      if (!leadData.priority) leadData.priority = 'media';

      const lead = new Lead(leadData);
      await lead.save();

      const populatedLead = await Lead.findById(lead._id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

      res.status(201).json(populatedLead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza un lead existente
   */
  static async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un lead
   */
  static async deleteLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      res.json({ message: 'Lead eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Añade una interacción a un lead
   */
  static async addInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { type, title, description, date } = req.body;
      
      const newInteraction = {
        type,
        title,
        description,
        date: new Date(date),
        user: employeeId
      };
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { interactionHistory: newInteraction },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza una interacción específica de un lead
   */
  static async updateInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, title, description, date } = req.body;
      
      const lead = await Lead.findOneAndUpdate(
        { 
          _id: req.params.id,
          'interactionHistory._id': req.params.interactionId 
        },
        { 
          $set: { 
            'interactionHistory.$.type': type,
            'interactionHistory.$.title': title,
            'interactionHistory.$.description': description,
            'interactionHistory.$.date': new Date(date),
            lastActivity: new Date()
          } 
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead o interacción no encontrada' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina una interacción específica de un lead
   */
  static async deleteInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $pull: { interactionHistory: { _id: req.params.interactionId } },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Añade una tarea a un lead
   */
  static async addTask(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { title, description, dueDate, status, priority } = req.body;
      
      const newTask = {
        title,
        description,
        dueDate: new Date(dueDate),
        status,
        priority,
        user: employeeId,
        createdAt: new Date()
      };
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { tasks: newTask },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('tasks.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza una tarea específica de un lead
   */
  static async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, dueDate, status, priority } = req.body;
      
      const updateData: any = {
        'tasks.$.title': title,
        'tasks.$.description': description,
        'tasks.$.dueDate': new Date(dueDate),
        'tasks.$.status': status,
        'tasks.$.priority': priority,
        'tasks.$.updatedAt': new Date(),
        lastActivity: new Date()
      };
      
      // Si la tarea se completa, añadimos la fecha de completado
      if (status === 'completed') {
        updateData['tasks.$.completedAt'] = new Date();
      }
      
      const lead = await Lead.findOneAndUpdate(
        { 
          _id: req.params.id,
          'tasks._id': req.params.taskId 
        },
        { $set: updateData },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('tasks.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead o tarea no encontrada' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina una tarea específica de un lead
   */
  static async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $pull: { tasks: { _id: req.params.taskId } },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('tasks.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Añade o actualiza una nota a un lead
   */
  static async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { notes } = req.body;
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          notes,
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza la nota de un lead
   */
  static async updateNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { notes } = req.body;
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          notes,
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina la nota de un lead
   */
  static async deleteNote(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          notes: "",
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sube un documento para un lead
   */
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { name, description, tags, fileUrl, fileType } = req.body;
      
      // Determinar si es un enlace o un archivo
      const isLink = fileUrl && !req.file;
      const isFile = req.file && !fileUrl;
      
      if (!isLink && !isFile) {
        return res.status(400).json({ message: 'Se requiere proporcionar un archivo o un enlace' });
      }
      
      let newDocument;
      
      if (isLink) {
        // Caso de enlace externo
        newDocument = {
          name: name || 'Documento sin nombre',
          description: description || "",
          fileUrl: fileUrl,
          fileType: fileType || "application/octet-stream",
          fileSize: 0, // No aplica para enlaces
          tags: tags || [],
          uploadDate: new Date(),
          user: employeeId,
          isExternalLink: true
        };
      } else {
        // Caso de archivo subido
        newDocument = {
          name: name || req.file?.originalname || 'Documento sin nombre',
          description: description || "",
          fileUrl: `/uploads/${req.file?.filename}`,
          fileType: req.file?.mimetype || "application/octet-stream",
          fileSize: req.file?.size || 0,
          tags: tags || [],
          uploadDate: new Date(),
          user: employeeId,
          isExternalLink: false
        };
      }
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { documents: newDocument },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('documents.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza información de un documento
   */
  static async updateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, tags } = req.body;
      
      const updateData: any = {
        'documents.$.name': name,
        lastActivity: new Date()
      };
      
      if (description !== undefined) {
        updateData['documents.$.description'] = description;
      }
      
      if (tags !== undefined) {
        updateData['documents.$.tags'] = tags;
      }
      
      const lead = await Lead.findOneAndUpdate(
        { 
          _id: req.params.id,
          'documents._id': req.params.documentId 
        },
        { $set: updateData },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('documents.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead o documento no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un documento
   */
  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $pull: { documents: { _id: req.params.documentId } },
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('documents.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      // Aquí normalmente eliminaríamos el archivo físico
      // del sistema de almacenamiento (S3, local, etc.)
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza el estado de un lead
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Petición de actualización de estado recibida:', req.body);
      const { status, stage, currentStage, reason } = req.body;

      // Verificar que se reciben los campos requeridos
      if (!status || !currentStage || !reason) {
        return res.status(400).json({ 
          message: 'Faltan campos requeridos (status, currentStage, reason)' 
        });
      }

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        {
          status,
          currentStage: currentStage || stage, // Usar currentStage o stage como fallback
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      console.log('Lead actualizado:', {
        id: lead._id,
        status: lead.status,
        currentStage: lead.currentStage
      });

      res.json(lead);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      next(error);
    }
  }

  /**
   * Asigna un lead a un usuario
   */
  static async assignLead(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { assignedTo } = req.body;
      
      // Primero verificamos si el lead existe y está aprobado
      const lead = await Lead.findById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      // No permitir asignar leads que no han sido aprobados
      if (!lead.isApproved) {
        return res.status(400).json({ 
          message: 'Este lead requiere aprobación antes de poder ser asignado' 
        });
      }
      
      // Actualización para cuando el lead es desasignado (assignedTo = null)
      const updateFields: any = {
        lastActivity: new Date()
      };
      
      // Solo incluir assignedTo si no es null
      if (assignedTo !== null) {
        updateFields.assignedTo = assignedTo;
        updateFields.status = 'asignado'; // Actualizamos el estado a 'asignado' cuando se asigna
      } else {
        // Si es null, establecer a undefined para remover la asignación
        updateFields.$unset = { assignedTo: 1 };
        // Cuando se desasigna, volver al estado 'aprobado'
        updateFields.status = 'aprobado';
      }

      const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
      
      if (!updatedLead) {
        return res.status(404).json({ message: 'Lead no encontrado después de la actualización' });
      }
      
      // Añadir una interacción de asignación al historial
      if (assignedTo !== null) {
        await Lead.findByIdAndUpdate(
          req.params.id,
          { 
            $push: { 
              interactionHistory: {
                type: 'status_change',
                title: 'Lead asignado',
                description: `El lead ha sido asignado a ${(updatedLead.assignedTo as any).firstName} ${(updatedLead.assignedTo as any).lastName}`,
                date: new Date(),
                user: employeeId
              } 
            }
          }
        );
      } else {
        // Registrar que el lead fue desasignado
        await Lead.findByIdAndUpdate(
          req.params.id,
          { 
            $push: { 
              interactionHistory: {
                type: 'status_change',
                title: 'Lead desasignado',
                description: 'El lead ha sido desasignado',
                date: new Date(),
                user: employeeId
              } 
            }
          }
        );
      }
      
      res.json(updatedLead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aprueba un lead para ser asignado
   */
  static async approveLead(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          isApproved: true, 
          status: 'aprobado', // Actualizamos el status a aprobado (ya no está pendiente de aprobación)
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      // Añadir una interacción de aprobación al historial
      await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { 
            interactionHistory: {
              type: 'aprobacion',
              title: 'Lead aprobado',
              description: 'El lead ha sido aprobado y está listo para ser asignado',
              date: new Date(),
              user: employeeId
            } 
          }
        }
      );

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechaza un lead
   */
  static async rejectLead(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Se requiere una razón para rechazar el lead' });
      }
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          isApproved: false, 
          status: 'rechazado', // Marcamos como rechazado
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }

      // Añadir una interacción de rechazo al historial
      await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { 
            interactionHistory: {
              type: 'rechazo',
              title: 'Lead rechazado',
              description: `Razón: ${reason}`,
              date: new Date(),
              user: employeeId
            } 
          }
        }
      );

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza la etapa de un lead
   */
  static async updateLeadStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { stage } = req.body;
      
      if (!stage) {
        return res.status(400).json({ message: 'La etapa es requerida' });
      }
      
      // Verificar permisos manualmente (como respaldo al middleware)
      const employeePermissions = req.employee?.permissions || [];
      console.log('Verificando permisos en controller updateLeadStage:', employeePermissions);
      
      // Verificar si tiene alguno de los dos permisos necesarios
      const hasPermission = employeePermissions.includes('leads:edit_stage') || 
                           employeePermissions.includes('leads:stage_edit_appsetters');
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'No autorizado', 
          requiredPermissions: ['leads:edit_stage', 'leads:stage_edit_appsetters'],
          employeePermissions
        });
      }
      
      // Verificar si la etapa existe en las categorías de etapas
      const LeadStageCategory = require('../models/LeadStageCategory').default;
      const stageExists = await LeadStageCategory.findOne({ name: stage, active: true });
      
      if (!stageExists) {
        return res.status(400).json({ message: 'La etapa proporcionada no existe o no está activa' });
      }
      
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { 
          currentStage: stage,
          lastActivity: new Date()
        },
        { new: true }
      )
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('interactionHistory.user', 'firstName lastName email');
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convierte un lead a cliente
   */
  static async convertToClient(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      const lead = await Lead.findById(req.params.id);

      if (!lead) {
        return res.status(404).json({ message: 'Lead no encontrado' });
      }
      
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }

      // Crear el cliente basado en el tipo
      const clientData: Partial<IClient> = {
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        email: lead.email,
        phone: lead.phone || "",
        type: type,
        businessName: type === 'business' ? lead.company || "" : "",
        industry: type === 'business' ? lead.industry || "" : "",
        website: lead.website || "",
        instagram: lead.instagram || "",
        twitter: lead.twitter || "",
        linkedin: lead.linkedin || "",
        facebook: lead.facebook || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "",
        postalCode: lead.postalCode || "",
        status: "active",
        createdBy: employeeId
      };

      // Si es cliente empresa, agregar el contacto principal
      if (type === 'business') {
        clientData.representatives = [{
          name: `${lead.firstName} ${lead.lastName}`.trim(),
          email: lead.email || "",
          phone: lead.phone || "",
          position: lead.position || ""
        }];
      }

      const client = new Client(clientData);
      await client.save();

      // Eliminar el lead
      await Lead.findByIdAndDelete(req.params.id);

      res.json({ 
        message: 'Lead convertido a cliente exitosamente',
        clientId: client._id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Importa leads masivamente desde un archivo Excel o CSV
   */
  static async importLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      }
      
      const filePath = req.file.path;
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      
      if (!fileExt || !['xlsx', 'xls', 'csv'].includes(fileExt)) {
        return res.status(400).json({ 
          message: 'Formato de archivo no soportado. Por favor, sube un archivo Excel o CSV.'
        });
      }
      
      // Importar utilizando XLSX
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      if (!data || data.length === 0) {
        return res.status(400).json({ message: 'El archivo no contiene datos' });
      }
      
      // Validar que los datos tengan la estructura correcta
      const requiredFields = ['firstName', 'lastName'];
      const firstRow = data[0];
      
      const missingFields = requiredFields.filter(field => !Object.keys(firstRow).includes(field));
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Faltan campos requeridos: ${missingFields.join(', ')}`,
          requiredFields
        });
      }
      
      // Procesar y crear los leads
      const leadsToCreate = data.map((row: any) => ({
        ...row,
        createdBy: employeeId,
        // No asignar a ningún empleado
        // Valores por defecto para campos requeridos si no existen
        priority: row.priority || 'baja',
        status: row.status || 'nuevo',
        currentStage: row.currentStage || 'asda',
        initialScore: row.initialScore || 0,
        captureDate: row.captureDate ? new Date(row.captureDate) : new Date()
      }));
      
      // Verificar duplicados para varios campos
      const fieldsToCheck = ['email', 'linkedin', 'instagram', 'phone', 'facebook', 'company'];
      const duplicatesMap: Record<string, any[]> = {};
      
      // Inicializar mapa de duplicados
      fieldsToCheck.forEach(field => {
        duplicatesMap[field] = [];
      });
      
      // Verificar duplicados entre los datos proporcionados
      for (const field of fieldsToCheck) {
        const valuesInData = leadsToCreate
          .filter((lead: any) => lead[field]) 
          .map((lead: any) => lead[field]);
        
        const uniqueValues = new Set(valuesInData);
        
        if (uniqueValues.size !== valuesInData.length) {
          // Encontrar los valores duplicados
          const seen = new Set<any>();
          const duplicates = valuesInData.filter((value: any) => {
            if (seen.has(value)) return true;
            seen.add(value);
            return false;
          });
          
          duplicatesMap[field] = [...new Set(duplicates)];
        }
      }
      
      // Verificar si hay duplicados en cualquier campo
      const hasDuplicates = Object.values(duplicatesMap).some(arr => arr.length > 0);
      
      if (hasDuplicates) {
        // Eliminar el archivo temporal
        const fs = require('fs');
        fs.unlinkSync(filePath);
        
        return res.status(400).json({ 
          message: 'Se encontraron valores duplicados en el archivo importado',
          duplicatedValues: duplicatesMap
        });
      }
      
      // Verificar si ya existen leads con esos valores en la base de datos
      const existingRecords: Record<string, any[]> = {};
      let hasExistingRecords = false;
      
      for (const field of fieldsToCheck) {
        const values = leadsToCreate
          .filter((lead: any) => lead[field])
          .map((lead: any) => lead[field]);
        
        if (values.length > 0) {
          const query: any = {};
          query[field] = { $in: values };
          
          const existing = await Lead.find(query).select(`_id ${field}`).lean();
          
          if (existing.length > 0) {
            existingRecords[field] = existing.map(record => {
              return (record as any)[field];
            });
            hasExistingRecords = true;
          } else {
            existingRecords[field] = [];
          }
        }
      }
      
      if (hasExistingRecords) {
        // Eliminar el archivo temporal
        const fs = require('fs');
        fs.unlinkSync(filePath);
        
        return res.status(400).json({
          message: 'Algunos valores ya existen en la base de datos',
          existingRecords
        });
      }
      
      // Crear los leads
      const createdLeads = await Lead.insertMany(leadsToCreate);
      
      // Eliminar el archivo temporal
      const fs = require('fs');
      fs.unlinkSync(filePath);
      
      res.status(201).json({
        message: `Se importaron ${createdLeads.length} leads exitosamente`,
        totalImported: createdLeads.length
      });
    } catch (error) {
      console.error('Error importando leads:', error);
      next(error);
    }
  }

  /**
   * Importa leads masivamente desde un JSON
   */
  static async importLeadsBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const { leads } = req.body;
      
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ 
          message: 'Se requiere un array de leads en el campo "leads"'
        });
      }
      
      if (leads.length > 500) {
        return res.status(400).json({ 
          message: 'Se permite un máximo de 500 leads por solicitud'
        });
      }
      
      // Validar que los datos tengan la estructura correcta
      const requiredFields = ['firstName', 'lastName'];
      
      for (const lead of leads) {
        const missingFields = requiredFields.filter(field => !lead[field]);
        if (missingFields.length > 0) {
          return res.status(400).json({ 
            message: `Faltan campos requeridos en uno o más leads: ${missingFields.join(', ')}`,
            requiredFields
          });
        }
      }
      
      // Verificar duplicados para varios campos
      const fieldsToCheck = ['email', 'linkedin', 'instagram', 'phone', 'facebook', 'company'];
      const duplicatesMap: Record<string, any[]> = {};
      
      // Inicializar mapa de duplicados
      fieldsToCheck.forEach(field => {
        duplicatesMap[field] = [];
      });
      
      // Verificar duplicados entre los datos proporcionados
      for (const field of fieldsToCheck) {
        const valuesInRequest = leads
          .filter(lead => lead[field])
          .map(lead => lead[field]);
        
        const uniqueValues = new Set(valuesInRequest);
        
        if (uniqueValues.size !== valuesInRequest.length) {
          // Encontrar los valores duplicados
          const seen = new Set<any>();
          const duplicates = valuesInRequest.filter((value: any) => {
            if (seen.has(value)) return true;
            seen.add(value);
            return false;
          });
          
          duplicatesMap[field] = [...new Set(duplicates)];
        }
      }
      
      // Verificar si hay duplicados en cualquier campo
      const hasDuplicates = Object.values(duplicatesMap).some(arr => arr.length > 0);
      
      if (hasDuplicates) {
        return res.status(400).json({ 
          message: 'Se encontraron valores duplicados en los datos proporcionados',
          duplicatedValues: duplicatesMap
        });
      }
      
      // Verificar si ya existen leads con esos valores en la base de datos
      const existingRecords: Record<string, any[]> = {};
      let hasExistingRecords = false;
      
      for (const field of fieldsToCheck) {
        const values = leads
          .filter(lead => lead[field])
          .map(lead => lead[field]);
        
        if (values.length > 0) {
          const query: any = {};
          query[field] = { $in: values };
          
          const existing = await Lead.find(query).select(`_id ${field}`).lean();
          
          if (existing.length > 0) {
            existingRecords[field] = existing.map(record => {
              // Usar indexación con tipo seguro
              return (record as any)[field];
            });
            hasExistingRecords = true;
          } else {
            existingRecords[field] = [];
          }
        }
      }
      
      if (hasExistingRecords) {
        // Filtrar los leads que no tienen valores duplicados en ninguno de los campos
        const validLeads = leads.filter(lead => {
          for (const field of fieldsToCheck) {
            if (lead[field] && existingRecords[field].includes(lead[field])) {
              return false;
            }
          }
          return true;
        });
        
        // Si no quedan leads válidos, retornar error
        if (validLeads.length === 0) {
          return res.status(400).json({
            message: 'Todos los leads tienen valores que ya existen en la base de datos',
            existingRecords
          });
        }
        
        // Procesar solo los leads válidos e informar de los duplicados
        const leadsToCreate = validLeads.map(lead => ({
          ...lead,
          createdBy: employeeId,
          priority: lead.priority || 'baja',
          status: lead.status || 'nuevo',
          currentStage: lead.currentStage || 'asda',
          initialScore: lead.initialScore || 0,
          captureDate: lead.captureDate ? new Date(lead.captureDate) : new Date()
        }));
        
        const createdLeads = await Lead.insertMany(leadsToCreate);
        
        // Calcular leads con errores
        const errorsCount = leads.length - validLeads.length;
        
        // Identificar los leads con errores
        const leadsWithErrors = leads.filter(lead => {
          for (const field of fieldsToCheck) {
            if (lead[field] && existingRecords[field].includes(lead[field])) {
              return true;
            }
          }
          return false;
        });
        
        return res.status(201).json({
          success: true,
          message: 'Importación por lotes completada con advertencias',
          data: {
            total: leads.length,
            imported: createdLeads.length,
            errors: errorsCount,
            errorDetails: leadsWithErrors.map(lead => {
              const duplicatedFields = fieldsToCheck.filter(field => 
                lead[field] && existingRecords[field].includes(lead[field])
              );
              return {
                data: lead,
                error: `Valores duplicados en: ${duplicatedFields.join(', ')}`
              };
            }),
            imported_ids: createdLeads.map(lead => lead._id.toString())
          }
        });
      }
      
      // Si no hay duplicados, procesar todos los leads
      const leadsToCreate = leads.map(lead => ({
        ...lead,
        createdBy: employeeId,
        priority: lead.priority || 'baja',
        status: lead.status || 'nuevo',
        currentStage: lead.currentStage || 'asda',
        initialScore: lead.initialScore || 0,
        captureDate: lead.captureDate ? new Date(lead.captureDate) : new Date()
      }));
      
      const createdLeads = await Lead.insertMany(leadsToCreate);
      
      res.status(201).json({
        success: true,
        message: 'Importación por lotes completada',
        data: {
          total: leads.length,
          imported: createdLeads.length,
          errors: 0,
          errorDetails: [],
          imported_ids: createdLeads.map(lead => lead._id.toString())
        }
      });
    } catch (error) {
      console.error('Error importando leads por lotes:', error);
      next(error);
    }
  }

  /**
   * Obtiene el conteo de leads asignados a un empleado específico
   */
  static async getLeadsCountByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      
      if (!employeeId) {
        return res.status(400).json({ message: 'Se requiere un ID de empleado válido' });
      }
      
      // Contar los leads asignados al empleado
      const count = await Lead.countDocuments({ assignedTo: employeeId });
      
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
} 