import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Client, IClient } from '../models/Client';
import { Lead } from '../models/Lead';
import mongoose from 'mongoose';

export const getClients: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const {
      status,
      type,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (type) query.type = type;

    // Búsqueda por texto
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [clients, total] = await Promise.all([
      Client.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Client.countDocuments(query)
    ]);

    res.json({
      data: clients,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

export const getClientById: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('interactions.user', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const createClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const employeeId = req.employee?._id || req.user?._id;
      
    if (!employeeId) {
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }
    
    const clientData = {
      ...req.body,
      createdBy: employeeId as mongoose.Types.ObjectId
    };

    const client = new Client(clientData);
    await client.save();

    const populatedClient = await Client.findById(client._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(populatedClient);
  } catch (error) {
    next(error);
  }
};

export const updateClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('interactions.user', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const convertLeadToClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    // Añadir diagnóstico para ver los datos de la solicitud
    console.log('[convertLeadToClient] Iniciando conversión:', {
      leadId: req.params.id,
      type: req.body.type,
      employeeId: req.employee?._id || req.user?._id,  // Buscar en ambos lugares
      employeeData: req.employee ? { id: req.employee._id, email: req.employee.email } : 'No disponible'
    });

    const { type } = req.body;
    
    // Verificar que el tipo es válido
    if (!type || (type !== 'personal' && type !== 'business')) {
      res.status(400).json({ message: 'Tipo de cliente no válido. Debe ser "personal" o "business"' });
      return;
    }
    
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      console.log('[convertLeadToClient] Lead no encontrado:', req.params.id);
      res.status(404).json({ message: 'Lead no encontrado' });
      return;
    }

    console.log('[convertLeadToClient] Lead encontrado:', {
      leadId: lead._id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email
    });
    
    // Obtener el ID del empleado autenticado de req.employee o req.user
    const employeeId = req.employee?._id || req.user?._id;
    
    // Asegurarnos de que el empleado está disponible
    if (!employeeId) {
      console.log('[convertLeadToClient] Empleado no disponible en la solicitud');
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }

    // Verificar que el lead tiene email, que es requerido para Client
    if (!lead.email) {
      console.log('[convertLeadToClient] El lead no tiene email, que es requerido para cliente');
      res.status(400).json({ message: 'El lead debe tener un email para convertirlo a cliente' });
      return;
    }

    console.log('[convertLeadToClient] Empleado identificado:', employeeId);

    // Crear el objeto clientData con valores por defecto para evitar undefined
    const clientData: Partial<IClient> = {
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      email: lead.email,
      phone: lead.phone || "",
      type: type,
      businessName: type === 'business' ? (lead.company || "") : "",
      industry: type === 'business' ? (lead.industry || "") : "",
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
      createdBy: employeeId as mongoose.Types.ObjectId
    };

    console.log('[convertLeadToClient] Datos de cliente preparados:', {
      name: clientData.name,
      email: clientData.email,
      type: clientData.type,
      createdBy: clientData.createdBy
    });

    if (type === 'business') {
      clientData.representatives = [{
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        email: lead.email,
        phone: lead.phone || "",
        position: lead.position || ""
      }];
    }

    const client = new Client(clientData);
    
    console.log('[convertLeadToClient] Guardando cliente...');
    await client.save();
    console.log('[convertLeadToClient] Cliente guardado con ID:', client._id);

    console.log('[convertLeadToClient] Eliminando lead original...');
    await Lead.findByIdAndDelete(req.params.id);
    console.log('[convertLeadToClient] Lead eliminado correctamente');

    res.json({ 
      message: 'Lead convertido a cliente exitosamente',
      clientId: client._id
    });
  } catch (error) {
    console.error('[convertLeadToClient] Error detallado:', error);
    next(error);
  }
};

// Buscar clientes
export const searchClients: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { query } = req.query;
    const searchQuery = query ? {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { businessName: { $regex: query, $options: 'i' } }
      ]
    } : {};

    const clients = await Client.find(searchQuery)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(clients);
  } catch (error) {
    next(error);
  }
};

