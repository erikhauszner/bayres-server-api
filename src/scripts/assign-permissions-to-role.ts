import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Role from '../models/Role';
import Permission from '../models/Permission';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ID del rol al que se asignarán todos los permisos
const ROLE_ID = '680416e8c7091d8f509ebb0f';

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/?directConnection=true';
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida correctamente');
    
    // Verificar que el rol existe
    const role = await Role.findById(ROLE_ID);
    if (!role) {
      console.error(`No se encontró el rol con ID ${ROLE_ID}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`Rol encontrado: ${role.name}`);
    
    // Obtener todos los permisos activos
    const permissions = await Permission.find({ isActive: true });
    
    if (permissions.length === 0) {
      console.error('No se encontraron permisos activos en la base de datos');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`Se encontraron ${permissions.length} permisos activos`);
    
    // Extraer los IDs de los permisos
    const permissionIds = permissions.map(permission => permission._id);
    
    // Actualizar el rol con todos los permisos
    await Role.findByIdAndUpdate(ROLE_ID, { permissions: permissionIds });
    
    console.log(`Se han asignado ${permissions.length} permisos al rol ${role.name}`);
    
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

// Ejecutar la función principal
main(); 