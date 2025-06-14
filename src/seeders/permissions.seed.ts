import Permission from '../models/Permission';

const permissions = [
  // Permisos de autenticación
  {
    name: 'auth:read',
    description: 'Ver información de autenticación',
    module: 'auth',
    action: 'read',
    isActive: true
  },
  {
    name: 'auth:create',
    description: 'Crear autenticación (login)',
    module: 'auth',
    action: 'create',
    isActive: true
  },
  {
    name: 'auth:update',
    description: 'Actualizar autenticación',
    module: 'auth',
    action: 'update',
    isActive: true
  },
  {
    name: 'auth:delete',
    description: 'Eliminar autenticación',
    module: 'auth',
    action: 'delete',
    isActive: true
  },

  // Permisos de empleados
  {
    name: 'employees:read',
    description: 'Ver empleados',
    module: 'employees',
    action: 'read',
    isActive: true
  },
  {
    name: 'employees:create',
    description: 'Crear empleados',
    module: 'employees',
    action: 'create',
    isActive: true
  },
  {
    name: 'employees:update',
    description: 'Actualizar empleados',
    module: 'employees',
    action: 'update',
    isActive: true
  },
  {
    name: 'employees:delete',
    description: 'Eliminar empleados',
    module: 'employees',
    action: 'delete',
    isActive: true
  },

  // Permisos de roles
  {
    name: 'roles:read',
    description: 'Ver roles',
    module: 'roles',
    action: 'read',
    isActive: true
  },
  {
    name: 'roles:create',
    description: 'Crear roles',
    module: 'roles',
    action: 'create',
    isActive: true
  },
  {
    name: 'roles:update',
    description: 'Actualizar roles',
    module: 'roles',
    action: 'update',
    isActive: true
  },
  {
    name: 'roles:delete',
    description: 'Eliminar roles',
    module: 'roles',
    action: 'delete',
    isActive: true
  },

  // Permisos de clientes
  {
    name: 'clients:read',
    description: 'Ver clientes',
    module: 'clients',
    action: 'read',
    isActive: true
  },
  {
    name: 'clients:create',
    description: 'Crear clientes',
    module: 'clients',
    action: 'create',
    isActive: true
  },
  {
    name: 'clients:update',
    description: 'Actualizar clientes',
    module: 'clients',
    action: 'update',
    isActive: true
  },
  {
    name: 'clients:delete',
    description: 'Eliminar clientes',
    module: 'clients',
    action: 'delete',
    isActive: true
  },
  {
    name: 'clients:convert_to_lead',
    description: 'Convertir clientes a leads',
    module: 'clients',
    action: 'convert_to_lead',
    isActive: true
  },

  // Permisos de leads
  {
    name: 'leads:read',
    description: 'Ver leads',
    module: 'leads',
    action: 'read',
    isActive: true
  },
  {
    name: 'leads:create',
    description: 'Crear leads',
    module: 'leads',
    action: 'create',
    isActive: true
  },
  {
    name: 'leads:update',
    description: 'Actualizar leads',
    module: 'leads',
    action: 'update',
    isActive: true
  },
  {
    name: 'leads:delete',
    description: 'Eliminar leads',
    module: 'leads',
    action: 'delete',
    isActive: true
  },
  {
    name: 'leads:convert_to_client',
    description: 'Convertir leads a clientes',
    module: 'leads',
    action: 'convert_to_client',
    isActive: true
  },
  {
    name: 'leads:import',
    description: 'Importar leads',
    module: 'leads',
    action: 'import',
    isActive: true
  },
  {
    name: 'leads:approve',
    description: 'Aprobar leads',
    module: 'leads',
    action: 'approve',
    isActive: true
  },
  {
    name: 'leads:reject',
    description: 'Rechazar leads',
    module: 'leads',
    action: 'reject',
    isActive: true
  },
  {
    name: 'leads:assign',
    description: 'Asignar leads',
    module: 'leads',
    action: 'assign',
    isActive: true
  },
  {
    name: 'leads:unassign',
    description: 'Desasignar leads',
    module: 'leads',
    action: 'unassign',
    isActive: true
  },
  {
    name: 'leads:auto_assign',
    description: 'Auto-asignarse leads al crearlos',
    module: 'leads',
    action: 'auto_assign',
    isActive: true
  },
  {
    name: 'leads:edit_stage',
    description: 'Modificar etapa del lead',
    module: 'leads',
    action: 'edit_stage',
    isActive: true
  },
  {
    name: 'leads:follow_up',
    description: 'Agendar seguimiento de leads',
    module: 'leads',
    action: 'follow_up',
    isActive: true
  },
  // Permisos específicos para botones de cambio de stage
  {
    name: 'leads:mark_contacted',
    description: 'Marcar lead como contactado',
    module: 'leads',
    action: 'mark_contacted',
    isActive: true
  },
  {
    name: 'leads:schedule_follow_up',
    description: 'Agendar seguimiento desde stage contactado',
    module: 'leads',
    action: 'schedule_follow_up',
    isActive: true
  },
  {
    name: 'leads:set_agenda_pending',
    description: 'Cambiar stage a agenda pendiente',
    module: 'leads',
    action: 'set_agenda_pending',
    isActive: true
  },
  {
    name: 'leads:move_to_opportunities',
    description: 'Mover lead a oportunidades',
    module: 'leads',
    action: 'move_to_opportunities',
    isActive: true
  },

  // Permisos de proyectos
  {
    name: 'projects:read',
    description: 'Ver proyectos',
    module: 'projects',
    action: 'read',
    isActive: true
  },
  {
    name: 'projects:create',
    description: 'Crear proyectos',
    module: 'projects',
    action: 'create',
    isActive: true
  },
  {
    name: 'projects:update',
    description: 'Actualizar proyectos',
    module: 'projects',
    action: 'update',
    isActive: true
  },
  {
    name: 'projects:delete',
    description: 'Eliminar proyectos',
    module: 'projects',
    action: 'delete',
    isActive: true
  },
  {
    name: 'projects:manage',
    description: 'Gestionar proyectos',
    module: 'projects',
    action: 'manage',
    isActive: true
  },

  // Permisos de tareas
  {
    name: 'tasks:read',
    description: 'Ver tareas',
    module: 'tasks',
    action: 'read',
    isActive: true
  },
  {
    name: 'tasks:create',
    description: 'Crear tareas',
    module: 'tasks',
    action: 'create',
    isActive: true
  },
  {
    name: 'tasks:update',
    description: 'Actualizar tareas',
    module: 'tasks',
    action: 'update',
    isActive: true
  },
  {
    name: 'tasks:delete',
    description: 'Eliminar tareas',
    module: 'tasks',
    action: 'delete',
    isActive: true
  },

  // Permisos de actividades
  {
    name: 'activities:read',
    description: 'Ver actividades',
    module: 'activities',
    action: 'read',
    isActive: true
  },
  {
    name: 'activities:create',
    description: 'Crear actividades',
    module: 'activities',
    action: 'create',
    isActive: true
  },
  {
    name: 'activities:update',
    description: 'Actualizar actividades',
    module: 'activities',
    action: 'update',
    isActive: true
  },
  {
    name: 'activities:delete',
    description: 'Eliminar actividades',
    module: 'activities',
    action: 'delete',
    isActive: true
  },

  // Permisos de notificaciones
  {
    name: 'notifications:read',
    description: 'Ver notificaciones',
    module: 'notifications',
    action: 'read',
    isActive: true
  },
  {
    name: 'notifications:create',
    description: 'Crear notificaciones',
    module: 'notifications',
    action: 'create',
    isActive: true
  },
  {
    name: 'notifications:update',
    description: 'Actualizar notificaciones',
    module: 'notifications',
    action: 'update',
    isActive: true
  },
  {
    name: 'notifications:delete',
    description: 'Eliminar notificaciones',
    module: 'notifications',
    action: 'delete',
    isActive: true
  },

  // Permisos de finanzas
  {
    name: 'finances:read',
    description: 'Ver finanzas',
    module: 'finances',
    action: 'read',
    isActive: true
  },
  {
    name: 'finances:create',
    description: 'Crear registros financieros',
    module: 'finances',
    action: 'create',
    isActive: true
  },
  {
    name: 'finances:update',
    description: 'Actualizar registros financieros',
    module: 'finances',
    action: 'update',
    isActive: true
  },
  {
    name: 'finances:delete',
    description: 'Eliminar registros financieros',
    module: 'finances',
    action: 'delete',
    isActive: true
  },
  {
    name: 'finances:export',
    description: 'Exportar datos financieros',
    module: 'finances',
    action: 'export',
    isActive: true
  },

  // Permisos de configuración
  {
    name: 'settings:read',
    description: 'Ver configuración',
    module: 'settings',
    action: 'read',
    isActive: true
  },
  {
    name: 'settings:create',
    description: 'Crear configuración',
    module: 'settings',
    action: 'create',
    isActive: true
  },
  {
    name: 'settings:update',
    description: 'Actualizar configuración',
    module: 'settings',
    action: 'update',
    isActive: true
  },
  {
    name: 'settings:delete',
    description: 'Eliminar configuración',
    module: 'settings',
    action: 'delete',
    isActive: true
  },
  {
    name: 'settings:company',
    description: 'Acceder a configuración de la empresa',
    module: 'settings',
    action: 'company',
    isActive: true
  },
  {
    name: 'settings:categories',
    description: 'Acceder a configuración de categorías',
    module: 'settings',
    action: 'categories',
    isActive: true
  },

  // Permisos de automatizaciones
  {
    name: 'automations:read',
    description: 'Ver automatizaciones',
    module: 'automations',
    action: 'read',
    isActive: true
  },
  {
    name: 'automations:create',
    description: 'Crear automatizaciones',
    module: 'automations',
    action: 'create',
    isActive: true
  },
  {
    name: 'automations:update',
    description: 'Editar automatizaciones',
    module: 'automations',
    action: 'update',
    isActive: true
  },
  {
    name: 'automations:delete',
    description: 'Eliminar automatizaciones',
    module: 'automations',
    action: 'delete',
    isActive: true
  },
  {
    name: 'automations:activate',
    description: 'Activar/desactivar automatizaciones',
    module: 'automations',
    action: 'activate',
    isActive: true
  },
  {
    name: 'automations:duplicate',
    description: 'Duplicar automatizaciones',
    module: 'automations',
    action: 'duplicate',
    isActive: true
  },
  {
    name: 'automations:stats',
    description: 'Ver estadísticas de automatizaciones',
    module: 'automations',
    action: 'stats',
    isActive: true
  },
  {
    name: 'automations:submit',
    description: 'Enviar formularios de automatizaciones',
    module: 'automations',
    action: 'submit',
    isActive: true
  },

  // Permisos de campañas
  {
    name: 'campaigns:read',
    description: 'Ver campañas',
    module: 'campaigns',
    action: 'read',
    isActive: true
  },
  {
    name: 'campaigns:create',
    description: 'Crear campañas',
    module: 'campaigns',
    action: 'create',
    isActive: true
  },
  {
    name: 'campaigns:update',
    description: 'Actualizar campañas',
    module: 'campaigns',
    action: 'update',
    isActive: true
  },
  {
    name: 'campaigns:delete',
    description: 'Eliminar campañas',
    module: 'campaigns',
    action: 'delete',
    isActive: true
  },

  // Permisos de métricas
  {
    name: 'metrics:read',
    description: 'Ver métricas',
    module: 'metrics',
    action: 'read',
    isActive: true
  },
  {
    name: 'metrics:create',
    description: 'Crear métricas',
    module: 'metrics',
    action: 'create',
    isActive: true
  },
  {
    name: 'metrics:update',
    description: 'Actualizar métricas',
    module: 'metrics',
    action: 'update',
    isActive: true
  },
  {
    name: 'metrics:delete',
    description: 'Eliminar métricas',
    module: 'metrics',
    action: 'delete',
    isActive: true
  },

  // Permisos de informes
  {
    name: 'reports:read',
    description: 'Ver informes',
    module: 'reports',
    action: 'read',
    isActive: true
  },
  {
    name: 'reports:create',
    description: 'Crear informes',
    module: 'reports',
    action: 'create',
    isActive: true
  },
  {
    name: 'reports:update',
    description: 'Actualizar informes',
    module: 'reports',
    action: 'update',
    isActive: true
  },
  {
    name: 'reports:delete',
    description: 'Eliminar informes',
    module: 'reports',
    action: 'delete',
    isActive: true
  },

  // Permisos de monitoreo
  {
    name: 'monitoring:read',
    description: 'Ver monitoreo de empleados',
    module: 'monitoring',
    action: 'read',
    isActive: true
  },
  {
    name: 'monitoring:update',
    description: 'Actualizar estado de monitoreo de empleados',
    module: 'monitoring',
    action: 'update',
    isActive: true
  },
  {
    name: 'monitoring:view_tab',
    description: 'Ver pestaña de Monitoreo',
    module: 'monitoring',
    action: 'view_tab',
    isActive: true
  },

  // Permisos para pestañas del sidebar
  {
    name: 'dashboard:view_tab',
    description: 'Ver pestaña de Dashboard',
    module: 'dashboard',
    action: 'view_tab',
    isActive: true
  },

  // Permisos para cards del dashboard
  {
    name: 'dashboard:empleados_online',
    description: 'Ver card de Empleados Online en Dashboard',
    module: 'dashboard',
    action: 'empleados_online',
    isActive: true
  },
  {
    name: 'dashboard:leads_asignados',
    description: 'Ver card de Leads Asignados en Dashboard',
    module: 'dashboard',
    action: 'leads_asignados',
    isActive: true
  },
  {
    name: 'dashboard:tareas_pendientes',
    description: 'Ver card de Tareas Pendientes en Dashboard',
    module: 'dashboard',
    action: 'tareas_pendientes',
    isActive: true
  },
  {
    name: 'dashboard:actividad_reciente',
    description: 'Ver card de Actividad Reciente en Dashboard',
    module: 'dashboard',
    action: 'actividad_reciente',
    isActive: true
  },
  {
    name: 'dashboard:proximas_notificaciones',
    description: 'Ver card de Próximas Notificaciones en Dashboard',
    module: 'dashboard',
    action: 'proximas_notificaciones',
    isActive: true
  },
  {
    name: 'dashboard:leads_por_revisar',
    description: 'Ver card de Leads por Revisar en Dashboard',
    module: 'dashboard',
    action: 'leads_por_revisar',
    isActive: true
  },
  {
    name: 'dashboard:leads_por_asignar',
    description: 'Ver card de Leads por Asignar en Dashboard',
    module: 'dashboard',
    action: 'leads_por_asignar',
    isActive: true
  },
  {
    name: 'dashboard:mis_oportunidades',
    description: 'Ver card de Mis Oportunidades en Dashboard',
    module: 'dashboard',
    action: 'mis_oportunidades',
    isActive: true
  },
  {
    name: 'dashboard:oportunidades_activas',
    description: 'Ver card de Oportunidades Activas en Dashboard',
    module: 'dashboard',
    action: 'oportunidades_activas',
    isActive: true
  },
  {
    name: 'leads:view_tab',
    description: 'Ver pestaña de Leads',
    module: 'leads',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'leads:stage_edit_appsetters',
    description: 'Editar etapas de Leads (Setters)',
    module: 'leads',
    action: 'stage_edit_appsetters',
    isActive: true
  },
  {
    name: 'clients:view_tab',
    description: 'Ver pestaña de Clientes',
    module: 'clients',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'projects:view_tab',
    description: 'Ver pestaña de Proyectos',
    module: 'projects',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'finances:view_tab',
    description: 'Ver pestaña de Finanzas',
    module: 'finances',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'automations:view_tab',
    description: 'Ver pestaña de Automatizaciones',
    module: 'automations',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'employees:view_tab',
    description: 'Ver pestaña de Empleados',
    module: 'employees',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'leads:view_admin_tab',
    description: 'Ver pestaña de Administración de Leads',
    module: 'leads',
    action: 'view_admin_tab',
    isActive: true
  },
  {
    name: 'metrics:view_tab',
    description: 'Ver pestaña de Monitoreo',
    module: 'metrics',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'roles:view_tab',
    description: 'Ver pestaña de Roles',
    module: 'roles',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'docs:view_tab',
    description: 'Ver pestaña de Documentación',
    module: 'docs',
    action: 'view_tab',
    isActive: true
  },
  {
    name: 'settings:view_tab',
    description: 'Ver pestaña de Configuración',
    module: 'settings',
    action: 'view_tab',
    isActive: true
  },
  // Permisos para pestañas del perfil de lead
  {
    name: 'leads:view_info_tab',
    description: 'Ver pestaña de Información en perfil de lead',
    module: 'leads',
    action: 'view_info_tab',
    isActive: true
  },
  {
    name: 'leads:view_activities_tab',
    description: 'Ver pestaña de Actividades en perfil de lead',
    module: 'leads',
    action: 'view_activities_tab',
    isActive: true
  },
  {
    name: 'leads:view_tasks_tab',
    description: 'Ver pestaña de Tareas en perfil de lead',
    module: 'leads',
    action: 'view_tasks_tab',
    isActive: true
  },
  {
    name: 'leads:view_documents_tab',
    description: 'Ver pestaña de Documentos en perfil de lead',
    module: 'leads',
    action: 'view_documents_tab',
    isActive: true
  },
  {
    name: 'leads:view_notes_tab',
    description: 'Ver pestaña de Notas en perfil de lead',
    module: 'leads',
    action: 'view_notes_tab',
    isActive: true
  },
  // Permisos para botones de actividades en perfil de lead
  {
    name: 'leads:new_activity',
    description: 'Añadir nueva actividad en perfil de lead',
    module: 'leads',
    action: 'new_activity',
    isActive: true
  },
  {
    name: 'leads:edit_activity',
    description: 'Editar actividad en perfil de lead',
    module: 'leads',
    action: 'edit_activity',
    isActive: true
  },
  {
    name: 'leads:delete_activity',
    description: 'Eliminar actividad en perfil de lead',
    module: 'leads',
    action: 'delete_activity',
    isActive: true
  },
  // Permisos para botones de tareas en perfil de lead
  {
    name: 'leads:new_task',
    description: 'Añadir nueva tarea en perfil de lead',
    module: 'leads',
    action: 'new_task',
    isActive: true
  },
  {
    name: 'leads:edit_task',
    description: 'Editar tarea en perfil de lead',
    module: 'leads',
    action: 'edit_task',
    isActive: true
  },
  {
    name: 'leads:delete_task',
    description: 'Eliminar tarea en perfil de lead',
    module: 'leads',
    action: 'delete_task',
    isActive: true
  },
  // Permisos para botones de notas en perfil de lead
  {
    name: 'leads:new_note',
    description: 'Añadir nueva nota en perfil de lead',
    module: 'leads',
    action: 'new_note',
    isActive: true
  },
  {
    name: 'leads:edit_note',
    description: 'Editar nota en perfil de lead',
    module: 'leads',
    action: 'edit_note',
    isActive: true
  },
  {
    name: 'leads:delete_note',
    description: 'Eliminar nota en perfil de lead',
    module: 'leads',
    action: 'delete_note',
    isActive: true
  },
  // Permiso para anular leads
  {
    name: 'leads:annul_lead',
    description: 'Anular lead',
    module: 'leads',
    action: 'annul_lead',
    isActive: true
  },

  // Permisos de oportunidades
  {
    name: 'opportunities:read',
    description: 'Ver oportunidades',
    module: 'opportunities',
    action: 'read',
    isActive: true
  },
  {
    name: 'opportunities:create',
    description: 'Crear oportunidades',
    module: 'opportunities',
    action: 'create',
    isActive: true
  },
  {
    name: 'opportunities:update',
    description: 'Actualizar oportunidades',
    module: 'opportunities',
    action: 'update',
    isActive: true
  },
  {
    name: 'opportunities:delete',
    description: 'Eliminar oportunidades',
    module: 'opportunities',
    action: 'delete',
    isActive: true
  },
  {
    name: 'opportunities:assign',
    description: 'Asignar oportunidades a vendedores',
    module: 'opportunities',
    action: 'assign',
    isActive: true
  },
  {
    name: 'opportunities:unassign',
    description: 'Desasignar oportunidades de vendedores',
    module: 'opportunities',
    action: 'unassign',
    isActive: true
  },
  {
    name: 'opportunities:transfer',
    description: 'Transferir leads a oportunidades',
    module: 'opportunities',
    action: 'transfer',
    isActive: true
  },
  {
    name: 'opportunities:comment',
    description: 'Comentar en oportunidades',
    module: 'opportunities',
    action: 'comment',
    isActive: true
  },
  {
    name: 'opportunities:view_all',
    description: 'Ver todas las oportunidades (managers)',
    module: 'opportunities',
    action: 'view_all',
    isActive: true
  },
  {
    name: 'opportunities:view_own',
    description: 'Ver solo oportunidades propias',
    module: 'opportunities',
    action: 'view_own',
    isActive: true
  },
  {
    name: 'opportunities:close',
    description: 'Cerrar oportunidades',
    module: 'opportunities',
    action: 'close',
    isActive: true
  },
  {
    name: 'opportunities:view_tab',
    description: 'Ver pestaña de Oportunidades',
    module: 'opportunities',
    action: 'view_tab',
    isActive: true
  }
];

export const seedPermissions = async () => {
  try {
    // Eliminar permisos existentes
    await Permission.deleteMany({});
    console.log('Permisos existentes eliminados');
    
    // Crear nuevos permisos
    await Permission.insertMany(permissions);
    console.log(`${permissions.length} permisos sembrados correctamente`);
  } catch (error) {
    console.error('Error al sembrar permisos:', error);
  }
}; 