import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

let io: SocketIOServer | null = null;

// Inicializar Socket.IO
export const initializeSocket = (server: http.Server, allowedOrigins: string[]) => {
  io = new SocketIOServer(server, {
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

  return io;
};

// Función para obtener la instancia de io
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado. Llama a initializeSocket() primero.');
  }
  return io;
};

// Función para verificar si io está disponible
export const isSocketInitialized = (): boolean => {
  return io !== null;
}; 