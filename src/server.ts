import http from 'http';
import app from './app';
import { Server as SocketIOServer } from 'socket.io';

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO con configuración simplificada
const io = new SocketIOServer(server, {
  cors: {
    origin: ['https://api.bayreshub.com', 'https://panel.bayreshub.com'],
    methods: ["GET", "POST"],
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

// Exportar io para usarlo en otras partes de la aplicación
export { io };

// Iniciar el servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP ejecutándose en el puerto ${PORT}`);
  console.log(`Socket.IO esperando conexiones en ws://api.bayreshub.com/socket.io/`);
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