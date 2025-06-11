import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IReport extends Document {
  name: string;
  description?: string;
  type: 'leads' | 'clients' | 'employees' | 'projects' | 'tasks' | 'finances' | 'campaigns' | 'custom';
  query: any;
  fields: string[];
  filters?: any;
  aggregations?: any;
  format: 'json' | 'csv' | 'excel' | 'pdf';
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    isActive: boolean;
  };
  recipients?: string[];
  generatedBy: mongoose.Types.ObjectId;
  generatedAt?: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  isActive: boolean;
  isTemplate: boolean;
  templateOf?: mongoose.Types.ObjectId;
  permissions?: {
    canView: mongoose.Types.ObjectId[];
    canEdit: mongoose.Types.ObjectId[];
    canExecute: mongoose.Types.ObjectId[];
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
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
    enum: ['leads', 'clients', 'employees', 'projects', 'tasks', 'finances', 'campaigns', 'custom'],
    required: true
  },
  query: {
    type: Schema.Types.Mixed,
    required: true
  },
  fields: [{
    type: String,
    required: true
  }],
  filters: {
    type: Schema.Types.Mixed
  },
  aggregations: {
    type: Schema.Types.Mixed
  },
  format: {
    type: String,
    enum: ['json', 'csv', 'excel', 'pdf'],
    default: 'json'
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly'],
      default: 'once'
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    time: {
      type: String
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  recipients: [{
    type: String,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Email inválido'
    }
  }],
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  generatedAt: {
    type: Date
  },
  lastExecuted: {
    type: Date
  },
  nextExecution: {
    type: Date
  },
  executionCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateOf: {
    type: Schema.Types.ObjectId,
    ref: 'Report'
  },
  permissions: {
    canView: [{
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    canEdit: [{
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    canExecute: [{
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    }]
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Índices
ReportSchema.index({ name: 1, generatedBy: 1 });
ReportSchema.index({ type: 1, isActive: 1 });
ReportSchema.index({ isTemplate: 1 });
ReportSchema.index({ nextExecution: 1, 'schedule.isActive': 1 });

// Hooks para auditoría

// Hook para capturar creación
ReportSchema.post('save', function(doc) {
  if (doc.isNew) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'reporte';
    // @ts-ignore
    doc._auditDescription = `Nuevo reporte creado: ${doc.name}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
ReportSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
ReportSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'reporte';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de reporte: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para ejecución de reportes
ReportSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.lastExecuted !== originalDoc.lastExecuted) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'ejecución';
    // @ts-ignore
    doc._auditTargetType = 'reporte';
    // @ts-ignore
    doc._auditDescription = `Ejecución de reporte: ${doc.name}`;
  }
});

export default mongoose.model<IReport>('Report', ReportSchema); 