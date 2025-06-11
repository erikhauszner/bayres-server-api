import mongoose from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Hook para capturar creación
DepartmentSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'departamento';
    // @ts-ignore
    doc._auditDescription = `Nuevo departamento creado: ${doc.name}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
DepartmentSchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // @ts-ignore - extender el query con propiedades personalizadas
  this._originalDoc = docToUpdate;
});

// Hook para capturar información después de actualización
DepartmentSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'departamento';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de departamento: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

const Department = mongoose.model('Department', DepartmentSchema);

export default Department; 