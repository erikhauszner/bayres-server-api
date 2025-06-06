import mongoose, { Schema, Document } from 'mongoose';

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

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema); 