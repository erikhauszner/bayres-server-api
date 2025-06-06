import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  appName: string;
  appKey: string;
  employeeId?: mongoose.Types.ObjectId;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>({
  appName: {
    type: String,
    required: true,
    index: true
  },
  appKey: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  config: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
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

// Índices para mejorar el rendimiento de las consultas comunes
AppConfigSchema.index({ appName: 1, isActive: 1 });
AppConfigSchema.index({ employeeId: 1, appName: 1 });

// Middleware pre-save para actualizar updatedAt
AppConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IAppConfig>('AppConfig', AppConfigSchema); 