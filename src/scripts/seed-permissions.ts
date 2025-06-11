import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { seedPermissions } from '../seeders/permissions.seed';

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

    // Sembrar los permisos
    await seedPermissions();
    console.log('Permisos sembrados correctamente');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

main(); 