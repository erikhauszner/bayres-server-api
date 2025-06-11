const fs = require('fs');
const path = require('path');

// Configuración para PRODUCCIÓN - Cambiar NODE_ENV según el entorno
const envContent = `MONGODB_URI=mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/default?directConnection=true
JWT_SECRET=ee5392100b78a16228abdf0bfc473cb987322f326a1e18f00f9be83704e19dc1
NODE_ENV=production
PORT=3000
CLIENT_URL=https://panel.bayreshub.com

# Para desarrollo local, cambiar a:
# NODE_ENV=development
# CLIENT_URL=http://localhost:3001`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('Archivo .env creado exitosamente'); 