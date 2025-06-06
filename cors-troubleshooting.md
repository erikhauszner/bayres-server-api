# Solución de problemas CORS

Este documento proporciona pasos para resolver problemas CORS en tu aplicación.

## Error típico de CORS

```
Access to fetch at 'https://api.bayreshub.com/health' from origin 'https://panel.bayreshub.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Soluciones implementadas

1. **Configuración CORS en Express**: Se ha configurado Express para manejar solicitudes CORS.
2. **Manejo explícito de OPTIONS**: Se han agregado controladores OPTIONS para las rutas /health y /api/health.
3. **Configuración CORS en Nginx**: Nginx está configurado para agregar encabezados CORS.

## Verificación

1. Ejecuta el script de prueba CORS:
   ```
   node cors-test.js
   ```

2. Verifica la respuesta para confirmar que los encabezados CORS estén presentes.

## Soluciones adicionales

Si sigues teniendo problemas CORS:

### 1. Asegúrate de que Coolify esté configurado correctamente

En Coolify, verifica la configuración de proxy y asegúrate de que no esté eliminando los encabezados CORS. Algunas configuraciones para Coolify:

```yaml
forwardAuth:
  name: api.bayreshub.com
  cors:
    enabled: true
    allowOrigin: https://panel.bayreshub.com
    allowMethods: GET,POST,PUT,DELETE,OPTIONS
    allowHeaders: Content-Type,Authorization
    allowCredentials: true
```

### 2. Configurar un proxy de desarrollo

Durante el desarrollo, puedes configurar un proxy en el cliente Next.js:

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.bayreshub.com/api/:path*',
      },
    ];
  },
};
```

### 3. Verificar la configuración del navegador

Algunos navegadores tienen restricciones adicionales para CORS. Prueba diferentes navegadores para verificar si el problema es específico de un navegador.

### 4. Usar un servicio como CORS Anywhere

En casos extremos, puedes usar un servicio proxy CORS como https://cors-anywhere.herokuapp.com/ o configurar uno propio. 