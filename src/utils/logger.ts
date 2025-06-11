import fs from 'fs';
import path from 'path';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';

// Determinar si estamos en entorno de producción
const isProduction = process.env.NODE_ENV === 'production';

// Configurar directorio de logs
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Interfaces para los tipos de log
interface LogInfo {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

// Configurar formato de log
const logFormat = format.printf((info) => {
  const { level, message, timestamp, ...meta } = info;
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Crear instancia del logger
const logger: WinstonLogger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Siempre escribir a consola en desarrollo
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
      silent: isProduction, // Silenciar en producción
    }),
    // Escribir todos los logs a un archivo
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Archivo para todos los logs
    new transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Sanitizar información sensible
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Ocultar tokens JWT
    if (data.includes('eyJ') && data.includes('.') && data.length > 50) {
      return data.substring(0, 10) + '...[TOKEN]';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Ocultar datos sensibles
      if (['password', 'token', 'secret', 'jwt', 'apiKey', 'Authorization'].includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

// Exportar funciones específicas para cada nivel de log
export const Logger = {
  /**
   * Registra información general, disponible en todos los entornos
   */
  info: (message: string, meta: Record<string, any> = {}): void => {
    logger.info(message, sanitizeData(meta));
  },
  
  /**
   * Registra advertencias, disponible en todos los entornos
   */
  warn: (message: string, meta: Record<string, any> = {}): void => {
    logger.warn(message, sanitizeData(meta));
  },
  
  /**
   * Registra errores, disponible en todos los entornos
   */
  error: (message: string, error?: Error | any, meta: Record<string, any> = {}): void => {
    if (error instanceof Error) {
      logger.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...sanitizeData(meta),
      });
    } else {
      logger.error(message, { ...sanitizeData(meta), error: sanitizeData(error) });
    }
  },
  
  /**
   * Registra información de depuración, solo visible en desarrollo
   */
  debug: (message: string, meta: Record<string, any> = {}): void => {
    logger.debug(message, sanitizeData(meta));
  },
  
  /**
   * Registra información de autenticación con sanitización especial
   */
  auth: (message: string, meta: Record<string, any> = {}): void => {
    logger.info(`[AUTH] ${message}`, sanitizeData(meta));
  },
  
  /**
   * Registra información de seguridad, siempre se guarda incluso en producción
   */
  security: (message: string, meta: Record<string, any> = {}): void => {
    logger.warn(`[SECURITY] ${message}`, sanitizeData(meta));
  },
};

export default Logger; 