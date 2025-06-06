import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './server'; // Importar server.ts directamente para iniciar el servidor HTTP
import initializeRoles from './scripts/initializeRoles';

// Cargar variables de entorno
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/bayres-panel?directConnection=true';

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