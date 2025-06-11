import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

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
  status?: 'online' | 'offline' | 'break';
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
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'break'],
    default: 'offline'
  }
}, {
  timestamps: true,
  collection: 'employees'
});

// Almacenar el documento original para comparar cambios
EmployeeSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore - el this está definido en el contexto de Mongoose
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._originalDoc = docToUpdate.toObject();
  }
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

// Hooks para auditoría

// Capturar información para auditoría durante creación
EmployeeSchema.post('save', function(doc) {
  if (doc && doc.isNew) {
    // Almacenar datos sanitizados para auditoría
    // @ts-ignore - extender el documento con propiedad personalizada
    doc._auditNewData = sanitizeDataForAudit(doc);
    // @ts-ignore
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'empleado';
    // @ts-ignore
    doc._auditDescription = `Creación de empleado: ${doc.firstName} ${doc.lastName}`;
  }
});

// Capturar información para auditoría durante actualización
EmployeeSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc) {
    const sanitizedOldDoc = sanitizeDataForAudit(originalDoc);
    const sanitizedNewDoc = sanitizeDataForAudit(doc);
    const changedFields = getChangedFields(sanitizedOldDoc, sanitizedNewDoc);
    
    if (changedFields.length > 0) {
      // @ts-ignore - extender el documento con propiedades personalizadas
      doc._auditPreviousData = sanitizedOldDoc;
      // @ts-ignore
      doc._auditNewData = sanitizedNewDoc;
      // @ts-ignore
      doc._auditAction = 'actualización';
      // @ts-ignore
      doc._auditTargetType = 'empleado';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de empleado: ${doc.firstName} ${doc.lastName} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Capturar información para auditoría durante eliminación
EmployeeSchema.pre('findOneAndDelete', async function() {
  // @ts-ignore
  const docToDelete = await this.model.findOne(this.getQuery());
  if (docToDelete) {
    // @ts-ignore - extender el this con propiedad personalizada
    this._deletedDoc = sanitizeDataForAudit(docToDelete);
    // @ts-ignore
    this._auditAction = 'eliminación';
    // @ts-ignore
    this._auditTargetType = 'empleado';
    // @ts-ignore
    this._auditDescription = `Eliminación de empleado: ${docToDelete.firstName} ${docToDelete.lastName}`;
  }
});

// Hooks específicos para cambios de estado
EmployeeSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.status !== originalDoc.status) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'cambio_estado';
    // @ts-ignore
    doc._auditTargetType = 'empleado';
    // @ts-ignore
    doc._auditDescription = `Cambio de estado de empleado: ${doc.firstName} ${doc.lastName} (${originalDoc.status} → ${doc.status})`;
  }
});

// Hooks específicos para inicio/cierre de sesión
EmployeeSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc) {
    // Detectar inicio de sesión
    if (doc.lastLogin && (!originalDoc.lastLogin || doc.lastLogin.getTime() !== originalDoc.lastLogin.getTime())) {
      // @ts-ignore
      doc._auditAction = 'login';
      // @ts-ignore
      doc._auditTargetType = 'empleado';
      // @ts-ignore
      doc._auditDescription = `Inicio de sesión: ${doc.firstName} ${doc.lastName}`;
    }
    
    // Detectar cierre de sesión
    if (doc.lastLogout && (!originalDoc.lastLogout || doc.lastLogout.getTime() !== originalDoc.lastLogout.getTime())) {
      // @ts-ignore
      doc._auditAction = 'logout';
      // @ts-ignore
      doc._auditTargetType = 'empleado';
      // @ts-ignore
      doc._auditDescription = `Cierre de sesión: ${doc.firstName} ${doc.lastName}`;
    }
  }
});

export default mongoose.model<IEmployee>('Employee', EmployeeSchema); 