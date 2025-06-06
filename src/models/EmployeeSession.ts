import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Crear índices adicionales
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 });

export default mongoose.model<ISession>('Session', SessionSchema); 