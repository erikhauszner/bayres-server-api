// Script simple para verificar que el servidor está funcionando
console.log('Iniciando test del servidor...');

const http = require('http');

// Hacer una petición GET a la API
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`ESTADO: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPUESTA:', data);
    console.log('El servidor está respondiendo correctamente.');
  });
});

req.on('error', (error) => {
  console.error('ERROR: No se pudo conectar al servidor:', error.message);
  console.log('Verifica que el servidor esté en ejecución en el puerto 3000.');
});

req.end();

console.log('Petición enviada, esperando respuesta...'); 