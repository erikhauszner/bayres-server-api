import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  name: string;
  value: number;
  campaign: mongoose.Types.ObjectId;
  date: Date;
  type: 'impressions' | 'clicks' | 'conversions' | 'revenue' | 'custom';
  source: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  value: {
    type: Number,
    required: [true, 'El valor es requerido'],
    min: [0, 'El valor no puede ser negativo']
  },
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: [true, 'La campaña es requerida']
  },
  date: {
    type: Date,
    required: [true, 'La fecha es requerida']
  },
  type: {
    type: String,
    enum: ['impressions', 'clicks', 'conversions', 'revenue', 'custom'],
    required: [true, 'El tipo es requerido']
  },
  source: {
    type: String,
    required: [true, 'La fuente es requerida'],
    trim: true
  },
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
MetricSchema.index({ name: 1 });
MetricSchema.index({ campaign: 1 });
MetricSchema.index({ date: 1 });
MetricSchema.index({ type: 1 });
MetricSchema.index({ source: 1 });

export const Metric = mongoose.model<IMetric>('Metric', MetricSchema); 