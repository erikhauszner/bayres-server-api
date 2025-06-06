import mongoose from 'mongoose';
import { seedPermissions } from '../seeders/permissions.seed';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/default?directConnection=true';
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida correctamente');
    
    console.log('Iniciando proceso de sembrado de permisos...');
    await seedPermissions();
    console.log('Permisos sembrados correctamente.');
    
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

main(); 