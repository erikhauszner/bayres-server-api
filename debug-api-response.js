const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function debugApiResponse() {
  try {
    console.log('=== VERIFICANDO RESPUESTA DEL API ===');
    
    const employeeId = '680417e8cc062484f63f5429';
    
    // Probar el endpoint de todos los empleados
    console.log('\n1. Endpoint: /api/employees/status/all');
    try {
      const allEmployees = await makeRequest('/api/employees/status/all');
      
      const targetEmployee = allEmployees.find(emp => emp._id === employeeId);
      
      if (targetEmployee) {
        console.log('Empleado encontrado:');
        console.log('- ID:', targetEmployee._id);
        console.log('- Nombre:', targetEmployee.firstName, targetEmployee.lastName);
        console.log('- Estado:', targetEmployee.status);
        console.log('- activeTime (campo original):', targetEmployee.activeTime || 'No disponible');
        console.log('- activeTimeFormatted (campo original):', targetEmployee.activeTimeFormatted || 'No disponible');
        
        if (targetEmployee.statistics) {
          console.log('- statistics.onlineTime:', targetEmployee.statistics.onlineTime + ' segundos');
          console.log('- statistics.onlineTimeFormatted:', targetEmployee.statistics.onlineTimeFormatted);
          console.log('- statistics.breakTime:', targetEmployee.statistics.breakTime + ' segundos');
          console.log('- statistics.offlineTime:', targetEmployee.statistics.offlineTime + ' segundos');
          console.log('- statistics.totalTimeFormatted:', targetEmployee.statistics.totalTimeFormatted);
        } else {
          console.log('- statistics: No disponible');
        }
      } else {
        console.log('❌ Empleado no encontrado en la respuesta');
      }
    } catch (error) {
      console.log('❌ Error al llamar al endpoint /api/employees/status/all:', error.message);
    }
    
    // Probar el endpoint específico del empleado
    console.log('\n2. Endpoint: /api/employees/' + employeeId + '/status');
    try {
      const employeeStatus = await makeRequest(`/api/employees/${employeeId}/status`);
      
      console.log('Respuesta del endpoint específico:');
      console.log('- ID:', employeeStatus._id);
      console.log('- Estado:', employeeStatus.status);
      console.log('- isOnline:', employeeStatus.isOnline);
      console.log('- activeTime:', employeeStatus.activeTime + ' minutos');
      console.log('- activeTimeFormatted:', employeeStatus.activeTimeFormatted);
      console.log('- activeSessions:', employeeStatus.activeSessions);
    } catch (error) {
      console.log('❌ Error al llamar al endpoint específico:', error.message);
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Esperar un poco para que el servidor esté listo
setTimeout(debugApiResponse, 3000); 