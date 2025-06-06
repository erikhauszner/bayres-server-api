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

// Función para iniciar el servidor HTTP en un puerto específico
const startServer = (port: number, server: http.Server) => {
  return new Promise<void>((resolve, reject) => {
    server.listen(port)
      .on('listening', () => {
        console.log(`Servidor corriendo en puerto ${port}`);
        resolve();
      })
      .on('error', (err: NodeJS.ErrnoException) => {
        // Si el puerto está en uso, rechazar con el error
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ El puerto ${port} ya está en uso.`);
          reject(err);
        } else {
          console.error('Error al iniciar el servidor:', err);
          reject(err);
        }
      });
  });
};

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

    // Iniciar servidor con manejo de errores
    let PORT = parseInt(process.env.PORT!);
    const originalPort = PORT;
    let maxRetries = 3;
    let retries = 0;

    // Intento inicial con el puerto configurado
    try {
      await startServer(PORT, server);
      const serverUrl = `http://localhost:${PORT}`;
      console.log(`Servidor API disponible en: ${serverUrl}`);
      console.log(`Socket.IO esperando conexiones en ws://${process.env.HOST || 'localhost'}:${PORT}/socket.io/`);
    } catch (err) {
      // Si el puerto original está ocupado, intentar con puertos alternativos
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        let serverStarted = false;
        
        while (retries < maxRetries && !serverStarted) {
          retries++;
          PORT = originalPort + retries; // Intentar con puerto + 1, puerto + 2, etc.
          
          try {
            console.log(`Intentando con puerto alternativo: ${PORT}`);
            await startServer(PORT, server);
            serverStarted = true;
            const serverUrl = `http://localhost:${PORT}`;
            console.log(`Servidor API disponible en: ${serverUrl}`);
            console.log(`Socket.IO esperando conexiones en ws://${process.env.HOST || 'localhost'}:${PORT}/socket.io/`);
          } catch (retryErr) {
            console.warn(`No se pudo iniciar en el puerto ${PORT}, intentando otro...`);
          }
        }
        
        if (!serverStarted) {
          console.error(`No se pudo iniciar el servidor después de ${maxRetries} intentos.`);
          console.error('Por favor, libere uno de estos puertos o configure un puerto diferente en las variables de entorno.');
          process.exit(1);
        }
      } else {
        // Error diferente al de puerto ocupado
        console.error('Error al iniciar el servidor:', err);
        process.exit(1);
      }
    }
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Exportar app para pruebas
export default app; 