import Permission from '../models/Permission';

const automationPermissions = [
  // Permisos de vista de pestañas
  {
    name: 'automations:view_tab',
    description: 'Ver pestaña de automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  
  // Permisos CRUD básicos
  {
    name: 'automations:read',
    description: 'Ver automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  {
    name: 'automations:create',
    description: 'Crear automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  {
    name: 'automations:update',
    description: 'Editar automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  {
    name: 'automations:delete',
    description: 'Eliminar automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  
  // Permisos de gestión
  {
    name: 'automations:activate',
    description: 'Activar/desactivar automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  {
    name: 'automations:duplicate',
    description: 'Duplicar automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  {
    name: 'automations:stats',
    description: 'Ver estadísticas de automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  },
  
  // Permisos de uso
  {
    name: 'automations:submit',
    description: 'Enviar formularios de automatizaciones',
    category: 'Automatizaciones',
    isActive: true
  }
];

export async function seedAutomationPermissions() {
  console.log('🔐 Iniciando seeder de permisos de automatizaciones...');
  
  try {
    for (const permissionData of automationPermissions) {
      const existingPermission = await Permission.findOne({ name: permissionData.name });
      
      if (!existingPermission) {
        await Permission.create(permissionData);
        console.log(`✅ Permiso creado: ${permissionData.name}`);
      } else {
        console.log(`⚠️  Permiso ya existe: ${permissionData.name}`);
      }
    }
    
    console.log('✅ Seeder de permisos de automatizaciones completado');
  } catch (error) {
    console.error('❌ Error en seeder de permisos de automatizaciones:', error);
    throw error;
  }
}

export default seedAutomationPermissions; 