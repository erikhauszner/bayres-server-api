import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './server'; // Importar server.ts en lugar de app.ts
// Cargar variables de entorno
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://147.93.36.93:27017/bayres-panel';

// Inicializar la base de datos
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    // Inicializar roles y permisos
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
  });

// El servidor se inicia en server.ts 