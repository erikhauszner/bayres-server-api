import mongoose from 'mongoose';
import Permission from '../models/Permission';

// Cadena de conexión a la base de datos de producción
const MONGODB_URI = 'mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/default?directConnection=true';

// Nuevos permisos que se agregaron al enum
const newLeadsPermissions = [
  {
    name: 'leads:stage_edit_appsetters',
    description: 'Permite editar etapas de leads específicamente para AppSetters',
    module: 'leads',
    action: 'stage_edit_appsetters',
    isActive: true
  },
  {
    name: 'leads:unassign',
    description: 'Permite desasignar leads de empleados',
    module: 'leads',
    action: 'unassign',
    isActive: true
  },
  {
    name: 'leads:auto_assign',
    description: 'Permite configurar y usar la asignación automática de leads',
    module: 'leads',
    action: 'auto_assign',
    isActive: true
  },
  {
    name: 'leads:view',
    description: 'Permite ver y leer información básica de leads',
    module: 'leads',
    action: 'view',
    isActive: true
  },
  {
    name: 'leads:convert_to_personal_client',
    description: 'Permite convertir un lead a cliente personal',
    module: 'leads',
    action: 'convert_to_personal_client',
    isActive: true
  },
  {
    name: 'leads:convert_to_business_client',
    description: 'Permite convertir un lead a cliente empresarial',
    module: 'leads',
    action: 'convert_to_business_client',
    isActive: true
  }
];

async function addNewLeadsPermissions() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente');

    console.log('🔍 Verificando permisos existentes...');
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const permissionData of newLeadsPermissions) {
      // Verificar si el permiso ya existe
      const existingPermission = await Permission.findOne({
        module: permissionData.module,
        action: permissionData.action
      });

      if (existingPermission) {
        console.log(`⚠️  Permiso ya existe: ${permissionData.name}`);
        skippedCount++;
        continue;
      }

      // Crear el nuevo permiso
      try {
        const newPermission = new Permission(permissionData);
        await newPermission.save();
        console.log(`✅ Permiso agregado: ${permissionData.name}`);
        addedCount++;
      } catch (error: any) {
        // Si es error de duplicado, lo manejamos como skipped
        if (error.code === 11000) {
          console.log(`⚠️  Permiso duplicado (saltado): ${permissionData.name}`);
          skippedCount++;
        } else {
          console.error(`❌ Error agregando permiso ${permissionData.name}:`, error.message);
        }
      }
    }

    console.log('\n📊 Resumen de la operación:');
    console.log(`✅ Permisos agregados: ${addedCount}`);
    console.log(`⚠️  Permisos saltados (ya existían): ${skippedCount}`);
    console.log(`📝 Total procesados: ${newLeadsPermissions.length}`);

    // Verificar todos los permisos de leads existentes
    console.log('\n🔍 Verificando todos los permisos de leads en la base de datos...');
    const allLeadsPermissions = await Permission.find({ module: 'leads' }).sort({ action: 1 });
    console.log(`📋 Total de permisos de leads en la base de datos: ${allLeadsPermissions.length}`);
    
    console.log('\n📝 Lista de todos los permisos de leads:');
    allLeadsPermissions.forEach((permission, index) => {
      console.log(`${index + 1}. ${permission.name} (${permission.action}) - ${permission.isActive ? 'Activo' : 'Inactivo'}`);
    });

  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Cerrando conexión a MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar el script
console.log('🚀 Iniciando script para agregar nuevos permisos de leads...');
console.log('🎯 Objetivo: Agregar solo los permisos nuevos sin afectar los existentes');
console.log('📅 Fecha:', new Date().toISOString());
console.log('');

addNewLeadsPermissions().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 