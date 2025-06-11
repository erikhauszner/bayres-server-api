import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface ICampaign extends Document {
  name: string;
  description: string;
  client: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  budget: number;
  objectives: string[];
  metrics: {
    name: string;
    target: number;
    current: number;
  }[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
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
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  budget: {
    type: Number,
    required: [true, 'El presupuesto es requerido'],
    min: [0, 'El presupuesto no puede ser negativo']
  },
  objectives: [{
    type: String,
    trim: true
  }],
  metrics: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    target: {
      type: Number,
      required: true,
      min: 0
    },
    current: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
CampaignSchema.index({ name: 1 });
CampaignSchema.index({ client: 1 });
CampaignSchema.index({ assignedTo: 1 });
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ startDate: 1 });
CampaignSchema.index({ endDate: 1 });

// Hook para capturar creación
CampaignSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'campaña';
    // @ts-ignore
    doc._auditDescription = `Nueva campaña creada: ${doc.name}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
CampaignSchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // @ts-ignore - extender el query con propiedades personalizadas
  this._originalDoc = docToUpdate;
});

// Hook para capturar información después de actualización
CampaignSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'campaña';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de campaña: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema); 