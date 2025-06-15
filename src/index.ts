import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import app from './app';
import initializeRoles from './scripts/initializeRoles';
import { Server as SocketIOServer } from 'socket.io';
import { CronService } from './services/cronService';
import { SessionSchedulerService } from './services/session-scheduler.service';
import { AutoDisconnectService } from './services/AutoDisconnectService';

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
const PORT = parseInt(process.env.PORT!) || 3000;
const HOST = process.env.HOST || 'localhost';
const isProduction = process.env.NODE_ENV === 'production';

console.log(`Conectando a MongoDB: ${MONGODB_URI.includes('@') ? MONGODB_URI.split('@')[0].substring(0, 15) + '...' : MONGODB_URI.substring(0, 25) + '...'}`);

// Inicializar la base de datos
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    // Inicializar roles y permisos
    await initializeRoles();
    
    // **INICIALIZAR SISTEMA DE LIMPIEZA DE SESIONES**
    try {
      await SessionSchedulerService.start();
      console.log('✅ Sistema de limpieza de sesiones iniciado correctamente');
    } catch (error) {
      console.error('❌ Error al iniciar sistema de limpieza de sesiones:', error);
      // No detener el servidor por este error, solo registrarlo
    }
    
    // **INICIALIZAR SISTEMA DE DESCONEXIÓN AUTOMÁTICA**
    try {
      AutoDisconnectService.startPeriodicCheck();
      console.log('✅ Sistema de desconexión automática iniciado correctamente');
    } catch (error) {
      console.error('❌ Error al iniciar sistema de desconexión automática:', error);
      // No detener el servidor por este error, solo registrarlo
    }
    
    // Crear servidor HTTP
    const server = http.createServer(app);

    // Definir orígenes permitidos según el entorno
    const productionOrigins = ['https://panel.bayreshub.com', 'https://api.bayreshub.com', 'https://n8n.bayreshub.com'];
    const developmentOrigins = ['http://localhost:3001', `http://${HOST}:${PORT}`];
    
    const allowedOrigins = isProduction ? productionOrigins : developmentOrigins;
    console.log('Orígenes CORS permitidos:', allowedOrigins);

    // Configurar Socket.IO con configuración simplificada
    const io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      path: '/socket.io',
      serveClient: false,
      transports: ['websocket', 'polling']
    });

    // Almacenar las conexiones de socket por ID de empleado
    const employeeSockets = new Map<string, string[]>();

    // Manejar conexiones de socket en el namespace raíz
    io.on('connection', (socket) => {
      console.log('Nuevo cliente conectado:', socket.id);
      
      // Autenticar al usuario y unirse a su sala personal
      socket.on('authenticate', (employeeId: string) => {
        if (!employeeId) return;
        
        console.log(`Empleado ${employeeId} autenticado en socket ${socket.id}`);
        
        // Unir al socket a la sala del empleado
        socket.join(`employee:${employeeId}`);
        
        // Registrar el socket para este empleado
        if (!employeeSockets.has(employeeId)) {
          employeeSockets.set(employeeId, []);
        }
        employeeSockets.get(employeeId)?.push(socket.id);
        
        // Informar al cliente que la autenticación fue exitosa
        socket.emit('authenticated', { success: true });
      });
      
      // Manejar desconexiones
      socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        
        // Eliminar el socket de employeeSockets
        for (const [employeeId, sockets] of employeeSockets.entries()) {
          const index = sockets.indexOf(socket.id);
          if (index !== -1) {
            sockets.splice(index, 1);
            if (sockets.length === 0) {
              employeeSockets.delete(employeeId);
            }
            break;
          }
        }
      });

      // Manejar errores en el socket
      socket.on('error', (error) => {
        console.error('Error en socket:', error);
      });
    });

    // Hacer disponible io para otros módulos
    app.set('io', io);
    
    // Inicializar el sistema de cron jobs para notificaciones automáticas
    CronService.initializeJobs();
    
    // Exportar io para usarlo en otras partes de la aplicación
    // Iniciar el servidor HTTP
    server.listen(PORT, () => {
      console.log(`Servidor HTTP ejecutándose en el puerto ${PORT}`);
      console.log(`Socket.IO esperando conexiones en ws://${HOST}:${PORT}/socket.io/`);
    });

    // Manejar errores del servidor
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Puerto ${PORT} está en uso. Intenta ejecutar el servidor con otro puerto.`);
        process.exit(1);
      } else {
        console.error('Error en el servidor HTTP:', error);
      }
    });
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  });

// Manejo limpio del cierre de la aplicación
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
  CronService.stopAllJobs();
  SessionSchedulerService.stop();
  mongoose.connection.close().then(() => {
    console.log('✅ Conexión a MongoDB cerrada');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
  CronService.stopAllJobs();
  SessionSchedulerService.stop();
  mongoose.connection.close().then(() => {
    console.log('✅ Conexión a MongoDB cerrada');
    process.exit(0);
  });
});

// Exportar app para pruebas
export default app; 