import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app'; // Importar app.ts en lugar de server.ts
import initializeRoles from './scripts/initializeRoles';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:wNbSKJw096Jnz2tSioZdr8wOztNOFNU1i14LTC5zinXzTYJdjSnamupFikv8nPVG@mongodb-database-gskg08cc0w8ko48os4cswoss:27017/bayres-panel?directConnection=true';

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