import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  userName: string;
  action: string;
  description: string;
  targetType: string;
  targetId: mongoose.Schema.Types.ObjectId;
  previousData?: any;
  newData?: any;
  module: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['creación', 'actualización', 'eliminación', 'login', 'logout', 'exportación', 'asignación', 'cambio_estado', 'ejecución', 'actualización_valor', 'actualización_estado', 'actualización_progreso', 'actualización_fechas', 'otro'],
    },
    description: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['lead', 'cliente', 'empleado', 'proyecto', 'tarea', 'finanzas', 'campaña', 'rol', 'permiso', 'departamento', 'factura', 'transacción', 'notificación', 'reporte', 'métrica', 'comentario', 'sesión', 'otro'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    previousData: {
      type: Schema.Types.Mixed,
    },
    newData: {
      type: Schema.Types.Mixed,
    },
    module: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para mejorar la búsqueda y rendimiento
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ targetType: 1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ targetId: 1, targetType: 1 });

// Índices compuestos para consultas complejas
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ module: 1, timestamp: -1 });
AuditLogSchema.index({ targetType: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

// Índice para búsquedas por rango de fechas
AuditLogSchema.index({ timestamp: -1, module: 1, action: 1 });

// Índice para estadísticas de usuario
AuditLogSchema.index({ userId: 1, userName: 1, timestamp: -1 });

// Índice para búsquedas por entidad específica
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

// Índice para búsquedas de administración
AuditLogSchema.index({ action: 1, module: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema); 