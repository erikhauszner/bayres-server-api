import mongoose, { Schema, Document } from 'mongoose';
import { TransactionType } from './Transaction';

export interface ITransactionCategory extends Document {
  name: string;
  type: TransactionType;
  description?: string;
  color?: string;
  createdBy: mongoose.Types.ObjectId | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionCategorySchema = new Schema<ITransactionCategory>({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['income', 'expense', 'transfer'],
  },
  description: { 
    type: String,
    trim: true 
  },
  color: { 
    type: String,
    default: '#3498db' 
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
TransactionCategorySchema.index({ name: 1, type: 1 }, { unique: true });
TransactionCategorySchema.index({ type: 1 });
TransactionCategorySchema.index({ isActive: 1 });

export const TransactionCategory = mongoose.model<ITransactionCategory>('TransactionCategory', TransactionCategorySchema); 