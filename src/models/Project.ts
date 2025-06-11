import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IProject extends Document {
  name: string;
  description: string;
  client: mongoose.Types.ObjectId;
  status: 'pending' | 'planning' | 'active' | 'in_progress' | 'completed' | 'paused' | 'canceled';
  priority?: 'low' | 'medium' | 'high';
  startDate: Date;
  endDate?: Date;
  progress: number;
  team: mongoose.Types.ObjectId[];
  budget: number;
  objectives: string[];
  deliverables: {
    name: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
    completedAt?: Date;
  }[];
  tasks: mongoose.Types.ObjectId[];
  documents: {
    name: string;
    description: string;
    type: string;
    url: string;
    size: number;
    tags: string[];
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  manager?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  totalHours?: number;
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido']
  },
  status: {
    type: String,
    enum: ['pending', 'planning', 'active', 'in_progress', 'completed', 'paused', 'canceled'],
    default: 'in_progress'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  team: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  budget: {
    type: Number,
    required: [true, 'El presupuesto es requerido'],
    min: [0, 'El presupuesto no puede ser negativo']
  },
  objectives: [{
    type: String,
    trim: true
  }],
  deliverables: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    completedAt: {
      type: Date
    }
  }],
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'ProjectTask'
  }],
  documents: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['contract', 'proposal', 'invoice', 'report', 'specification', 'design', 'image', 'other'],
      default: 'other'
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 0
    },
    tags: [{
      type: String,
      trim: true
    }],
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  totalHours: {
    type: Number
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ client: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ team: 1 });

// Almacenar el documento original para comparar cambios
ProjectSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore - el this está definido en el contexto de Mongoose
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._originalDoc = docToUpdate.toObject();
  }
});

// Hooks para auditoría

// Capturar información para auditoría durante creación
ProjectSchema.post('save', function(doc) {
  if (doc && doc.isNew) {
    // Almacenar datos sanitizados para auditoría
    // @ts-ignore - extender el documento con propiedad personalizada
    doc._auditNewData = sanitizeDataForAudit(doc);
    // @ts-ignore
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'proyecto';
    // @ts-ignore
    doc._auditDescription = `Creación de proyecto: ${doc.name}`;
  }
});

// Capturar información para auditoría durante actualización
ProjectSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc) {
    const sanitizedOldDoc = sanitizeDataForAudit(originalDoc);
    const sanitizedNewDoc = sanitizeDataForAudit(doc);
    const changedFields = getChangedFields(sanitizedOldDoc, sanitizedNewDoc);
    
    if (changedFields.length > 0) {
      // @ts-ignore - extender el documento con propiedades personalizadas
      doc._auditPreviousData = sanitizedOldDoc;
      // @ts-ignore
      doc._auditNewData = sanitizedNewDoc;
      // @ts-ignore
      doc._auditAction = 'actualización';
      // @ts-ignore
      doc._auditTargetType = 'proyecto';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de proyecto: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Capturar información para auditoría durante eliminación
ProjectSchema.pre('findOneAndDelete', async function() {
  // @ts-ignore
  const docToDelete = await this.model.findOne(this.getQuery());
  if (docToDelete) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._deletedDoc = sanitizeDataForAudit(docToDelete);
    // @ts-ignore
    this._auditAction = 'eliminación';
    // @ts-ignore
    this._auditTargetType = 'proyecto';
    // @ts-ignore
    this._auditDescription = `Eliminación de proyecto: ${docToDelete.name}`;
  }
});

// Hooks específicos para cambios de estado
ProjectSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.status !== originalDoc.status) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'cambio_estado';
    // @ts-ignore
    doc._auditTargetType = 'proyecto';
    // @ts-ignore
    doc._auditDescription = `Cambio de estado de proyecto: ${doc.name} (${originalDoc.status} → ${doc.status})`;
  }
});

// Hook para cambios en el progreso
ProjectSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.progress !== originalDoc.progress) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'actualización_progreso';
    // @ts-ignore
    doc._auditTargetType = 'proyecto';
    // @ts-ignore
    doc._auditDescription = `Actualización de progreso en proyecto: ${doc.name} (${originalDoc.progress}% → ${doc.progress}%)`;
  }
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema); 