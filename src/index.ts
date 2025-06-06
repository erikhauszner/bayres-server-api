import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app'; // Importar app.ts en lugar de server.ts
import initializeRoles from './scripts/initializeRoles';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;
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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 