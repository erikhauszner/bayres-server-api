import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEmployee extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: mongoose.Types.ObjectId;
  department: string;
  position: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  lastLogout?: Date;
  permissions: string[];
  forcePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const EmployeeSchema = new Schema<IEmployee>({
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'El rol es requerido']
  },
  department: {
    type: String,
    required: [true, 'El departamento es requerido'],
    enum: ['ventas', 'desarrollo', 'diseño', 'marketing', 'soporte', 'administración'],
    default: 'administración'
  },
  position: {
    type: String,
    required: [true, 'El cargo es requerido'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastLogout: {
    type: Date
  },
  permissions: [{
    type: String
  }],
  forcePasswordChange: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'employees'
});

// Middleware para hashear la contraseña antes de guardar
EmployeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar contraseñas
EmployeeSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IEmployee>('Employee', EmployeeSchema); 