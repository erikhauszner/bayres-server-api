import mongoose, { Document, Schema } from 'mongoose';
import { IPermission } from './Permission';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: mongoose.Types.ObjectId[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ isSystem: 1 });

// Hook para capturar creación
RoleSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'rol';
    // @ts-ignore
    doc._auditDescription = `Nuevo rol creado: ${doc.name}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
RoleSchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // @ts-ignore - extender el query con propiedades personalizadas
  this._originalDoc = docToUpdate;
});

// Hook para capturar información después de actualización
RoleSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'rol';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de rol: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

export default mongoose.model<IRole>('Role', RoleSchema); 