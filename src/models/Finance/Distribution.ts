import mongoose, { Schema, Document } from 'mongoose';

export interface IDistribution extends Document {
  period: string;
  totalAmount: number;
  date: Date;
  status: 'pending' | 'completed';
  profit: number;
  retention: number;
  reinvestment: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const DistributionSchema: Schema = new Schema(
  {
    period: {
      type: String,
      required: [true, 'El período es obligatorio'],
      trim: true
    },
    totalAmount: {
      type: Number,
      required: [true, 'El monto total es obligatorio'],
      default: 0
    },
    date: {
      type: Date,
      required: [true, 'La fecha de distribución es obligatoria'],
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    },
    profit: {
      type: Number,
      required: [true, 'El monto de utilidad es obligatorio'],
      default: 0
    },
    retention: {
      type: Number,
      default: 0
    },
    reinvestment: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Distribution = mongoose.model<IDistribution>('Distribution', DistributionSchema); 