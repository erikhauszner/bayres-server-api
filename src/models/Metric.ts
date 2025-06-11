import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IMetric extends Document {
  name: string;
  description?: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  category: 'leads' | 'clients' | 'employees' | 'projects' | 'tasks' | 'finances' | 'campaigns' | 'system';
  value: number;
  unit?: string;
  target?: number;
  threshold?: {
    min?: number;
    max?: number;
    warning?: number;
    critical?: number;
  };
  tags?: string[];
  metadata?: any;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  recordedBy?: mongoose.Types.ObjectId;
  recordedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>({
  name: {
    type: String,
    required: [true, 'El nombre de la métrica es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['counter', 'gauge', 'histogram', 'summary'],
    required: [true, 'El tipo de métrica es requerido']
  },
  category: {
    type: String,
    enum: ['leads', 'clients', 'employees', 'projects', 'tasks', 'finances', 'campaigns', 'system'],
    required: [true, 'La categoría es requerida']
  },
  value: {
    type: Number,
    required: [true, 'El valor es requerido']
  },
  unit: {
    type: String,
    trim: true
  },
  target: {
    type: Number
  },
  threshold: {
    min: {
      type: Number
    },
    max: {
      type: Number
    },
    warning: {
      type: Number
    },
    critical: {
      type: Number
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: Schema.Types.Mixed
  },
  entityType: {
    type: String
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
MetricSchema.index({ name: 1, category: 1 });
MetricSchema.index({ recordedAt: -1 });
MetricSchema.index({ entityType: 1, entityId: 1 });
MetricSchema.index({ type: 1, category: 1 });

// Hooks para auditoría

// Hook para capturar creación
MetricSchema.post('save', function(doc) {
  if (doc.isNew) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'métrica';
    // @ts-ignore
    doc._auditDescription = `Nueva métrica registrada: ${doc.name} (valor: ${doc.value})`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
MetricSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
MetricSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'métrica';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de métrica: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para cambios de valor
MetricSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.value !== originalDoc.value) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'actualización_valor';
    // @ts-ignore
    doc._auditTargetType = 'métrica';
    // @ts-ignore
    doc._auditDescription = `Cambio de valor en métrica: ${doc.name} (${originalDoc.value} → ${doc.value})`;
  }
});

export const Metric = mongoose.model<IMetric>('Metric', MetricSchema); 