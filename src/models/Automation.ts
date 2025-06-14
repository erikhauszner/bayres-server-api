import mongoose, { Document, Schema } from 'mongoose';

// Interfaz para los campos de texto personalizables
export interface IAutomationField {
  name: string;                    // Nombre del campo (ej: "keywords", "location")
  label: string;                   // Etiqueta para mostrar (ej: "Palabras clave", "Ubicación")
  description?: string;            // Descripción opcional del campo
  size: 'small' | 'medium' | 'large';  // Tamaño del campo de texto
  required: boolean;               // Si el campo es obligatorio
  placeholder?: string;            // Placeholder del campo
  defaultValue?: string;           // Valor por defecto
  order: number;                   // Orden de aparición en el formulario
}

// Interfaz para la configuración de webhook (similar a la actual)
export interface IAutomationConfig {
  webhookUrl: string;
  apiKey?: string;
  sendEmployeeId: boolean;
  notificationEmail?: string;
  successRedirectUrl?: string;
  errorRedirectUrl?: string;
}

export interface IAutomation extends Document {
  name: string;                    // Nombre de la automatización
  description?: string;            // Descripción de la automatización
  fields: IAutomationField[];      // Campos de texto personalizables
  config: IAutomationConfig;       // Configuración de webhook
  status: 'active' | 'inactive' | 'draft';
  
  // Metadatos
  createdBy: mongoose.Types.ObjectId;  // Empleado que creó la automatización
  createdAt: Date;
  updatedAt: Date;
}

const AutomationFieldSchema = new Schema<IAutomationField>({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String
  },
  defaultValue: {
    type: String
  },
  order: {
    type: Number,
    required: true
  }
});

const AutomationConfigSchema = new Schema<IAutomationConfig>({
  webhookUrl: {
    type: String,
    required: true
  },
  apiKey: {
    type: String
  },
  sendEmployeeId: {
    type: Boolean,
    default: false
  },
  notificationEmail: {
    type: String
  },
  successRedirectUrl: {
    type: String
  },
  errorRedirectUrl: {
    type: String
  }
});

const AutomationSchema = new Schema<IAutomation>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  fields: [AutomationFieldSchema],
  config: {
    type: AutomationConfigSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
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
AutomationSchema.index({ name: 1 });
AutomationSchema.index({ status: 1 });
AutomationSchema.index({ createdBy: 1 });

// Middleware pre-save para actualizar updatedAt
AutomationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IAutomation>('Automation', AutomationSchema); 