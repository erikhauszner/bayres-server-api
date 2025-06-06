import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseCategory extends Document {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true 
  },
  description: { 
    type: String,
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
ExpenseCategorySchema.index({ name: 1 });
ExpenseCategorySchema.index({ isActive: 1 });

export const ExpenseCategory = mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema); 