const fs = require('fs');
const path = require('path');

const envContent = `MONGODB_URI=mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/bayres-panel?directConnection=true
JWT_SECRET=bayres-panel-secret-key-2023
NODE_ENV=development
PORT=3000
CLIENT_URL=https://panel.bayreshub.com`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('Archivo .env creado exitosamente'); 