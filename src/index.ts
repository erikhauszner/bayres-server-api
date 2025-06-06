import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import app from './app';
import initializeRoles from './scripts/initializeRoles';

// Configuración de variables de entorno
// Primero intentamos cargar desde .env.local (desarrollo local)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

// Si no se cargaron todas las variables, cargamos el .env normal como fallback
if (!process.env.MONGODB_URI || !process.env.PORT || !process.env.JWT_SECRET) {
  console.log('No se encontró .env.local completo, usando .env como fallback');
  dotenv.config();
}

// Verificar que todas las variables requeridas existan
const requiredEnvVars = ['MONGODB_URI', 'PORT', 'JWT_SECRET', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Las siguientes variables de entorno son requeridas y no están definidas: ${missingVars.join(', ')}`);
  console.error('Por favor, asegúrese de configurar correctamente su archivo .env.local o .env');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI!;
console.log(`Conectando a MongoDB: ${MONGODB_URI.includes('@') ? MONGODB_URI.split('@')[0].substring(0, 15) + '...' : MONGODB_URI.substring(0, 25) + '...'}`);

// Inicializar la base de datos
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    // Inicializar roles y permisos
    await initializeRoles();
    
    // Crear servidor HTTP
    const server = http.createServer(app);

    // Configurar Socket.IO
    const io = require('socket.io')(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Manejador de conexión Socket.IO
    io.on('connection', (socket: any) => {
      console.log('Un cliente se ha conectado a Socket.IO');
      
      // Unirse a una sala basada en empleado ID cuando el cliente lo solicite
      socket.on('join', (roomName: string) => {
        socket.join(roomName);
        console.log(`Cliente unido a la sala: ${roomName}`);
      });
      
      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log('Un cliente se ha desconectado de Socket.IO');
      });
    });

    // Hacer disponible io para otros módulos
    app.set('io', io);

    // Iniciar servidor
    const PORT = parseInt(process.env.PORT!);
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
  });

// Exportar app para pruebas
export default app; 