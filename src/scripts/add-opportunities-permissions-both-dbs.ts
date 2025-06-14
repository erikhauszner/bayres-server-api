import mongoose from 'mongoose';
import Permission from '../models/Permission';
import Role from '../models/Role';

// Configuraciones de base de datos
const LOCAL_DB = 'mongodb://localhost:27017/bayres-crm';
const PRODUCTION_DB = 'mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/default?directConnection=true';

// Nuevos permisos a agregar
const newPermissions = [
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
  }
];

async function addPermissionsToDatabase(dbUri: string, dbName: string) {
  try {
    console.log(`\n🔗 Conectando a ${dbName}...`);
    await mongoose.connect(dbUri);
    console.log(`✅ Conexión establecida con ${dbName}`);

    // Verificar si los permisos ya existen
    const existingPermissions = await Permission.find({
      name: { $in: newPermissions.map(p => p.name) }
    });

    console.log(`📋 Permisos existentes en ${dbName}: ${existingPermissions.length}`);

    // Agregar permisos que no existen
    const permissionsToAdd = newPermissions.filter(newPerm => 
      !existingPermissions.some(existing => existing.name === newPerm.name)
    );

    if (permissionsToAdd.length > 0) {
      const createdPermissions = await Permission.insertMany(permissionsToAdd);
      console.log(`✅ Agregados ${createdPermissions.length} nuevos permisos en ${dbName}`);

      // Buscar roles que deberían tener estos permisos
      const rolesToUpdate = await Role.find({
        name: { 
          $in: [
            'Administrador',
            'Manager',
            'Vendedor',
            'Comisionista',
            'Supervisor'
          ]
        }
      });

      console.log(`👥 Encontrados ${rolesToUpdate.length} roles para actualizar en ${dbName}`);

      // Agregar los permisos a cada rol
      for (const role of rolesToUpdate) {
        const permissionIds = createdPermissions.map(p => p._id);
        
        // Verificar si ya tiene los permisos
        const missingPermissions = permissionIds.filter((permId: any) => 
          !role.permissions.some(rolePermId => rolePermId.toString() === permId.toString())
        );

        if (missingPermissions.length > 0) {
          role.permissions.push(...missingPermissions as any[]);
          await role.save();
          console.log(`✅ Agregados ${missingPermissions.length} permisos al rol: ${role.name} en ${dbName}`);
        } else {
          console.log(`ℹ️  El rol ${role.name} ya tiene todos los permisos en ${dbName}`);
        }
      }
    } else {
      console.log(`ℹ️  Todos los permisos ya existen en ${dbName}`);
    }

    await mongoose.disconnect();
    console.log(`🔌 Desconectado de ${dbName}`);

  } catch (error) {
    console.error(`❌ Error en ${dbName}:`, error);
    await mongoose.disconnect();
  }
}

async function main() {
  console.log('🚀 Iniciando proceso de agregar permisos de oportunidades del dashboard...\n');

  // Agregar a base de datos local
  await addPermissionsToDatabase(LOCAL_DB, 'Base de datos LOCAL');

  // Agregar a base de datos de producción
  await addPermissionsToDatabase(PRODUCTION_DB, 'Base de datos PRODUCCIÓN');

  console.log('\n🎉 Proceso completado exitosamente');
}

// Ejecutar el script
main().catch(console.error); 