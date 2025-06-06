import mongoose, { Document, Schema } from 'mongoose';

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

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema); 