import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectTask extends Document {
  name: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  status: 'pending' | 'in-progress' | 'completed' | 'canceled';
  priority: 'low' | 'medium' | 'high';
  startDate: Date;
  endDate: Date;
  assignedTo?: mongoose.Types.ObjectId;
  progress: number;
  blocked?: boolean;
  dependencies?: string[];
  budget?: number;
  spent?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTaskSchema = new Schema<IProjectTask>({
  name: {
    type: String,
    required: [true, 'El nombre de la tarea es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'El proyecto es requerido']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'canceled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de finalización es requerida']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  blocked: {
    type: Boolean,
    default: false
  },
  dependencies: [{
    type: String
  }],
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ProjectTaskSchema.index({ name: 1 });
ProjectTaskSchema.index({ project: 1 });
ProjectTaskSchema.index({ status: 1 });
ProjectTaskSchema.index({ assignedTo: 1 });

export const ProjectTask = mongoose.model<IProjectTask>('ProjectTask', ProjectTaskSchema); 