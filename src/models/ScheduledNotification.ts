import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IScheduledNotification extends Document {
  title: string;
  message: string;
  type: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead';
  priority: 'low' | 'medium' | 'high';
  entityType?: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'lead' | 'other';
  entityId?: string;
  employeeId: mongoose.Types.ObjectId;
  scheduledFor: Date;
  executed: boolean;
  executedAt?: Date;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  nextExecution?: Date;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledNotificationSchema = new Schema<IScheduledNotification>({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system', 'lead'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    default: 'medium'
  },
  entityType: {
    type: String,
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system', 'lead', 'other']
  },
  entityId: {
    type: String
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  executed: {
    type: Boolean,
    default: false
  },
  executedAt: {
    type: Date
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    default: 'once'
  },
  nextExecution: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento
ScheduledNotificationSchema.index({ scheduledFor: 1, executed: 1, isActive: 1 });
ScheduledNotificationSchema.index({ employeeId: 1, executed: 1 });
ScheduledNotificationSchema.index({ entityType: 1, entityId: 1 });
ScheduledNotificationSchema.index({ nextExecution: 1, isActive: 1 });

// Hooks para auditoría

// Hook para capturar creación
ScheduledNotificationSchema.post('save', function(doc) {
  if (doc.isNew) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'notificación';
    // @ts-ignore
    doc._auditDescription = `Nueva notificación programada: ${doc.title}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
ScheduledNotificationSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
ScheduledNotificationSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'notificación';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de notificación programada: ${doc.title} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para ejecución de notificaciones
ScheduledNotificationSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.executed !== originalDoc.executed && doc.executed) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'ejecución';
    // @ts-ignore
    doc._auditTargetType = 'notificación';
    // @ts-ignore
    doc._auditDescription = `Ejecución de notificación programada: ${doc.title}`;
  }
});

export default mongoose.model<IScheduledNotification>('ScheduledNotification', ScheduledNotificationSchema); 