export const convertClientToLead: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    console.log('Iniciando conversión de cliente a lead para ID:', req.params.id);
    
    const client = await Client.findById(req.params.id);
    console.log('Cliente encontrado:', client ? 'Sí' : 'No');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    // Extraer el nombre completo y dividirlo en firstName y lastName
    const nameParts = client.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('Datos extraídos:', { firstName, lastName, email: client.email });
    
    // Obtener el ID del empleado autenticado
    const employeeId = req.employee?._id || req.user?._id;
    
    // Asegurarnos de que el empleado está disponible
    if (!employeeId) {
      console.log('Error: No se pudo identificar al empleado autenticado');
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }
    
    console.log('Empleado identificado:', employeeId);

    // Crear el lead con los datos del cliente
    const leadData = {
      firstName,
      lastName,
      email: client.email,
      phone: client.phone || "",
      company: client.type === 'business' ? client.businessName : "",
      industry: client.industry || "",
      website: client.website || "",
      instagram: client.instagram || "",
      twitter: client.twitter || "",
      linkedin: client.linkedin || "",
      facebook: client.facebook || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      country: client.country || "",
      postalCode: client.postalCode || "",
      status: "active",
      createdBy: employeeId as mongoose.Types.ObjectId,
      currentStage: "nuevo",
      source: "conversión de cliente",
      priority: "media",
      captureDate: new Date(),
      initialScore: 0,
      interactionHistory: [{
        date: new Date(),
        type: "status_change",
        description: "Lead creado por conversión de cliente",
        user: employeeId as mongoose.Types.ObjectId
      }]
    };

    console.log('Creando nuevo lead con datos:', leadData);

    const lead = new Lead(leadData);
    await lead.save();
    console.log('Lead creado exitosamente con ID:', lead._id);

    // Eliminar el cliente
    await Client.findByIdAndDelete(req.params.id);
    console.log('Cliente eliminado exitosamente');

    res.json({ 
      message: 'Cliente convertido a lead exitosamente',
      leadId: lead._id
    });
  } catch (error) {
    console.error('Error detallado en convertClientToLead:', error);
    next(error);
  }
};

// Activar un cliente
export const activateClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    
    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }
    
    res.json(client);
  } catch (error) {
    next(error);
  }
};

// Desactivar un cliente
export const deactivateClient: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    
    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }
    
    res.json(client);
  } catch (error) {
    next(error);
  }
};

// Toggle estado del cliente (activo/inactivo)
export const toggleClientStatus: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }
    
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true }
    );
    
    res.json(updatedClient);
  } catch (error) {
    next(error);
  }
};

// Manejo de interacciones (actividades)
export const addInteraction: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const employeeId = req.employee?._id || req.user?._id;
    
    if (!employeeId) {
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }
    
    const { type, title, description, date } = req.body;
    
    const newInteraction = {
      type,
      title,
      description,
      date: new Date(date),
      user: employeeId as mongoose.Types.ObjectId
    };

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $push: { interactions: newInteraction } },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('interactions.user', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const updateInteraction: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { type, title, description, date } = req.body;
    
    const client = await Client.findOneAndUpdate(
      { 
        _id: req.params.id,
        'interactions._id': req.params.interactionId 
      },
      { 
        $set: { 
          'interactions.$.type': type,
          'interactions.$.title': title,
          'interactions.$.description': description,
          'interactions.$.date': new Date(date)
        } 
      },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('interactions.user', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente o interacción no encontrada' });
      return;
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteInteraction: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $pull: { interactions: { _id: req.params.interactionId } } },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('interactions.user', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

// Manejo de documentos
export const addDocument: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const employeeId = req.employee?._id || req.user?._id;
    
    if (!employeeId) {
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }
    
    // Aquí iría la lógica para subir el archivo a un servicio de almacenamiento como S3
    // Por ahora, simplemente simularemos la URL del archivo
    const { name, description } = req.body;
    const fileUrl = `https://example.com/files/${Date.now()}-${name}`;
    
    const newDocument = {
      name,
      description,
      fileUrl,
      user: employeeId as mongoose.Types.ObjectId,
      createdAt: new Date()
    };

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: newDocument } },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $pull: { documents: { _id: req.params.documentId } } },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    // Aquí iría la lógica para eliminar el archivo del servicio de almacenamiento

    res.json(client);
  } catch (error) {
    next(error);
  }
}; 