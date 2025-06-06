import mongoose, { Document, Schema } from 'mongoose';

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
      'docs'
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
      'edit_stage'
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
PermissionSchema.index({ isActive: 1 });

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