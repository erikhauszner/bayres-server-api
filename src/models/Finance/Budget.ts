import mongoose, { Schema, Document } from 'mongoose';

export interface IBudgetItem {
  categoryId: mongoose.Types.ObjectId | string;
  description: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
}

export interface IBudget extends Document {
  projectId: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  totalBudget: number;
  items: IBudgetItem[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdBy: mongoose.Types.ObjectId | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema<IBudgetItem>({
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
  budgetedAmount: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  actualAmount: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  variance: { 
    type: Number, 
    required: true,
    default: 0
  }
});

const BudgetSchema = new Schema<IBudget>({
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String,
    trim: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  totalBudget: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  items: [BudgetItemSchema],
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
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
BudgetSchema.index({ projectId: 1 });
BudgetSchema.index({ status: 1 });
BudgetSchema.index({ isActive: 1 });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema); 