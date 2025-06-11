import mongoose, { Schema, Document } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IClient extends Document {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  
  // Información de empresa (si aplica)
  type: 'personal' | 'business';
  businessName?: string;
  businessTaxId?: string;
  industry?: string;
  
  // Información de contacto adicional
  website?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  
  // Campos de sistema
  status: 'active' | 'inactive';
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  
  // Relaciones
  projects?: mongoose.Types.ObjectId[];
  interactions?: {
    _id?: mongoose.Types.ObjectId;
    type: string;
    title?: string;
    description: string;
    date: Date;
    user: mongoose.Types.ObjectId;
  }[];
  documents?: {
    _id?: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    fileUrl: string;
    tags?: string[];
    user: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  representatives?: {
    name: string;
    position?: string;
    email: string;
    phone: string;
  }[];
}

const ClientSchema = new Schema<IClient>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  postalCode: { type: String },
  
  // Información de empresa
  type: { type: String, enum: ['personal', 'business'], required: true },
  businessName: { type: String },
  businessTaxId: { type: String },
  industry: { type: String },
  
  // Información de contacto adicional
  website: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  facebook: { type: String },
  
  // Campos de sistema
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notes: { type: String },
  
  // Relaciones
  projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
  interactions: [{
    type: { type: String, required: true },
    title: { type: String },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }
  }],
  documents: [{
    name: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    tags: [{ type: String }],
    user: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  representatives: [{
    name: { type: String, required: true },
    position: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  }]
});

// Índices para búsquedas eficientes
ClientSchema.index({ email: 1 });
ClientSchema.index({ name: 1 });
ClientSchema.index({ status: 1 });
ClientSchema.index({ createdBy: 1 });

// Almacenar el documento original para comparar cambios
ClientSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore - el this está definido en el contexto de Mongoose
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._originalDoc = docToUpdate.toObject();
  }
});

// Middleware para actualizar el campo updatedAt
ClientSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hooks para auditoría

// Capturar información para auditoría durante creación
ClientSchema.post('save', function(doc) {
  if (doc && doc.isNew) {
    // Almacenar datos sanitizados para auditoría
    // @ts-ignore - extender el documento con propiedad personalizada
    doc._auditNewData = sanitizeDataForAudit(doc);
    // @ts-ignore
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'cliente';
    // @ts-ignore
    doc._auditDescription = `Creación de cliente: ${doc.name}`;
  }
});

// Capturar información para auditoría durante actualización
ClientSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'cliente';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de cliente: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Capturar información para auditoría durante eliminación
ClientSchema.pre('findOneAndDelete', async function() {
  // @ts-ignore
  const docToDelete = await this.model.findOne(this.getQuery());
  if (docToDelete) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._deletedDoc = sanitizeDataForAudit(docToDelete);
    // @ts-ignore
    this._auditAction = 'eliminación';
    // @ts-ignore
    this._auditTargetType = 'cliente';
    // @ts-ignore
    this._auditDescription = `Eliminación de cliente: ${docToDelete.name}`;
  }
});

// Hooks específicos para cambios de estado
ClientSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.status !== originalDoc.status) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'cambio_estado';
    // @ts-ignore
    doc._auditTargetType = 'cliente';
    // @ts-ignore
    doc._auditDescription = `Cambio de estado de cliente: ${doc.name} (${originalDoc.status} → ${doc.status})`;
  }
});

export const Client = mongoose.model<IClient>('Client', ClientSchema); 