const fs = require('fs');
const path = require('path');

const envContent = `MONGODB_URI=mongodb://localhost:27017/bayres-panel
JWT_SECRET=bayres-panel-secret-key-2023
NODE_ENV=development
PORT=3000
CLIENT_URL=147.93.36.93:3001`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('Archivo .env creado exitosamente'); 