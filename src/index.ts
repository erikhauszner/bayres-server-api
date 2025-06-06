import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './server'; // Importar server.ts directamente para iniciar el servidor HTTP
import initializeRoles from './scripts/initializeRoles';

// Cargar variables de entorno
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:b440084ce208222cc885@easypanel.bayreshub.com:27017/?tls=false';

// Inicializar la base de datos
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    // Inicializar roles y permisos
    await initializeRoles();
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
  });

// El servidor se inicia automáticamente en server.ts 