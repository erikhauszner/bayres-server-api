import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  campaign: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  metrics: mongoose.Types.ObjectId[];
  statistics: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    averageCTR: number;
    averageConversionRate: number;
    averageRevenuePerConversion: number;
  };
  createdBy: mongoose.Types.ObjectId;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: [true, 'La campaña es requerida']
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: [true, 'El tipo de informe es requerido']
  },
  metrics: [{
    type: Schema.Types.ObjectId,
    ref: 'Metric'
  }],
  statistics: {
    totalImpressions: {
      type: Number,
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    totalConversions: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageCTR: {
      type: Number,
      default: 0
    },
    averageConversionRate: {
      type: Number,
      default: 0
    },
    averageRevenuePerConversion: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El creador es requerido']
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
ReportSchema.index({ campaign: 1 });
ReportSchema.index({ startDate: 1 });
ReportSchema.index({ endDate: 1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ createdBy: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema); 