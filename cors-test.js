// Script para verificar los encabezados CORS
const https = require('https');

console.log('Verificando configuración CORS...');

// Opciones para la solicitud OPTIONS preflight
const options = {
//  hostname: 'api.bayreshub.com',
  hostname: 'localhost:3000',
  port: 443, // Puerto HTTPS estándar
  path: '/health',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://panel.bayreshub.com',
    'Origin': 'https://localhost:3001',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Content-Type'
  }
};

const req = https.request(options, (res) => {
  console.log('\nRESPUESTA PREFLIGHT OPTIONS:');
  console.log(`Código de estado: ${res.statusCode}`);
  console.log('\nENCACEBEZADOS CORS:');
  console.log(`Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NO PRESENTE'}`);
  console.log(`Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NO PRESENTE'}`);
  console.log(`Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NO PRESENTE'}`);
  console.log(`Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NO PRESENTE'}`);
  
  if (res.statusCode === 204 || res.statusCode === 200) {
    if (res.headers['access-control-allow-origin'] === 'https://panel.bayreshub.com' ||
        res.headers['access-control-allow-origin'] === 'https://localhost:3001' ||
        res.headers['access-control-allow-origin'] === '*') {
      console.log('\n✅ La configuración CORS parece correcta.');
    } else {
      console.log('\n❌ El encabezado Access-Control-Allow-Origin no tiene el valor esperado.');
    }
  } else {
    console.log('\n❌ La solicitud preflight no devolvió 204 o 200, la configuración CORS puede no ser correcta.');
  }
});

req.on('error', (error) => {
  console.error('\n❌ ERROR AL CONECTAR:', error.message);
  console.log('Verifica que el servidor esté en ejecución y sea accesible.');
});

req.end();

console.log('Enviando solicitud preflight OPTIONS...'); 