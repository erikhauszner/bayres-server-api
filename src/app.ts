import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { Router } from 'express';
import { NotificationController } from './controllers/notification.controller';
import { authenticateToken } from './middleware/auth.middleware';
import { authenticateApiKey, checkApiKeyPermissions } from './middleware/apiKey.middleware';
import { RequestHandler } from 'express';
import { LeadController } from './controllers/lead.controller';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

const app = express();

// Crear middleware CORS específico para rutas públicas
const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://panel.bayreshub.com', 'https://api.bayreshub.com', 'https://n8n.bayreshub.com']
    : ['https://panel.bayreshub.com', 'https://api.bayreshub.com', 'https://n8n.bayreshub.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
});

// Middlewares
app.use(corsMiddleware);
app.use(express.json());
app.use(morgan('dev'));

// Configuración para servir archivos estáticos desde la carpeta uploads
const uploadsPath = path.join(__dirname, '../uploads');
console.log(`Sirviendo archivos estáticos desde: ${uploadsPath}`);

// Verificar que el directorio existe
if (!fs.existsSync(uploadsPath)) {
  console.warn(`¡ADVERTENCIA! El directorio de uploads no existe: ${uploadsPath}`);
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`Se ha creado el directorio de uploads: ${uploadsPath}`);
}

// Configurar middleware para servir archivos estáticos
app.use('/uploads', (req, res, next) => {
  console.log(`Solicitud de archivo estático: ${req.url}`);
  
  // Verificar si el archivo existe antes de intentar servirlo
  const filePath = path.join(uploadsPath, req.url);
  if (fs.existsSync(filePath)) {
    console.log(`Archivo encontrado: ${filePath}`);
    next();
  } else {
    console.warn(`Archivo no encontrado: ${filePath}`);
    // Continuar de todos modos por si es un problema de permisos que express static puede manejar
    next();
  }
}, express.static(uploadsPath, {
  maxAge: '1d', // Cache durante 1 día
  fallthrough: false, // Devuelve 404 si no se encuentra el archivo
  immutable: true, // Los archivos no cambian
}));

// Middleware para registrar todas las rutas
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ruta de prueba general con manejo explícito de CORS
app.options('/health', corsMiddleware);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

// Endpoint de health check en /api/health con manejo explícito de CORS
app.options('/api/health', corsMiddleware);
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API protegidas por JWT
app.use('/api', routes);

// Rutas de notificaciones protegidas por JWT
const notificationRouter = Router();
notificationRouter.use(authenticateToken);

// Definir rutas de notificaciones
notificationRouter.get('/', (req, res) => {
  NotificationController.getNotifications(req, res);
});

notificationRouter.get('/count', (req, res) => {
  NotificationController.countUnread(req, res);
});

notificationRouter.put('/:notificationId/read', (req, res) => {
  NotificationController.markAsRead(req, res);
});

notificationRouter.put('/read-all', (req, res) => {
  NotificationController.markAllAsRead(req, res);
});

notificationRouter.delete('/:notificationId', (req, res) => {
  NotificationController.deleteNotification(req, res);
});

notificationRouter.delete('/', (req, res) => {
  NotificationController.deleteAllNotifications(req, res);
});

// Ruta para enviar notificaciones (nueva)
notificationRouter.post('/', (req, res) => {
  NotificationController.sendNotification(req, res);
});

// Registrar el router de notificaciones protegidas por JWT
app.use('/api/notifications', notificationRouter);

// Rutas accesibles a través de API keys
const apiAccessRouter = Router();

// Definir middleware para la API key
const apiKeyAuth: RequestHandler = (req, res, next) => {
  authenticateApiKey(req, res, next);
};

// Proteger todas las rutas con autenticación de API key
apiAccessRouter.use(apiKeyAuth);

// Función auxiliar para verificar permisos de API key
const verifyApiKeyPermissions = (permissions: string[]): RequestHandler => {
  return (req, res, next) => {
    checkApiKeyPermissions(permissions)(req, res, next);
  };
};

// Ruta para enviar notificaciones usando API key
apiAccessRouter.post('/notifications', 
  verifyApiKeyPermissions(['write']), 
  (req, res) => {
    NotificationController.sendNotification(req, res);
  }
);

// Ruta para acceder a la API de leads usando API key

// ID predeterminado para solicitudes con API key (usaremos un ID de sistema)
const SYSTEM_ID = new mongoose.Types.ObjectId('000000000000000000000001');

apiAccessRouter.post('/leads', 
  verifyApiKeyPermissions(['write']), 
  (req, res, next) => {
    // Asignar un ID de sistema para solicitudes con API key
    req.employee = { _id: SYSTEM_ID } as any;
    LeadController.createLead(req, res, next);
  }
);

apiAccessRouter.get('/leads', 
  verifyApiKeyPermissions(['read']), 
  (req, res, next) => {
    // Asignar un ID de sistema para solicitudes con API key
    req.employee = { _id: SYSTEM_ID } as any;
    LeadController.getLeads(req, res, next);
  }
);

apiAccessRouter.get('/leads/:id', 
  verifyApiKeyPermissions(['read']), 
  (req, res, next) => {
    // Asignar un ID de sistema para solicitudes con API key
    req.employee = { _id: SYSTEM_ID } as any;
    LeadController.getLeadById(req, res, next);
  }
);

// Registrar el router de acceso mediante API key
app.use('/api/external', apiAccessRouter);

// Manejador de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error detallado:', err);
  const statusCode = err.statusCode || 500;
  const errorMsg = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error desconocido';
  
  res.status(statusCode).json({ 
    message: errorMsg,
    error: process.env.NODE_ENV !== 'production' ? err.toString() : undefined,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

export default app; 