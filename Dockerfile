# Etapa de construcción
FROM node:18-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias con cache optimizado
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build
RUN echo "Contenido del directorio dist:"
RUN find dist -type f | sort

# Etapa de producción
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Crear un usuario no-root para producción
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copiar archivos necesarios desde la etapa de construcción
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN echo "Verificando contenido del directorio dist en la etapa de producción:"
RUN find dist -type f | sort
RUN ls -la dist

# Crear y configurar directorio de uploads
RUN mkdir -p uploads
RUN chown -R appuser:nodejs uploads

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Establecer permisos correctos
RUN chown -R appuser:nodejs /app

# Cambiar al usuario no-root
USER appuser

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación con la ruta correcta
CMD ["node", "dist/src/index.js"] 