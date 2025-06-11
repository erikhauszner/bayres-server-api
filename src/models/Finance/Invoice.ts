import mongoose, { Schema, Document } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../../utils/auditUtils';

export interface IInvoice extends Document {
  number: string;
  clientId: mongoose.Types.ObjectId | string;
  projectId: mongoose.Types.ObjectId | string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taskId?: mongoose.Types.ObjectId | string;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paid: number;
  balance: number;
  notes?: string;
  terms?: string;
  createdBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  paidDate?: Date;
}

const InvoiceItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  taskId: { type: Schema.Types.ObjectId, ref: 'ProjectTask' }
});

const InvoiceSchema = new Schema<IInvoice>({
  number: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  clientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: false 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  items: [InvoiceItemSchema],
  subtotal: { 
    type: Number, 
    required: true,
    min: 0
  },
  taxRate: { 
    type: Number, 
    required: true,
    min: 0
  },
  taxAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  total: { 
    type: Number, 
    required: true,
    min: 0
  },
  paid: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0
  },
  balance: { 
    type: Number, 
    required: true,
    min: 0
  },
  notes: { type: String },
  terms: { type: String },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  paidDate: { type: Date }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
InvoiceSchema.index({ number: 1 });
InvoiceSchema.index({ clientId: 1 });
InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });

// Hook para capturar creación
InvoiceSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'factura';
    // @ts-ignore
    doc._auditDescription = `Nueva factura creada: ${doc.number}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
InvoiceSchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // @ts-ignore - extender el query con propiedades personalizadas
  this._originalDoc = docToUpdate;
});

// Hook para capturar información después de actualización
InvoiceSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'factura';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de factura: ${doc.number} (campos: ${changedFields.join(', ')})`;
    }
  }
});

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema); 