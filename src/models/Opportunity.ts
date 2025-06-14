import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
  leadId: mongoose.Types.ObjectId;
  
  // DATOS COMPLETOS DEL LEAD PRESERVADOS
  leadSnapshot: {
    firstName: string;
    lastName: string;
    company?: string;
    position?: string;
    industry?: string;
    companySize?: string;
    website?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timezone?: string;
    source: string;
    captureDate: Date;
    initialScore: number;
    currentStage: string;
    status: string;
    estimatedValue?: number;
    priority: string;
    interestedProducts?: string[];
    estimatedBudget?: number;
    notes?: {
      _id?: mongoose.Types.ObjectId;
      content: string;
      createdAt: Date;
      updatedAt?: Date;
      user: mongoose.Types.ObjectId;
      updatedBy?: mongoose.Types.ObjectId;
      deletedAt?: Date;
      deletedBy?: mongoose.Types.ObjectId;
      deletionReason?: string;
    }[];
    attachments?: string[];
    interactionHistory?: {
      date: Date;
      type: string;
      title?: string;
      description: string;
      user: mongoose.Types.ObjectId;
    }[];
    tasks?: {
      title: string;
      description?: string;
      dueDate: Date;
      status: string;
      priority: string;
      completedAt?: Date;
      user: mongoose.Types.ObjectId;
      createdAt: Date;
    }[];
    documents?: {
      name: string;
      description?: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
      tags?: string[];
      uploadDate: Date;
      user: mongoose.Types.ObjectId;
      isExternalLink?: boolean;
    }[];
    tags?: string[];
    categories?: string[];
    trackingStatus?: string;
    preferredContactTime?: string;
    assignedTo?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  };
  
  title: string;
  description?: string;
  status: 'nueva' | 'en_proceso' | 'negociacion' | 'propuesta_enviada' | 'cerrada_ganada' | 'cerrada_perdida';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  estimatedValue?: number;
  probability: number; // % de probabilidad de cierre (0-100)
  expectedCloseDate?: Date;
  deadlineDate?: Date; // Fecha límite
  
  // Asignaciones
  originalAgent: mongoose.Types.ObjectId; // Comisionista original
  salesAgent?: mongoose.Types.ObjectId; // Vendedor asignado
  collaborators?: mongoose.Types.ObjectId[]; // Colaboradores adicionales
  
  // Seguimiento
  activities: {
    _id?: mongoose.Types.ObjectId;
    type: 'llamada' | 'email' | 'reunion' | 'propuesta' | 'seguimiento' | 'nota';
    description: string;
    performedBy: mongoose.Types.ObjectId;
    date: Date;
    isVisibleToOriginalAgent: boolean;
  }[];
  
  // Llamadas agendadas
  scheduledCalls: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    medium: string; // Medio por el cual se hará la llamada
    scheduledDate: Date;
    participants: mongoose.Types.ObjectId[]; // Empleados que participarán
    status: 'programada' | 'completada' | 'cancelada';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  
  // Seguimientos programados
  followUps: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    scheduledDate: Date;
    status: 'pendiente' | 'completado' | 'cancelado';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  
  // Intereses del cliente
  interests: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    approximateBudget?: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    deletionReason?: string;
  }[];

  // Tareas de la oportunidad
  tasks: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    dueDate: Date;
    status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
    priority: 'baja' | 'media' | 'alta' | 'urgente';
    assignedTo?: mongoose.Types.ObjectId;
    completedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt?: Date;
    updatedBy?: mongoose.Types.ObjectId;
  }[];
  
  comments: {
    _id?: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    content: string;
    isVisibleToOriginalAgent: boolean;
    createdAt: Date;
  }[];
  
  // Comisiones - Referencia al sistema de finanzas
  commissionConfig: {
    originalAgentPercentage?: number; // % para comisionista original
    salesAgentPercentage?: number;    // % para vendedor
    financeRecordId?: mongoose.Types.ObjectId; // Referencia al registro en finanzas
    agreed: boolean;
  };
  
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  transferredAt: Date; // Fecha de transferencia desde leads
  closedAt?: Date;
}

