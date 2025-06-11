import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeDataForAudit, getChangedFields } from '../utils/auditUtils';

export interface IPermission extends Document {
  name: string;
  description: string;
  module: string;
  action: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>({
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
  module: {
    type: String,
    required: true,
    enum: [
      'auth',
      'employees',
      'roles',
      'leads',
      'clients',
      'activities',
      'tasks',
      'projects',
      'finances',
      'notifications',
      'settings',
      'campaigns',
      'metrics',
      'reports',
      'dashboard',
      'apps',
      'docs',
      'monitoring'
    ]
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'read',
      'update',
      'delete',
      'manage',
      'export',
      'import',
      'approve',
      'reject',
      'assign',
      'auto_assign',
      'convert_to_lead',
      'convert_to_client',
      'view_tab',
      'view_admin_tab',
      'company',
      'categories',
      'view_info_tab',
      'view_activities_tab',
      'view_tasks_tab',
      'view_documents_tab',
      'view_notes_tab',
      'new_activity',
      'edit_activity',
      'delete_activity',
      'new_task',
      'edit_task',
      'delete_task',
      'new_note',
      'edit_note',
      'delete_note',
      'edit_stage',
      'follow_up',
      'empleados_online',
      'leads_asignados',
      'tareas_pendientes',
      'actividad_reciente',
      'proximas_notificaciones',
      'leads_por_revisar',
      'leads_por_asignar'
    ]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
PermissionSchema.index({ module: 1, action: 1 }, { unique: true });
PermissionSchema.index({ name: 1 });
PermissionSchema.index({ isActive: 1 });

// Hooks para auditoría

// Hook para capturar creación
PermissionSchema.post('save', function(doc) {
  if (doc.isNew) {
    // Marcar el documento para auditoría de creación
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'creación';
    // @ts-ignore
    doc._auditTargetType = 'permiso';
    // @ts-ignore
    doc._auditDescription = `Nuevo permiso creado: ${doc.name}`;
    // @ts-ignore
    doc._auditNewData = sanitizeDataForAudit(doc);
  }
});

// Hook para capturar información antes de actualización
PermissionSchema.pre('findOneAndUpdate', async function() {
  // @ts-ignore
  this._originalDoc = await this.model.findOne(this.getQuery());
});

// Hook para capturar información después de actualización
PermissionSchema.post('findOneAndUpdate', async function(doc) {
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
      doc._auditTargetType = 'permiso';
      // @ts-ignore
      doc._auditChangedFields = changedFields;
      // @ts-ignore
      doc._auditDescription = `Actualización de permiso: ${doc.name} (campos: ${changedFields.join(', ')})`;
    }
  }
});

// Hook específico para cambios de estado (crítico para seguridad)
PermissionSchema.post('findOneAndUpdate', async function(doc) {
  // @ts-ignore
  const originalDoc = this._originalDoc;
  
  if (doc && originalDoc && doc.isActive !== originalDoc.isActive) {
    // @ts-ignore - extender el documento con propiedades personalizadas
    doc._auditAction = 'cambio_estado';
    // @ts-ignore
    doc._auditTargetType = 'permiso';
    // @ts-ignore
    doc._auditDescription = `Cambio de estado de permiso: ${doc.name} (${originalDoc.isActive ? 'activo' : 'inactivo'} → ${doc.isActive ? 'activo' : 'inactivo'})`;
  }
});

const defaultPermissions = [
  'employees',
  'roles',
  'clients',
  'projects',
  'appointments',
  'leads',
  'reports',
  'settings',
  'campaigns',
  'metrics'
];

export default mongoose.model<IPermission>('Permission', PermissionSchema); 