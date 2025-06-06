import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  projectId: mongoose.Types.ObjectId | string;
  taskId?: mongoose.Types.ObjectId | string;
  date: Date;
  amount: number;
  categoryId: mongoose.Types.ObjectId | string;
  description: string;
  receipt?: string;
  vendor?: string;
  createdBy: mongoose.Types.ObjectId | string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approvedBy?: mongoose.Types.ObjectId | string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  taskId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ProjectTask'
  },
  date: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  categoryId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ExpenseCategory', 
    required: true 
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  receipt: { 
    type: String 
  },
  vendor: { 
    type: String,
    trim: true
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'approved', 'rejected', 'reimbursed'],
    default: 'pending'
  },
  approvedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Employee'
  },
  approvedAt: { 
    type: Date 
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ExpenseSchema.index({ projectId: 1 });
ExpenseSchema.index({ categoryId: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ date: 1 });
ExpenseSchema.index({ createdBy: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema); 