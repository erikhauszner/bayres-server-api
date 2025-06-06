import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Role from '../models/Role';
import Permission from '../models/Permission';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ID del rol específico
const ROLE_ID = '680416e8c7091d8f509ebb0f';

async function assignSidebarPermissions() {
  try {
    console.log('Conectando a MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://root:b440084ce208222cc885@easypanel.bayreshub.com:27017/?tls=false';
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida correctamente');
    
    // Verificar que el rol existe
    const role = await Role.findById(ROLE_ID);
    if (!role) {
      throw new Error(`No se encontró el rol con ID: ${ROLE_ID}`);
    }
    console.log(`Rol encontrado: ${role.name}`);
    
    // Obtener todos los permisos
    const permissions = await Permission.find({});
    if (permissions.length === 0) {
      throw new Error('No se encontraron permisos en la base de datos');
    }
    console.log(`Encontrados ${permissions.length} permisos para asignar`);
    
    // Obtener los IDs de los permisos
    const permissionIds = permissions.map(permission => permission._id);
    
    // Actualizar el rol con todos los permisos
    const updatedRole = await Role.findByIdAndUpdate(
      ROLE_ID,
      { permissions: permissionIds },
      { new: true }
    );
    
    console.log(`Permisos asignados correctamente al rol: ${updatedRole?.name}`);
    console.log(`Total de permisos asignados: ${updatedRole?.permissions.length}`);
    
    await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Conexión a MongoDB cerrada');
    }
    process.exit(1);
  }
}

// Ejecutar el script
assignSidebarPermissions(); 