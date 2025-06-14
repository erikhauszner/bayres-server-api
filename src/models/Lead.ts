import mongoose, { Schema, Document } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface ILead extends Document {
  // Información Básica
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  industry?: string;
  companySize?: string;
  website?: string;

  // Información de Contacto
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;

  // Información de Ubicación
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;

  // Información de Lead
  source: string;
  captureDate: Date;
  initialScore: number;
  currentStage: string;
  status: string;
  isApproved: boolean;
  estimatedValue?: number;
  priority: 'baja' | 'media' | 'alta';
  interestedProducts?: string[];
  estimatedBudget?: number;

  // Información Adicional
  notes?: {
    _id?: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
    user: mongoose.Types.ObjectId;
  }[];
  attachments?: string[];
  interactionHistory?: {
    _id?: mongoose.Types.ObjectId;
    date: Date;
    type: string;
    title?: string;
    description: string;
    user: mongoose.Types.ObjectId;
  }[];
  tasks?: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    dueDate: Date;
    status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
    priority: 'baja' | 'media' | 'alta';
    completedAt?: Date;
    cancelledAt?: Date;
    assignedTo?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt?: Date;
  }[];
  
  // Seguimientos programados
  followUps?: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    scheduledDate: Date;
    status: 'pendiente' | 'completado' | 'cancelado';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  
  documents?: {
    _id?: mongoose.Types.ObjectId;
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
  lastActivity?: Date;
  nextContactDate?: Date;
  tags?: string[];
  categories?: string[];
  trackingStatus?: string;
  preferredContactTime?: string;

  // Campos de sistema
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Campos de anulación
  annulationReason?: string;
  annulationDate?: Date;
  annulatedBy?: mongoose.Types.ObjectId;

  // Campos para Oportunidades
  canMoveToSales?: boolean;
  movedToOpportunities?: boolean;
  opportunityId?: mongoose.Types.ObjectId;
}

const LeadSchema = new Schema<ILead>({
  // Información Básica
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  company: { type: String },
  position: { type: String },
  industry: { type: String },
  companySize: { type: String },
  website: { type: String },

  // Información de Contacto
  phone: { type: String },
  whatsapp: { type: String },
  email: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  facebook: { type: String },

  // Información de Ubicación
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  postalCode: { type: String },
  timezone: { type: String },

  // Información de Lead
  source: { type: String },
  captureDate: { type: Date, default: Date.now },
  initialScore: { type: Number, default: 0 },
  currentStage: { type: String },
  status: { type: String },
  isApproved: { type: Boolean, default: false },
  estimatedValue: { type: Number },
  priority: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
  interestedProducts: [{ type: String }],
  estimatedBudget: { type: Number },

  // Información Adicional
  notes: [{
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }
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
    status: { 
      type: String, 
      enum: ['pendiente', 'en_progreso', 'completada', 'cancelada'],
      default: 'pendiente' 
    },
    priority: { 
      type: String, 
      enum: ['baja', 'media', 'alta'],
      default: 'media' 
    },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
  }],
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
  documents: [{
    name: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number },
    tags: [{ type: String }],
    uploadDate: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    isExternalLink: { type: Boolean, default: false }
  }],
  lastActivity: { type: Date },
  nextContactDate: { type: Date },
  tags: [{ type: String }],
  categories: [{ type: String }],
  trackingStatus: { type: String },
  preferredContactTime: { type: String },

  // Campos de sistema
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Campos de anulación
  annulationReason: { type: String },
  annulationDate: { type: Date },
  annulatedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },

  // Campos para Oportunidades
  canMoveToSales: { type: Boolean, default: false },
  movedToOpportunities: { type: Boolean, default: false },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity' }
});

// Índices para optimizar búsquedas
LeadSchema.index({ email: 1 });
LeadSchema.index({ firstName: 1, lastName: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ currentStage: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ tags: 1 });
LeadSchema.index({ captureDate: 1 });
LeadSchema.index({ lastActivity: 1 });
LeadSchema.index({ linkedin: 1 });
LeadSchema.index({ instagram: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ facebook: 1 });
LeadSchema.index({ company: 1 });

// Almacenar el documento original para comparar cambios
LeadSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore - el this está definido en el contexto de Mongoose
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._originalDoc = docToUpdate.toObject();
  }
});

// Middleware para actualizar el campo updatedAt
LeadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hooks para auditoría
// Estos hooks no registran la auditoría directamente, sino que preparan los datos
// para que el controlador lo haga con el contexto completo del request

// Capturar información para auditoría durante creación
LeadSchema.post('save', function(doc) {
  if (doc && doc.isNew) {
    // Almacenar datos sanitizados para auditoría
    // @ts-ignore - extender el documento con propiedad personalizada
    doc._auditNewData = sanitizeDataForAudit(doc);
    // @ts-ignore
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'lead';
    // @ts-ignore
    doc._auditDescription = `Creación de lead: ${doc.firstName} ${doc.lastName}`;
  }
});

// Capturar información para auditoría durante actualización
LeadSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'lead';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de lead: ${doc.firstName} ${doc.lastName} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Capturar información para auditoría durante eliminación
LeadSchema.pre('findOneAndDelete', async function() {
  // @ts-ignore
  const docToDelete = await this.model.findOne(this.getQuery());
  if (docToDelete) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._deletedDoc = sanitizeDataForAudit(docToDelete);
    // @ts-ignore
    this._auditAction = 'eliminación';
    // @ts-ignore
    this._auditTargetType = 'lead';
    // @ts-ignore
    this._auditDescription = `Eliminación de lead: ${docToDelete.firstName} ${docToDelete.lastName}`;
  }
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema); 