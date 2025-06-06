import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  name: string;
  key: string;
  permissions: string[];
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  lastUsed?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  permissions: {
    type: [String],
    required: true,
    default: ['read']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  expiresAt: {
    type: Date
  },
  lastUsed: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar el rendimiento
ApiKeySchema.index({ key: 1 });
ApiKeySchema.index({ status: 1 });
ApiKeySchema.index({ createdBy: 1 });

// Middleware pre-save para actualizar updatedAt
ApiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema); 