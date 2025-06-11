import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface ITask extends Document {
  title: string;
  description: string;
  campaign: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  completedAt?: Date;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const TaskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true
  },
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: [true, 'La campaña es requerida']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El responsable es requerido']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: [true, 'La fecha de vencimiento es requerida']
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
TaskSchema.index({ title: 1 });
TaskSchema.index({ campaign: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ dueDate: 1 });

// Hooks para auditoría

// Hook para capturar creación
TaskSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'tarea';
    // @ts-ignore
    doc._auditDescription = `Nueva tarea creada: ${doc.title}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
TaskSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
TaskSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'tarea';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de tarea: ${doc.title} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para cambios de estado
TaskSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.status !== originalDoc.status) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'cambio_estado';
    // @ts-ignore
    doc._auditTargetType = 'tarea';
    // @ts-ignore
    doc._auditDescription = `Cambio de estado de tarea: ${doc.title} (${originalDoc.status} → ${doc.status})`;
  }
});

// Hook específico para asignaciones
TaskSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.assignedTo?.toString() !== originalDoc.assignedTo?.toString()) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'asignación';
    // @ts-ignore
    doc._auditTargetType = 'tarea';
    // @ts-ignore
    doc._auditDescription = `Reasignación de tarea: ${doc.title}`;
  }
});

export const Task = mongoose.model<ITask>('Task', TaskSchema); 