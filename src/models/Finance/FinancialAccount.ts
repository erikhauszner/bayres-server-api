import mongoose, { Schema, Document } from 'mongoose';

export interface IFinancialAccount extends Document {
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'other';
  balance: number;
  initialBalance: number;
  currency: string;
  accountNumber?: string;
  bankName?: string;
  description?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialAccountSchema = new Schema<IFinancialAccount>({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['checking', 'savings', 'credit', 'cash', 'investment', 'other'],
    default: 'checking'
  },
  balance: { 
    type: Number, 
    required: true,
    default: 0
  },
  initialBalance: { 
    type: Number, 
    required: true,
    default: 0
  },
  currency: { 
    type: String, 
    required: true,
    default: 'USD',
    trim: true 
  },
  accountNumber: { 
    type: String,
    trim: true 
  },
  bankName: { 
    type: String,
    trim: true 
  },
  description: { 
    type: String,
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
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
FinancialAccountSchema.index({ name: 1 });
FinancialAccountSchema.index({ type: 1 });
FinancialAccountSchema.index({ isActive: 1 });

export const FinancialAccount = mongoose.model<IFinancialAccount>('FinancialAccount', FinancialAccountSchema); 