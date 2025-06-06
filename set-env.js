const fs = require('fs');
const path = require('path');

const envContent = `MONGODB_URI=mongodb://root:b440084ce208222cc885@easypanel.bayreshub.com:27017/?tls=false
JWT_SECRET=bayres-panel-secret-key-2023
NODE_ENV=development
PORT=3000
CLIENT_URL=https://panel.bayreshub.com`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('Archivo .env creado exitosamente'); 