import { Request, Response } from 'express';
import { Opportunity, IOpportunity } from '../models/Opportunity';
import { Lead } from '../models/Lead';
import mongoose from 'mongoose';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

export class OpportunityController {
  // Obtener todas las oportunidades con filtros
  static async getAllOpportunities(req: Request, res: Response) {
    try {
      const { status, priority, originalAgent, salesAgent, page = 1, limit = 10 } = req.query;
      const user = (req as any).employee;

      // Construir filtros
      const filters: any = {};
      
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (originalAgent) filters.originalAgent = originalAgent;
      if (salesAgent) filters.salesAgent = salesAgent;

      // Filtrar por permisos del usuario
      if (!user.permissions.includes('opportunities:view_all')) {
        // Solo ver oportunidades propias
        filters.$or = [
          { originalAgent: user.id },
          { salesAgent: user.id }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const opportunities = await Opportunity.find(filters)
        .populate('originalAgent', 'firstName lastName email')
        .populate('salesAgent', 'firstName lastName email')
        .populate('leadId', 'firstName lastName company email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Opportunity.countDocuments(filters);

      res.json({
        success: true,
        data: opportunities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener oportunidades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener oportunidad por ID
  static async getOpportunityById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id)
        .populate('originalAgent', 'firstName lastName email')
        .populate('salesAgent', 'firstName lastName email')
        .populate('collaborators', 'firstName lastName email department position')
        .populate('leadId', 'firstName lastName company email phone')
        .populate('activities.performedBy', 'firstName lastName')
        .populate('comments.author', 'firstName lastName')
        .populate('scheduledCalls.participants', 'firstName lastName email')
        .populate('scheduledCalls.createdBy', 'firstName lastName')
        .populate('followUps.createdBy', 'firstName lastName')
        .populate('interests.createdBy', 'firstName lastName')
        .populate('interests.deletedBy', 'firstName lastName')
        .populate('tasks.assignedTo', 'firstName lastName email')
        .populate('tasks.createdBy', 'firstName lastName')
        .populate('tasks.updatedBy', 'firstName lastName')
        .populate('leadSnapshot.notes.user', 'firstName lastName')
        .populate('leadSnapshot.notes.updatedBy', 'firstName lastName')
        .populate('leadSnapshot.notes.deletedBy', 'firstName lastName');

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasViewAll = user.permissions.includes('opportunities:view_all');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasViewAll && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta oportunidad'
        });
      }

      // Filtrar comentarios y actividades según visibilidad
      if (opportunity.originalAgent.toString() !== user.id && 
          !user.permissions.includes('opportunities:view_all')) {
        // Si no es el agente original, filtrar comentarios/actividades privadas
        opportunity.comments = opportunity.comments.filter(comment => comment.isVisibleToOriginalAgent);
        opportunity.activities = opportunity.activities.filter(activity => activity.isVisibleToOriginalAgent);
      }

      res.json({
        success: true,
        data: opportunity
      });
    } catch (error) {
      console.error('Error al obtener oportunidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear nueva oportunidad
  static async createOpportunity(req: Request, res: Response) {
    try {
      const user = (req as any).employee;
      const opportunityData = {
        ...req.body,
        originalAgent: user.id,
        transferredAt: new Date()
      };

      const opportunity = new Opportunity(opportunityData);
      await opportunity.save();

      await opportunity.populate('originalAgent', 'firstName lastName email');

      // Registrar auditoría
      await logAuditAction(
        req,
        'crear_oportunidad',
        `Oportunidad creada: ${opportunity.title || 'Sin título'}`,
        'oportunidad',
        (opportunity._id as mongoose.Types.ObjectId).toString(),
        undefined,
        sanitizeDataForAudit(opportunity.toObject()),
        'oportunidades'
      );

      res.status(201).json({
        success: true,
        data: opportunity,
        message: 'Oportunidad creada exitosamente'
      });
    } catch (error) {
      console.error('Error al crear oportunidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Transferir lead a oportunidad
  static async transferLeadToOpportunity(req: Request, res: Response) {
    try {
      console.log('=== INICIO transferLeadToOpportunity ===');
      console.log('Body recibido:', JSON.stringify(req.body, null, 2));
      console.log('Usuario:', (req as any).employee);
      
      const { 
        leadId, 
        leadInfo,
        title, 
        description, 
        estimatedValue, 
        expectedCloseDate,
        salesAgent,
        priority = 'media',
        probability = 50
      } = req.body;
      const user = (req as any).employee;
      
      console.log('leadId:', leadId);
      console.log('user:', user);
      
      if (!user) {
        console.error('Usuario no autenticado - req.employee es undefined');
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let lead = null;
      let leadSnapshot = null;

      if (leadId) {
        // Caso 1: Lead existente
        lead = await Lead.findById(leadId);
        if (!lead) {
          return res.status(404).json({
            success: false,
            message: 'Lead no encontrado'
          });
        }

        if (lead.movedToOpportunities) {
          return res.status(400).json({
            success: false,
            message: 'Este lead ya fue transferido a oportunidades'
          });
        }

        if (lead.currentStage !== 'Agenda Pendiente') {
          return res.status(400).json({
            success: false,
            message: 'Solo se pueden transferir leads con agenda pendiente'
          });
        }
      } else if (leadInfo) {
        // Caso 2: Crear nuevo lead
        if (!leadInfo.firstName || !leadInfo.lastName || !leadInfo.email) {
          return res.status(400).json({
            success: false,
            message: 'Información del lead incompleta (nombre, apellido y email son requeridos)'
          });
        }

        // Crear el nuevo lead
        lead = new Lead({
          firstName: leadInfo.firstName,
          lastName: leadInfo.lastName,
          email: leadInfo.email,
          phone: leadInfo.phone || '',
          company: leadInfo.company || '',
          position: leadInfo.position || '',
          industry: leadInfo.industry || '',
          companySize: leadInfo.companySize || '',
          website: leadInfo.website || '',
          instagram: leadInfo.instagram || '',
          twitter: leadInfo.twitter || '',
          linkedin: leadInfo.linkedin || '',
          facebook: leadInfo.facebook || '',
          address: leadInfo.address || '',
          city: leadInfo.city || '',
          state: leadInfo.state || '',
          country: leadInfo.country || '',
          postalCode: leadInfo.postalCode || '',
          source: leadInfo.source || 'web',
          interestedProducts: leadInfo.interestedProducts || [],
          estimatedBudget: leadInfo.estimatedBudget || undefined,
          tags: leadInfo.tags || [],
          status: 'agenda_pendiente',
          canMoveToSales: true,
          createdBy: user.id,
          assignedTo: user.id,
          captureDate: new Date(),
          initialScore: 50,
          currentStage: 'Agenda Pendiente',
          priority: 'media'
        });

        await lead.save();
      } else {
        return res.status(400).json({
          success: false,
          message: 'ID de lead o información del lead requerido'
        });
      }

      // Crear snapshot completo del lead
      leadSnapshot = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company || '',
        position: lead.position || '',
        industry: lead.industry || '',
        companySize: lead.companySize || '',
        website: lead.website || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        email: lead.email || '',
        instagram: lead.instagram || '',
        twitter: lead.twitter || '',
        linkedin: lead.linkedin || '',
        facebook: lead.facebook || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || '',
        postalCode: lead.postalCode || '',
        timezone: lead.timezone || '',
        source: lead.source || 'web',
        captureDate: lead.captureDate || new Date(),
        initialScore: lead.initialScore || 0,
        currentStage: lead.currentStage || '',
        status: lead.status || '',
        estimatedValue: lead.estimatedValue,
        priority: lead.priority || 'media',
        interestedProducts: lead.interestedProducts || [],
        estimatedBudget: lead.estimatedBudget,
        notes: (lead.notes || []).map(note => ({
          content: note.content,
          createdAt: note.createdAt,
          user: note.user
        })),
        attachments: lead.attachments || [],
        interactionHistory: (lead.interactionHistory || []).map(interaction => ({
          date: interaction.date,
          type: interaction.type,
          title: interaction.title,
          description: interaction.description,
          user: interaction.user
        })),
        tasks: (lead.tasks || []).map(task => ({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority,
          completedAt: task.completedAt,
          user: task.user,
          createdAt: task.createdAt
        })),
        documents: (lead.documents || []).map(doc => ({
          name: doc.name,
          description: doc.description,
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          tags: doc.tags || [],
          uploadDate: doc.uploadDate,
          user: doc.user,
          isExternalLink: doc.isExternalLink || false
        })),
        tags: lead.tags || [],
        categories: lead.categories || [],
        trackingStatus: lead.trackingStatus || '',
        preferredContactTime: lead.preferredContactTime || '',
        assignedTo: lead.assignedTo,
        createdBy: lead.createdBy || new mongoose.Types.ObjectId(user.id),
        createdAt: lead.createdAt || new Date()
      };

      // Crear la oportunidad
      const opportunity = new Opportunity({
        leadId: lead._id,
        leadSnapshot,
        title: title || `${lead.firstName} ${lead.lastName} - ${lead.company || 'Sin empresa'}`,
        description,
        status: 'nueva',
        estimatedValue: estimatedValue || lead.estimatedValue,
        expectedCloseDate,
        priority,
        probability,
        salesAgent: salesAgent ? new mongoose.Types.ObjectId(salesAgent) : undefined,
        originalAgent: new mongoose.Types.ObjectId(user.id),
        createdBy: new mongoose.Types.ObjectId(user.id),
        transferredAt: new Date(),
        activities: [],
        comments: [],
        commissionConfig: {
          agreed: false
        }
      });

      console.log('Intentando guardar oportunidad...');
      console.log('Datos de la oportunidad:', JSON.stringify(opportunity.toObject(), null, 2));
      
      try {
        await opportunity.save();
        console.log('Oportunidad guardada exitosamente');
      } catch (saveError: any) {
        console.error('Error al guardar oportunidad:', saveError);
        console.error('Validation errors:', saveError.errors);
        throw saveError;
      }

      // Eliminar el lead después de transferir todos los datos a la oportunidad
      console.log('Eliminando lead después de transferir datos...');
      await Lead.findByIdAndDelete(lead._id);
      console.log('Lead eliminado exitosamente después de la transferencia');

      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' }
      ]);

      res.status(201).json({
        success: true,
        opportunity: opportunity,
        message: 'Lead transferido a oportunidades exitosamente'
      });
    } catch (error: any) {
      console.error('Error al transferir lead:', error);
      console.error('Error stack:', error.stack);
      
      // Si es un error de validación de Mongoose
      if (error.name === 'ValidationError') {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({
          success: false,
          message: 'Error de validación: ' + Object.values(error.errors).map((e: any) => e.message).join(', ')
        });
      }
      
      // Si es un error de MongoDB
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        console.error('MongoDB error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Error de base de datos: ' + error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor: ' + error.message
      });
    }
  }

  // Asignar vendedor a oportunidad
  static async assignSalesAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { salesAgentId } = req.body;

      if (!salesAgentId || typeof salesAgentId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'ID de vendedor requerido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      opportunity.salesAgent = new mongoose.Types.ObjectId(salesAgentId);
      await opportunity.save();

      await opportunity.populate('salesAgent', 'firstName lastName email');

      res.json({
        success: true,
        data: opportunity,
        message: 'Vendedor asignado exitosamente'
      });
    } catch (error) {
      console.error('Error al asignar vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar colaborador
  static async addCollaborator(req: Request, res: Response) {
    try {
      console.log('🔄 Agregando colaborador - Params:', req.params);
      console.log('🔄 Agregando colaborador - Body:', req.body);
      
      const { id } = req.params;
      const { collaboratorId } = req.body;

      if (!collaboratorId || typeof collaboratorId !== 'string') {
        console.log('❌ Error: ID del colaborador no válido:', collaboratorId);
        return res.status(400).json({
          success: false,
          message: 'ID del colaborador es requerido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar que el colaborador no esté ya agregado
      if (opportunity.collaborators?.includes(new mongoose.Types.ObjectId(collaboratorId))) {
        return res.status(400).json({
          success: false,
          message: 'El empleado ya es colaborador de esta oportunidad'
        });
      }

      // Verificar que no sea el agente original o de ventas
      if (opportunity.originalAgent.toString() === collaboratorId || 
          opportunity.salesAgent?.toString() === collaboratorId) {
        return res.status(400).json({
          success: false,
          message: 'El empleado ya está asignado como agente principal'
        });
      }

      // Agregar colaborador
      if (!opportunity.collaborators) {
        opportunity.collaborators = [];
      }
      opportunity.collaborators.push(new mongoose.Types.ObjectId(collaboratorId));
      opportunity.updatedAt = new Date();

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadId', select: 'firstName lastName company email phone' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Colaborador agregado exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar colaborador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar comentario
  static async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, isVisibleToOriginalAgent = true } = req.body;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      const newComment = {
        author: user.id,
        content,
        isVisibleToOriginalAgent,
        createdAt: new Date()
      };

      opportunity.comments.push(newComment);
      await opportunity.save();

      await opportunity.populate('comments.author', 'firstName lastName');

      res.json({
        success: true,
        data: opportunity.comments[opportunity.comments.length - 1],
        message: 'Comentario agregado exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Editar comentario
  static async updateComment(req: Request, res: Response) {
    try {
      const { id, commentId } = req.params;
      const { content, isVisibleToOriginalAgent } = req.body;
      const user = (req as any).employee;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El contenido del comentario es requerido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Buscar el comentario
      const commentIndex = opportunity.comments.findIndex(comment => comment._id?.toString() === commentId);
      if (commentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Comentario no encontrado'
        });
      }

      const comment = opportunity.comments[commentIndex];

      // Verificar permisos - solo el autor o usuarios con permisos especiales pueden editar
      const hasUpdatePermission = user.permissions.includes('opportunities:comment') && user.permissions.includes('opportunities:update');
      const isAuthor = comment.author.toString() === user.id;

      if (!isAuthor && !hasUpdatePermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este comentario'
        });
      }

      // Actualizar el comentario
      opportunity.comments[commentIndex].content = content.trim();
      if (typeof isVisibleToOriginalAgent === 'boolean') {
        opportunity.comments[commentIndex].isVisibleToOriginalAgent = isVisibleToOriginalAgent;
      }

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Comentario editado`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'comments.author', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Comentario editado exitosamente'
      });
    } catch (error) {
      console.error('Error al editar comentario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar comentario
  static async deleteComment(req: Request, res: Response) {
    try {
      const { id, commentId } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Buscar el comentario
      const commentIndex = opportunity.comments.findIndex(comment => comment._id?.toString() === commentId);
      if (commentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Comentario no encontrado'
        });
      }

      const comment = opportunity.comments[commentIndex];

      // Verificar permisos - solo el autor o usuarios con permisos especiales pueden eliminar
      const hasDeletePermission = user.permissions.includes('opportunities:comment') && user.permissions.includes('opportunities:delete');
      const isAuthor = comment.author.toString() === user.id;

      if (!isAuthor && !hasDeletePermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este comentario'
        });
      }

      // Guardar información del comentario para la actividad
      const commentContent = comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '');

      // Eliminar el comentario
      opportunity.comments.splice(commentIndex, 1);

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Comentario eliminado: "${commentContent}"`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'comments.author', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Comentario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar actividad
  static async addActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, description, isVisibleToOriginalAgent = true } = req.body;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      const newActivity = {
        type,
        description,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent
      };

      opportunity.activities.push(newActivity);
      await opportunity.save();

      await opportunity.populate('activities.performedBy', 'firstName lastName');

      res.json({
        success: true,
        data: opportunity.activities[opportunity.activities.length - 1],
        message: 'Actividad agregada exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar estado
  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, closedAt } = req.body;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      opportunity.status = status;
      if (status === 'cerrada_ganada' || status === 'cerrada_perdida') {
        opportunity.closedAt = closedAt || new Date();
      }

      await opportunity.save();

      res.json({
        success: true,
        data: opportunity,
        message: 'Estado actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Confirmar agenda (cambiar de "Agenda Pendiente" a "Oportunidad Confirmada")
  static async confirmAgenda(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar que la etapa actual sea "Agenda Pendiente"
      if (opportunity.leadSnapshot.currentStage !== 'Agenda Pendiente') {
        return res.status(400).json({
          success: false,
          message: 'Solo se puede confirmar agenda cuando la etapa es "Agenda Pendiente"'
        });
      }

      // Cambiar la etapa a "Oportunidad Confirmada"
      opportunity.leadSnapshot.currentStage = 'Oportunidad Confirmada';
      opportunity.updatedAt = new Date();

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadId', select: 'firstName lastName company email phone' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Agenda confirmada exitosamente'
      });
    } catch (error) {
      console.error('Error al confirmar agenda:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agendar llamada
  static async scheduleCall(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, medium, scheduledDate, participants } = req.body;
      const user = (req as any).employee;

      if (!title || !medium || !scheduledDate || !participants || participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Título, medio, fecha y participantes son requeridos'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      const newCall = {
        title,
        description,
        medium,
        scheduledDate: new Date(scheduledDate),
        participants: participants.map((p: string) => new mongoose.Types.ObjectId(p)),
        status: 'programada' as 'programada',
        createdBy: user.id,
        createdAt: new Date()
      };

      opportunity.scheduledCalls.push(newCall);
      opportunity.updatedAt = new Date();

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'scheduledCalls.participants', select: 'firstName lastName email' },
        { path: 'scheduledCalls.createdBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity.scheduledCalls[opportunity.scheduledCalls.length - 1],
        message: 'Llamada agendada exitosamente'
      });
    } catch (error) {
      console.error('Error al agendar llamada:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar fechas (esperada o límite)
  static async updateDates(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { expectedCloseDate, deadlineDate } = req.body;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      if (expectedCloseDate !== undefined) {
        opportunity.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : undefined;
      }

      if (deadlineDate !== undefined) {
        opportunity.deadlineDate = deadlineDate ? new Date(deadlineDate) : undefined;
      }

      opportunity.updatedAt = new Date();
      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadId', select: 'firstName lastName company email phone' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Fechas actualizadas exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar fechas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear seguimiento
  static async createFollowUp(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, scheduledDate } = req.body;
      const user = (req as any).employee;

      if (!title || !scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Título y fecha programada son requeridos'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear seguimientos en esta oportunidad'
        });
      }

      // Crear seguimiento
      const followUp = {
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        status: 'pendiente' as const,
        createdBy: user.id,
        createdAt: new Date()
      };

      opportunity.followUps.push(followUp);

      // Agregar actividad
      opportunity.activities.push({
        type: 'seguimiento',
        description: `Seguimiento programado: ${title} para ${new Date(scheduledDate).toLocaleDateString()}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'followUps.createdBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Seguimiento creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear seguimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar estado de seguimiento
  static async updateFollowUpStatus(req: Request, res: Response) {
    try {
      const { id, followUpId } = req.params;
      const { status } = req.body;
      const user = (req as any).employee;

      if (!status || !['pendiente', 'completado', 'cancelado'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: pendiente, completado o cancelado'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar seguimientos en esta oportunidad'
        });
      }

      // Buscar el seguimiento
      const followUpIndex = opportunity.followUps.findIndex(fu => fu._id?.toString() === followUpId);
      if (followUpIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Seguimiento no encontrado'
        });
      }

      const followUp = opportunity.followUps[followUpIndex];
      const oldStatus = followUp.status;
      followUp.status = status as 'pendiente' | 'completado' | 'cancelado';

      // Agregar actividad
      const statusLabels: Record<string, string> = {
        'pendiente': 'pendiente',
        'completado': 'completado',
        'cancelado': 'cancelado'
      };

      opportunity.activities.push({
        type: 'seguimiento',
        description: `Seguimiento "${followUp.title}" marcado como ${statusLabels[status]}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'followUps.createdBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: `Seguimiento marcado como ${statusLabels[status]} exitosamente`
      });
    } catch (error) {
      console.error('Error al actualizar estado de seguimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Editar seguimiento
  static async updateFollowUp(req: Request, res: Response) {
    try {
      const { id, followUpId } = req.params;
      const { title, description, scheduledDate } = req.body;
      const user = (req as any).employee;

      if (!title || !scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Título y fecha programada son requeridos'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar seguimientos en esta oportunidad'
        });
      }

      // Buscar el seguimiento
      const followUpIndex = opportunity.followUps.findIndex(fu => fu._id?.toString() === followUpId);
      if (followUpIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Seguimiento no encontrado'
        });
      }

      const followUp = opportunity.followUps[followUpIndex];
      const oldTitle = followUp.title;
      const oldDate = followUp.scheduledDate;

      // Actualizar campos
      followUp.title = title;
      followUp.description = description;
      followUp.scheduledDate = new Date(scheduledDate);

      // Agregar actividad
      opportunity.activities.push({
        type: 'seguimiento',
        description: `Seguimiento editado: "${oldTitle}" → "${title}" (${new Date(scheduledDate).toLocaleDateString()})`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'followUps.createdBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Seguimiento editado exitosamente'
      });
    } catch (error) {
      console.error('Error al editar seguimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar oportunidad
  static async updateOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Obtener datos anteriores para auditoría
      const previousOpportunity = await Opportunity.findById(id);
      if (!previousOpportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      const opportunity = await Opportunity.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true }
      ).populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadId', select: 'firstName lastName company email phone' }
      ]);

      // Registrar auditoría
      await logAuditAction(
        req,
        'actualizar_oportunidad',
        `Oportunidad actualizada: ${opportunity?.title || 'Sin título'}`,
        'oportunidad',
        id,
        sanitizeDataForAudit(previousOpportunity.toObject()),
        sanitizeDataForAudit(opportunity?.toObject()),
        'oportunidades'
      );

      res.json({
        success: true,
        data: opportunity,
        message: 'Oportunidad actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar oportunidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar oportunidad
  static async deleteOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Obtener datos antes de eliminar para auditoría
      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      await Opportunity.findByIdAndDelete(id);

      // Revertir cambios en el lead
      if (opportunity.leadId) {
        await Lead.findByIdAndUpdate(opportunity.leadId, {
          movedToOpportunities: false,
          opportunityId: null,
          canMoveToSales: true
        });
      }

      // Registrar auditoría
      await logAuditAction(
        req,
        'eliminar_oportunidad',
        `Oportunidad eliminada: ${opportunity.title || 'Sin título'}`,
        'oportunidad',
        id,
        sanitizeDataForAudit(opportunity.toObject()),
        undefined,
        'oportunidades'
      );

      res.json({
        success: true,
        message: 'Oportunidad eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar oportunidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener oportunidades transferidas por el usuario
  static async getMyTransferredOpportunities(req: Request, res: Response) {
    try {
      const user = (req as any).employee;
      const { page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const opportunities = await Opportunity.find({ originalAgent: user.id })
        .populate('salesAgent', 'firstName lastName email')
        .populate('leadId', 'firstName lastName company email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Opportunity.countDocuments({ originalAgent: user.id });

      res.json({
        success: true,
        data: opportunities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener oportunidades transferidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener oportunidades asignadas al usuario
  static async getMyAssignedOpportunities(req: Request, res: Response) {
    try {
      const user = (req as any).employee;
      const { page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const opportunities = await Opportunity.find({ salesAgent: user.id })
        .populate('originalAgent', 'firstName lastName email')
        .populate('leadId', 'firstName lastName company email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Opportunity.countDocuments({ salesAgent: user.id });

      res.json({
        success: true,
        data: opportunities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener oportunidades asignadas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener reportes de oportunidades
  static async getOpportunityReports(req: Request, res: Response) {
    try {
      const user = (req as any).employee;

      // Estadísticas básicas
      const totalOpportunities = await Opportunity.countDocuments();
      const openOpportunities = await Opportunity.countDocuments({
        status: { $nin: ['cerrada_ganada', 'cerrada_perdida'] }
      });
      const closedWon = await Opportunity.countDocuments({ status: 'cerrada_ganada' });
      const closedLost = await Opportunity.countDocuments({ status: 'cerrada_perdida' });

      // Estadísticas por usuario si no tiene permiso view_all
      let userFilter = {};
      if (!user.permissions.includes('opportunities:view_all')) {
        userFilter = {
          $or: [
            { originalAgent: user.id },
            { salesAgent: user.id }
          ]
        };
      }

      const userOpportunities = await Opportunity.countDocuments(userFilter);
      const userClosedWon = await Opportunity.countDocuments({
        ...userFilter,
        status: 'cerrada_ganada'
      });

      // Pipeline de ventas por estado
      const pipeline = await Opportunity.aggregate([
        { $match: userFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$estimatedValue' } } }
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            total: totalOpportunities,
            open: openOpportunities,
            closedWon,
            closedLost,
            conversionRate: totalOpportunities > 0 ? (closedWon / totalOpportunities) * 100 : 0
          },
          userStats: {
            total: userOpportunities,
            closedWon: userClosedWon,
            conversionRate: userOpportunities > 0 ? (userClosedWon / userOpportunities) * 100 : 0
          },
          pipeline
        }
      });
    } catch (error) {
      console.error('Error al obtener reportes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear interés
  static async createInterest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, approximateBudget } = req.body;
      const user = (req as any).employee;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El título es requerido'
        });
      }

      // Validar presupuesto si se proporciona
      if (approximateBudget !== undefined && (approximateBudget < 0 || isNaN(approximateBudget))) {
        return res.status(400).json({
          success: false,
          message: 'El presupuesto debe ser un número positivo'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para agregar intereses en esta oportunidad'
        });
      }

      // Crear interés
      const interest = {
        title: title.trim(),
        description: description?.trim(),
        approximateBudget: approximateBudget || undefined,
        createdBy: user.id,
        createdAt: new Date()
      };

      opportunity.interests.push(interest);

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Interés agregado: ${title.trim()}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'interests.createdBy', select: 'firstName lastName' },
        { path: 'interests.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Interés agregado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear interés:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Editar interés
  static async updateInterest(req: Request, res: Response) {
    try {
      const { id, interestId } = req.params;
      const { title, description, approximateBudget } = req.body;
      const user = (req as any).employee;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El título es requerido'
        });
      }

      // Validar presupuesto si se proporciona
      if (approximateBudget !== undefined && (approximateBudget < 0 || isNaN(approximateBudget))) {
        return res.status(400).json({
          success: false,
          message: 'El presupuesto debe ser un número positivo'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar intereses en esta oportunidad'
        });
      }

      // Buscar el interés
      const interestIndex = opportunity.interests.findIndex(interest => 
        interest._id?.toString() === interestId && !interest.deletedAt
      );
      
      if (interestIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Interés no encontrado'
        });
      }

      const interest = opportunity.interests[interestIndex];
      const oldTitle = interest.title;

      // Actualizar el interés
      opportunity.interests[interestIndex].title = title.trim();
      opportunity.interests[interestIndex].description = description?.trim();
      opportunity.interests[interestIndex].approximateBudget = approximateBudget || undefined;

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Interés editado: "${oldTitle}" → "${title.trim()}"`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'interests.createdBy', select: 'firstName lastName' },
        { path: 'interests.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Interés editado exitosamente'
      });
    } catch (error) {
      console.error('Error al editar interés:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar interés (soft delete)
  static async deleteInterest(req: Request, res: Response) {
    try {
      const { id, interestId } = req.params;
      const { reason } = req.body;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar intereses en esta oportunidad'
        });
      }

      // Buscar el interés
      const interestIndex = opportunity.interests.findIndex(interest => 
        interest._id?.toString() === interestId && !interest.deletedAt
      );
      
      if (interestIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Interés no encontrado'
        });
      }

      const interest = opportunity.interests[interestIndex];

      // Marcar como eliminado (soft delete)
      opportunity.interests[interestIndex].deletedAt = new Date();
      opportunity.interests[interestIndex].deletedBy = user.id;
      opportunity.interests[interestIndex].deletionReason = reason?.trim() || '';

      // Agregar actividad
      const reasonText = reason?.trim() ? ` (Razón: ${reason.trim()})` : '';
      opportunity.activities.push({
        type: 'nota',
        description: `Interés eliminado: "${interest.title}"${reasonText}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'interests.createdBy', select: 'firstName lastName' },
        { path: 'interests.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Interés eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar interés:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear nota del lead
  static async createLeadNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const user = (req as any).employee;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El contenido de la nota es requerido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para agregar notas en esta oportunidad'
        });
      }

      // Crear nota
      const note = {
        content: content.trim(),
        createdAt: new Date(),
        user: user.id
      };

      if (!opportunity.leadSnapshot.notes) {
        opportunity.leadSnapshot.notes = [];
      }
      opportunity.leadSnapshot.notes.push(note);

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Nota del lead agregada: ${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadSnapshot.notes.user', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.updatedBy', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Nota agregada exitosamente'
      });
    } catch (error) {
      console.error('Error al crear nota del lead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Editar nota del lead
  static async updateLeadNote(req: Request, res: Response) {
    try {
      const { id, noteId } = req.params;
      const { content } = req.body;
      const user = (req as any).employee;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El contenido de la nota es requerido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar notas en esta oportunidad'
        });
      }

      // Buscar la nota
      const noteIndex = opportunity.leadSnapshot.notes?.findIndex(note => 
        note._id?.toString() === noteId && !note.deletedAt
      );
      
      if (noteIndex === -1 || noteIndex === undefined) {
        return res.status(404).json({
          success: false,
          message: 'Nota no encontrada'
        });
      }

      const note = opportunity.leadSnapshot.notes![noteIndex];
      const oldContent = note.content;

      // Actualizar la nota
      opportunity.leadSnapshot.notes![noteIndex].content = content.trim();
      opportunity.leadSnapshot.notes![noteIndex].updatedAt = new Date();
      opportunity.leadSnapshot.notes![noteIndex].updatedBy = user.id;

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Nota del lead editada: "${oldContent.substring(0, 30)}..." → "${content.trim().substring(0, 30)}..."`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadSnapshot.notes.user', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.updatedBy', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Nota editada exitosamente'
      });
    } catch (error) {
      console.error('Error al editar nota del lead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar nota del lead (soft delete)
  static async deleteLeadNote(req: Request, res: Response) {
    try {
      const { id, noteId } = req.params;
      const { reason } = req.body;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar notas en esta oportunidad'
        });
      }

      // Buscar la nota
      const noteIndex = opportunity.leadSnapshot.notes?.findIndex(note => 
        note._id?.toString() === noteId && !note.deletedAt
      );
      
      if (noteIndex === -1 || noteIndex === undefined) {
        return res.status(404).json({
          success: false,
          message: 'Nota no encontrada'
        });
      }

      const note = opportunity.leadSnapshot.notes![noteIndex];

      // Marcar como eliminada (soft delete)
      opportunity.leadSnapshot.notes![noteIndex].deletedAt = new Date();
      opportunity.leadSnapshot.notes![noteIndex].deletedBy = user.id;
      opportunity.leadSnapshot.notes![noteIndex].deletionReason = reason?.trim() || '';

      // Agregar actividad
      const reasonText = reason?.trim() ? ` (Razón: ${reason.trim()})` : '';
      opportunity.activities.push({
        type: 'nota',
        description: `Nota del lead eliminada: "${note.content.substring(0, 50)}..."${reasonText}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'leadSnapshot.notes.user', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.updatedBy', select: 'firstName lastName' },
        { path: 'leadSnapshot.notes.deletedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Nota eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar nota del lead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear nueva tarea
  static async createTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, dueDate, priority, assignedTo } = req.body;
      const user = (req as any).employee;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El título de la tarea es requerido'
        });
      }

      if (!dueDate) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de vencimiento es requerida'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear tareas en esta oportunidad'
        });
      }

      // Crear nueva tarea
      const newTask = {
        _id: new mongoose.Types.ObjectId(),
        title: title.trim(),
        description: description?.trim() || '',
        dueDate: new Date(dueDate),
        status: 'pendiente' as const,
        priority: priority || 'media',
        assignedTo: assignedTo || null,
        createdBy: user.id,
        createdAt: new Date()
      };

      opportunity.tasks.push(newTask);

      // Agregar actividad
      const assignedText = assignedTo ? ` (Asignada a empleado)` : '';
      opportunity.activities.push({
        type: 'nota',
        description: `Nueva tarea creada: "${title.trim()}"${assignedText}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'tasks.assignedTo', select: 'firstName lastName email' },
        { path: 'tasks.createdBy', select: 'firstName lastName' },
        { path: 'tasks.updatedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Tarea creada exitosamente'
      });
    } catch (error) {
      console.error('Error al crear tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar tarea
  static async updateTask(req: Request, res: Response) {
    try {
      const { id, taskId } = req.params;
      const { title, description, dueDate, priority, assignedTo, status } = req.body;
      const user = (req as any).employee;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El título de la tarea es requerido'
        });
      }

      if (!dueDate) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de vencimiento es requerida'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar tareas en esta oportunidad'
        });
      }

      // Buscar la tarea
      const taskIndex = opportunity.tasks.findIndex(task => 
        task._id?.toString() === taskId
      );
      
      if (taskIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      const oldTask = opportunity.tasks[taskIndex];

      // Actualizar la tarea
      opportunity.tasks[taskIndex].title = title.trim();
      opportunity.tasks[taskIndex].description = description?.trim() || '';
      opportunity.tasks[taskIndex].dueDate = new Date(dueDate);
      opportunity.tasks[taskIndex].priority = priority || 'media';
      opportunity.tasks[taskIndex].assignedTo = assignedTo || null;
      opportunity.tasks[taskIndex].updatedAt = new Date();
      opportunity.tasks[taskIndex].updatedBy = user.id;

      // Si se cambió el status a completada, agregar fecha de completado
      if (status && status !== oldTask.status) {
        opportunity.tasks[taskIndex].status = status;
        if (status === 'completada') {
          opportunity.tasks[taskIndex].completedAt = new Date();
        } else {
          opportunity.tasks[taskIndex].completedAt = undefined;
        }
      }

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Tarea actualizada: "${title.trim()}"`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'tasks.assignedTo', select: 'firstName lastName email' },
        { path: 'tasks.createdBy', select: 'firstName lastName' },
        { path: 'tasks.updatedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Tarea actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar tarea
  static async deleteTask(req: Request, res: Response) {
    try {
      const { id, taskId } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar tareas en esta oportunidad'
        });
      }

      // Buscar la tarea
      const taskIndex = opportunity.tasks.findIndex(task => 
        task._id?.toString() === taskId
      );
      
      if (taskIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      const task = opportunity.tasks[taskIndex];

      // Eliminar la tarea
      opportunity.tasks.splice(taskIndex, 1);

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Tarea eliminada: "${task.title}"`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'tasks.assignedTo', select: 'firstName lastName email' },
        { path: 'tasks.createdBy', select: 'firstName lastName' },
        { path: 'tasks.updatedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Tarea eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar estado de tarea
  static async updateTaskStatus(req: Request, res: Response) {
    try {
      const { id, taskId } = req.params;
      const { status } = req.body;
      const user = (req as any).employee;

      if (!['pendiente', 'en_progreso', 'completada', 'cancelada'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de tarea inválido'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar tareas en esta oportunidad'
        });
      }

      // Buscar la tarea
      const taskIndex = opportunity.tasks.findIndex(task => 
        task._id?.toString() === taskId
      );
      
      if (taskIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      const oldStatus = opportunity.tasks[taskIndex].status;
      
      // Actualizar estado de la tarea
      opportunity.tasks[taskIndex].status = status;
      opportunity.tasks[taskIndex].updatedAt = new Date();
      opportunity.tasks[taskIndex].updatedBy = user.id;

      // Añadir fecha de completado según corresponda
      if (status === 'completada') {
        opportunity.tasks[taskIndex].completedAt = new Date();
      } else {
        opportunity.tasks[taskIndex].completedAt = undefined;
      }

      // Agregar actividad
      const statusLabels: { [key: string]: string } = {
        'pendiente': 'Pendiente',
        'en_progreso': 'En Progreso',
        'completada': 'Completada',
        'cancelada': 'Cancelada'
      };

      opportunity.activities.push({
        type: 'nota',
        description: `Estado de tarea "${opportunity.tasks[taskIndex].title}" cambiado de ${statusLabels[oldStatus]} a ${statusLabels[status]}`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'tasks.assignedTo', select: 'firstName lastName email' },
        { path: 'tasks.createdBy', select: 'firstName lastName' },
        { path: 'tasks.updatedBy', select: 'firstName lastName' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Estado de tarea actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar estado de tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar probabilidad
  static async updateProbability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { probability } = req.body;
      const user = (req as any).employee;

      // Validar probabilidad
      if (typeof probability !== 'number' || probability < 0 || probability > 100) {
        return res.status(400).json({
          success: false,
          message: 'La probabilidad debe ser un número entre 0 y 100'
        });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUpdatePermission = user.permissions.includes('opportunities:update');
      const isOwner = opportunity.originalAgent.toString() === user.id || 
                     opportunity.salesAgent?.toString() === user.id;

      if (!hasUpdatePermission && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar esta oportunidad'
        });
      }

      const oldProbability = opportunity.probability;
      opportunity.probability = probability;

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Probabilidad actualizada de ${oldProbability}% a ${probability}%`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Probabilidad actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar probabilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Desasignar vendedor principal
  static async unassignSalesAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUnassignPermission = user.permissions.includes('opportunities:unassign');
      if (!hasUnassignPermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para desasignar esta oportunidad'
        });
      }

      if (!opportunity.salesAgent) {
        return res.status(400).json({
          success: false,
          message: 'No hay vendedor asignado a esta oportunidad'
        });
      }

      const previousAgent = opportunity.salesAgent;
      opportunity.salesAgent = undefined;

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Vendedor principal desasignado`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Vendedor principal desasignado exitosamente'
      });
    } catch (error) {
      console.error('Error al desasignar vendedor principal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Remover colaborador específico
  static async removeCollaborator(req: Request, res: Response) {
    try {
      const { id, collaboratorId } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUnassignPermission = user.permissions.includes('opportunities:unassign');
      if (!hasUnassignPermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para desasignar colaboradores de esta oportunidad'
        });
      }

      // Verificar si el colaborador existe en la oportunidad
      const collaboratorIndex = opportunity.collaborators?.findIndex(
        collab => collab.toString() === collaboratorId
      ) ?? -1;

      if (collaboratorIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Colaborador no encontrado en esta oportunidad'
        });
      }

      // Remover el colaborador
      if (opportunity.collaborators) {
        opportunity.collaborators.splice(collaboratorIndex, 1);
      }

      // Agregar actividad
      opportunity.activities.push({
        type: 'nota',
        description: `Colaborador removido de la oportunidad`,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Colaborador removido exitosamente'
      });
    } catch (error) {
      console.error('Error al remover colaborador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Desasignar todos los empleados (vendedor y colaboradores)
  static async unassignAll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).employee;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: 'Oportunidad no encontrada'
        });
      }

      // Verificar permisos
      const hasUnassignPermission = user.permissions.includes('opportunities:unassign');
      if (!hasUnassignPermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para desasignar esta oportunidad'
        });
      }

      const hadSalesAgent = !!opportunity.salesAgent;
      const collaboratorCount = opportunity.collaborators?.length || 0;

      if (!hadSalesAgent && collaboratorCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay empleados asignados a esta oportunidad'
        });
      }

      // Desasignar vendedor y colaboradores
      opportunity.salesAgent = undefined;
      opportunity.collaborators = [];

      // Agregar actividad
      let description = 'Todos los empleados desasignados de la oportunidad';
      if (hadSalesAgent && collaboratorCount > 0) {
        description = `Vendedor principal y ${collaboratorCount} colaborador(es) desasignados`;
      } else if (hadSalesAgent) {
        description = 'Vendedor principal desasignado';
      } else if (collaboratorCount > 0) {
        description = `${collaboratorCount} colaborador(es) desasignados`;
      }

      opportunity.activities.push({
        type: 'nota',
        description,
        performedBy: user.id,
        date: new Date(),
        isVisibleToOriginalAgent: true
      });

      await opportunity.save();

      // Poblar los datos para la respuesta
      await opportunity.populate([
        { path: 'originalAgent', select: 'firstName lastName email' },
        { path: 'salesAgent', select: 'firstName lastName email' },
        { path: 'collaborators', select: 'firstName lastName email department position' },
        { path: 'activities.performedBy', select: 'firstName lastName' }
      ]);

      res.json({
        success: true,
        data: opportunity,
        message: 'Todos los empleados desasignados exitosamente'
      });
    } catch (error) {
      console.error('Error al desasignar todos los empleados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
} 