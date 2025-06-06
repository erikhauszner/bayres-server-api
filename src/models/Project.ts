import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  client: mongoose.Types.ObjectId;
  status: 'pending' | 'planning' | 'active' | 'in_progress' | 'completed' | 'paused' | 'canceled';
  priority?: 'low' | 'medium' | 'high';
  startDate: Date;
  endDate?: Date;
  progress: number;
  team: mongoose.Types.ObjectId[];
  budget: number;
  objectives: string[];
  deliverables: {
    name: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
    completedAt?: Date;
  }[];
  tasks: mongoose.Types.ObjectId[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  manager?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  totalHours?: number;
}

const ProjectSchema = new Schema<IProject>({
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
  status: {
    type: String,
    enum: ['pending', 'planning', 'active', 'in_progress', 'completed', 'paused', 'canceled'],
    default: 'in_progress'
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
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  team: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  budget: {
    type: Number,
    required: [true, 'El presupuesto es requerido'],
    min: [0, 'El presupuesto no puede ser negativo']
  },
  objectives: [{
    type: String,
    trim: true
  }],
  deliverables: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    completedAt: {
      type: Date
    }
  }],
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'ProjectTask'
  }],
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  totalHours: {
    type: Number
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ client: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ team: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema); 