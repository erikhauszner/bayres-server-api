import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system';
  priority: 'low' | 'medium' | 'high';
  entityType?: 'task' | 'client' | 'event' | 'employee' | 'invoice' | 'project' | 'system' | 'other';
  entityId?: string;
  employeeId: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['task', 'client', 'event', 'employee', 'invoice', 'project', 'system', 'other']
  },
  entityId: {
    type: String
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar el rendimiento de las consultas comunes
NotificationSchema.index({ employeeId: 1, createdAt: -1 });
NotificationSchema.index({ employeeId: 1, isRead: 1 });
NotificationSchema.index({ employeeId: 1, type: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema); 