const OpportunitySchema = new Schema<IOpportunity>({
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  
  // DATOS COMPLETOS DEL LEAD PRESERVADOS
  leadSnapshot: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String },
    position: { type: String },
    industry: { type: String },
    companySize: { type: String },
    website: { type: String },
    phone: { type: String },
    whatsapp: { type: String },
    email: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    facebook: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String },
    timezone: { type: String },
    source: { type: String, required: true },
    captureDate: { type: Date, required: true },
    initialScore: { type: Number, default: 0 },
    currentStage: { type: String },
    status: { type: String },
    estimatedValue: { type: Number },
    priority: { type: String },
    interestedProducts: [{ type: String }],
    estimatedBudget: { type: Number },
    notes: [{
      content: { type: String, required: true },
      createdAt: { type: Date, required: true },
      updatedAt: { type: Date },
      user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
      deletedAt: { type: Date },
      deletedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
      deletionReason: { type: String }
    }],
    attachments: [{ type: String }],
    interactionHistory: [{
      date: { type: Date, required: true },
      type: { type: String, required: true },
      title: { type: String },
      description: { type: String, required: true },
      user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }
    }],
    tasks: [{
      title: { type: String, required: true },
      description: { type: String },
      dueDate: { type: Date, required: true },
      status: { type: String, required: true },
      priority: { type: String, required: true },
      completedAt: { type: Date },
      user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
      createdAt: { type: Date, required: true }
    }],
    documents: [{
      name: { type: String, required: true },
      description: { type: String },
      fileUrl: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number },
      tags: [{ type: String }],
      uploadDate: { type: Date, required: true },
      user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
      isExternalLink: { type: Boolean, default: false }
    }],
    tags: [{ type: String }],
    categories: [{ type: String }],
    trackingStatus: { type: String },
    preferredContactTime: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, required: true }
  },
  
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['nueva', 'en_proceso', 'negociacion', 'propuesta_enviada', 'cerrada_ganada', 'cerrada_perdida'],
    default: 'nueva'
  },
  priority: { 
    type: String, 
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  estimatedValue: { type: Number },
  probability: { type: Number, min: 0, max: 100, default: 50 },
  expectedCloseDate: { type: Date },
  deadlineDate: { type: Date },
  
  // Asignaciones
  originalAgent: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  salesAgent: { type: Schema.Types.ObjectId, ref: 'Employee' },
  collaborators: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  
  // Seguimiento
  activities: [{
    type: { 
      type: String, 
      enum: ['llamada', 'email', 'reunion', 'propuesta', 'seguimiento', 'nota'],
      required: true
    },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    isVisibleToOriginalAgent: { type: Boolean, default: true }
  }],
  
  // Llamadas agendadas
  scheduledCalls: [{
    title: { type: String, required: true },
    description: { type: String },
    medium: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Employee', required: true }],
    status: { 
      type: String, 
      enum: ['programada', 'completada', 'cancelada'],
      default: 'programada'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Seguimientos programados
  followUps: [{
    title: { type: String, required: true },
    description: { type: String },
    scheduledDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pendiente', 'completado', 'cancelado'],
      default: 'pendiente'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Intereses del cliente
  interests: [{
    title: { type: String, required: true },
    description: { type: String },
    approximateBudget: { type: Number, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    deletionReason: { type: String }
  }],

  // Tareas de la oportunidad
  tasks: [{
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'],
      default: 'pendiente'
    },
    priority: { 
      type: String, 
      enum: ['baja', 'media', 'alta', 'urgente'],
      default: 'media'
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
  }],
  
  comments: [{
    author: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    content: { type: String, required: true },
    isVisibleToOriginalAgent: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Comisiones - Referencia al sistema de finanzas
  commissionConfig: {
    originalAgentPercentage: { type: Number, min: 0, max: 100 },
    salesAgentPercentage: { type: Number, min: 0, max: 100 },
    financeRecordId: { type: Schema.Types.ObjectId, ref: 'FinanceRecord' },
    agreed: { type: Boolean, default: false }
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  transferredAt: { type: Date, required: true },
  closedAt: { type: Date }
}, {
  timestamps: true
});

// Índices para optimizar consultas
OpportunitySchema.index({ leadId: 1 });
OpportunitySchema.index({ originalAgent: 1 });
OpportunitySchema.index({ salesAgent: 1 });
OpportunitySchema.index({ status: 1 });
OpportunitySchema.index({ createdAt: -1 });
OpportunitySchema.index({ transferredAt: -1 });

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema); 