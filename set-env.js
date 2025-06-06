const fs = require('fs');
const path = require('path');

const envContent = `MONGODB_URI=mongodb://root:wNbSKJw096Jnz2tSioZdr8wOztNOFNU1i14LTC5zinXzTYJdjSnamupFikv8nPVG@147.93.36.93:3000/bayres-panel?directConnection=true
JWT_SECRET=bayres-panel-secret-key-2023
NODE_ENV=development
PORT=3000
CLIENT_URL=https://147.93.36.93:3001`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('Archivo .env creado exitosamente'); 