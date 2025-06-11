import mongoose, { Schema, Document } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../../utils/auditUtils';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'other';

export interface ITransaction extends Document {
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  categoryId: mongoose.Types.ObjectId | string;
  status: TransactionStatus;
  projectId?: mongoose.Types.ObjectId | string;
  taskId?: mongoose.Types.ObjectId | string;
  accountId: mongoose.Types.ObjectId | string;
  paymentMethod: PaymentMethod;
  reference?: string;
  attachments?: string[];
  employeeId?: mongoose.Types.ObjectId | string;
  createdBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  type: { 
    type: String, 
    required: true,
    enum: ['income', 'expense', 'transfer'],
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  date: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  categoryId: { 
    type: Schema.Types.ObjectId, 
    ref: 'TransactionCategory', 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project'
  },
  taskId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ProjectTask'
  },
  accountId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FinancialAccount', 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'other'],
    default: 'bank_transfer'
  },
  reference: { 
    type: String,
    trim: true
  },
  attachments: [{ 
    type: String 
  }],
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
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
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ date: 1 });
TransactionSchema.index({ categoryId: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ accountId: 1 });
TransactionSchema.index({ projectId: 1 });
TransactionSchema.index({ employeeId: 1 });

// Hook para capturar creación
TransactionSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'transacción';
    // @ts-ignore
    doc._auditDescription = `Nueva transacción creada: ${doc.type} - $${doc.amount}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
TransactionSchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // @ts-ignore - extender el query con propiedades personalizadas
  this._originalDoc = docToUpdate;
});

// Hook para capturar información después de actualización
TransactionSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'transacción';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de transacción: ${doc.type} - $${doc.amount} (campos: ${changedFields.join(', ')})`;
    }
  }
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema); 