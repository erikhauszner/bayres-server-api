import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system';
  priority: 'low' | 'medium' | 'high';
  entityType?: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'other';
  entityId?: string;
  employeeId: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
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
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system', 'other']
  },
  entityId: {
    type: String
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar el rendimiento de las consultas comunes
NotificationSchema.index({ employeeId: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1, employeeId: 1 });
NotificationSchema.index({ type: 1, priority: 1 });

// Hooks para auditoría

// Hook para capturar creación
NotificationSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'notificación';
    // @ts-ignore
    doc._auditDescription = `Nueva notificación creada: ${doc.title}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
NotificationSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
NotificationSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditDescription = `Actualización de notificación: ${doc.title} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para marcar como leída
NotificationSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.isRead !== originalDoc.isRead && doc.isRead) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'actualización';
    // @ts-ignore
    doc._auditTargetType = 'notificación';
    // @ts-ignore
    doc._auditDescription = `Notificación marcada como leída: ${doc.title}`;
  }
});

export default mongoose.model<INotification>('Notification', NotificationSchema); 