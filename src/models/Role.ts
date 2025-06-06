import mongoose, { Document, Schema } from 'mongoose';
import { IPermission } from './Permission';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: mongoose.Types.ObjectId[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ isSystem: 1 });

export default mongoose.model<IRole>('Role', RoleSchema); 