import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeStatusLog extends Document {
  employeeId: mongoose.Types.ObjectId;
  status: 'online' | 'offline' | 'break';
  startTime: Date;
  endTime?: Date;
  duration?: number; // duración en segundos
}

const EmployeeStatusLogSchema = new Schema<IEmployeeStatusLog>({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'break'],
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // Duración en segundos
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
EmployeeStatusLogSchema.index({ employeeId: 1, status: 1 });
EmployeeStatusLogSchema.index({ employeeId: 1, startTime: -1 });

// Modelo para rastrear la duración acumulada por día
export interface IEmployeeStatusDailyStats extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date; // Fecha del día (sin hora)
  onlineTime: number; // Tiempo en segundos
  breakTime: number; // Tiempo en segundos
  offlineTime: number; // Tiempo en segundos
  lastCalculated: Date;
}

const EmployeeStatusDailyStatsSchema = new Schema<IEmployeeStatusDailyStats>({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  onlineTime: {
    type: Number,
    default: 0
  },
  breakTime: {
    type: Number,
    default: 0
  },
  offlineTime: {
    type: Number,
    default: 0
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para búsqueda rápida por empleado y fecha
EmployeeStatusDailyStatsSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const EmployeeStatusLog = mongoose.model<IEmployeeStatusLog>('EmployeeStatusLog', EmployeeStatusLogSchema);
export const EmployeeStatusDailyStats = mongoose.model<IEmployeeStatusDailyStats>('EmployeeStatusDailyStats', EmployeeStatusDailyStatsSchema); 