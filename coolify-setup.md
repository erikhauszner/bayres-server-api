# Configuración de Despliegue en Coolify con HTTPS

## Problema de contenido mixto (Mixed Content)

Cuando cargas una página por HTTPS (panel.bayreshub.com), no puedes hacer solicitudes HTTP (inseguras) desde ella. El navegador bloquea estas solicitudes como medida de seguridad.

## Solución: Configurar HTTPS en el servidor API

### Opción 1: Configuración directa en Coolify

Si estás usando Coolify, puedes configurar HTTPS directamente:

1. En el panel de Coolify, selecciona tu aplicación API
2. Ve a la sección "Settings" > "Domains & SSL"
3. Agrega el dominio `api.bayreshub.com`
4. Habilita la opción "HTTPS" y "Auto SSL" para generar certificados automáticamente con Let's Encrypt
5. Guarda los cambios y vuelve a desplegar la aplicación

### Opción 2: Usar proxy inverso (Nginx)

Si prefieres usar Nginx como proxy inverso:

1. Despliega la imagen Docker de la API (puerto 3000)
2. Despliega la imagen Docker de Nginx (puertos 80 y 443)
3. Configura Nginx para redirigir el tráfico a la API
4. Monta los certificados SSL en Nginx

## Variables de entorno correctas

Asegúrate de que todas las variables de entorno estén configuradas correctamente:

```
NEXT_PUBLIC_API_URL=https://api.bayreshub.com
NEXT_PUBLIC_CLIENT_URL=https://panel.bayreshub.com
NEXT_PUBLIC_WEBHOOK_URL=https://n8n.bayreshub.com
```

## Comprobar configuración CORS

Si sigues teniendo problemas, verifica que la configuración CORS en el servidor permita conexiones desde `https://panel.bayreshub.com`. 