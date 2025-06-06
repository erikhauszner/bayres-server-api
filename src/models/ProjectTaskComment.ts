import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectTaskComment extends Document {
  content: string;
  task: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTaskCommentSchema = new Schema<IProjectTaskComment>({
  content: {
    type: String,
    required: [true, 'El contenido del comentario es requerido'],
    trim: true
  },
  task: {
    type: Schema.Types.ObjectId,
    ref: 'ProjectTask',
    required: [true, 'La tarea es requerida']
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'El proyecto es requerido']
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El autor es requerido']
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ProjectTaskCommentSchema.index({ task: 1 });
ProjectTaskCommentSchema.index({ project: 1 });
ProjectTaskCommentSchema.index({ author: 1 });

export const ProjectTaskComment = mongoose.model<IProjectTaskComment>('ProjectTaskComment', ProjectTaskCommentSchema); 