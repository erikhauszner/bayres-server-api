import mongoose, { Document, Schema } from 'mongoose';

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

export const Task = mongoose.model<ITask>('Task', TaskSchema); 