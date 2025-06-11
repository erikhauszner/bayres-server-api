import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Permission from '../models/Permission';

// Configuración de variables de entorno
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

// Si no se cargaron todas las variables, cargamos el .env normal como fallback
if (!process.env.MONGODB_URI) {
  console.log('No se encontró .env.local completo, usando .env como fallback');
  dotenv.config();
}

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conexión a MongoDB establecida correctamente');

    // Obtener todos los permisos
    const allPermissions = await Permission.find();
    
    console.log(`Se encontraron ${allPermissions.length} permisos en total`);
    
    // Agrupar por módulo
    const moduleGroups: {[key: string]: number} = {};
    
    allPermissions.forEach(permission => {
      if (!moduleGroups[permission.module]) {
        moduleGroups[permission.module] = 0;
      }
      moduleGroups[permission.module]++;
    });
    
    console.log('Permisos por módulo:');
    Object.entries(moduleGroups).forEach(([module, count]) => {
      console.log(`- ${module}: ${count} permisos`);
    });
    
    // Verificar si existen permisos de monitoreo
    const monitoringPermissions = allPermissions.filter(p => p.module === 'monitoring');
    
    if (monitoringPermissions.length > 0) {
      console.log('\nPermisos de monitoreo encontrados:');
      monitoringPermissions.forEach(p => {
        console.log(`- ${p.name}: ${p.description}`);
      });
    } else {
      console.log('\nNo se encontraron permisos de monitoreo');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

main(); 