import mongoose, { Schema, Document } from 'mongoose';

export interface IRecurringPlanItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IRecurringPlan extends Document {
  categoryId: mongoose.Types.ObjectId | string;
  concept: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  customFrequency?: number;
  startDate: Date;
  endDate?: Date;
  nextDate: Date;
  lastExecutionDate?: Date;
  notificationDays: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  items: IRecurringPlanItem[];
  notes?: string;
  createdBy: mongoose.Types.ObjectId | string;
  isExpense: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringPlanItemSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const RecurringPlanSchema = new Schema<IRecurringPlan>({
  categoryId: { 
    type: Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: true 
  },
  concept: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  frequency: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    default: 'monthly'
  },
  customFrequency: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  nextDate: {
    type: Date,
    required: true
  },
  lastExecutionDate: {
    type: Date
  },
  notificationDays: {
    type: Number,
    default: 3
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  items: [RecurringPlanItemSchema],
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  isExpense: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
RecurringPlanSchema.index({ status: 1 });
RecurringPlanSchema.index({ nextDate: 1, status: 1 });
RecurringPlanSchema.index({ isExpense: 1 });

export const RecurringPlan = mongoose.model<IRecurringPlan>('RecurringPlan', RecurringPlanSchema); 