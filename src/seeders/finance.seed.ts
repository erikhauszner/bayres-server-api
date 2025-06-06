import mongoose from 'mongoose';
import { TransactionCategory, ExpenseCategory } from '../models/Finance';
import Employee from '../models/Employee';
import Role from '../models/Role';

export async function seedFinanceData() {
  try {
    console.log('Iniciando seed de datos financieros...');
    
    // Primero, encontrar el rol de administrador
    const adminRole = await Role.findOne({ name: 'admin' });
    
    if (!adminRole) {
      console.error('No se encontró el rol de administrador');
      return;
    }
    
    // Luego, buscar un empleado con ese rol
    const admin = await Employee.findOne({ role: adminRole._id });
    
    if (!admin) {
      console.error('No se encontró un empleado con rol de administrador');
      
      // Como alternativa, buscar cualquier empleado activo
      const anyEmployee = await Employee.findOne({ isActive: true });
      
      if (!anyEmployee) {
        console.error('No se encontraron empleados activos en el sistema');
        return;
      }
      
      console.log('Usando un empleado activo como creador de las categorías');
      seedCategories(anyEmployee._id);
    } else {
      console.log('Usando administrador como creador de las categorías');
      seedCategories(admin._id);
    }
    
  } catch (error) {
    console.error('Error en el seed de datos financieros:', error);
  }
}

// Función para crear las categorías con el ID del creador
async function seedCategories(creatorId: any) {
  // Categorías de gastos
  const expenseCategories = [
    { name: 'Alquiler', description: 'Pagos de alquiler de oficinas' },
    { name: 'Servicios', description: 'Agua, luz, internet, etc.' },
    { name: 'Salarios', description: 'Pagos de salarios a empleados' },
    { name: 'Marketing', description: 'Gastos de publicidad y marketing' },
    { name: 'Software', description: 'Suscripciones a software y servicios en línea' },
    { name: 'Hardware', description: 'Compra de equipos informáticos' },
    { name: 'Viajes', description: 'Gastos de viajes de negocios' },
    { name: 'Formación', description: 'Cursos y formación de empleados' },
    { name: 'Impuestos', description: 'Pagos de impuestos' },
    { name: 'Otros', description: 'Otros gastos no categorizados' }
  ];
  
  // Categorías de transacciones
  const transactionCategories = [
    // Ingresos
    { name: 'Ventas', type: 'income', description: 'Ingresos por ventas de productos o servicios', color: '#2ecc71' },
    { name: 'Servicios', type: 'income', description: 'Ingresos por prestación de servicios', color: '#27ae60' },
    { name: 'Comisiones', type: 'income', description: 'Ingresos por comisiones', color: '#3498db' },
    { name: 'Inversiones', type: 'income', description: 'Rendimientos de inversiones', color: '#2980b9' },
    { name: 'Reembolsos', type: 'income', description: 'Reembolsos recibidos', color: '#9b59b6' },
    
    // Gastos
    { name: 'Operativos', type: 'expense', description: 'Gastos operativos del negocio', color: '#e74c3c' },
    { name: 'Nómina', type: 'expense', description: 'Pagos de nómina a empleados', color: '#c0392b' },
    { name: 'Marketing', type: 'expense', description: 'Gastos de publicidad y marketing', color: '#e67e22' },
    { name: 'Impuestos', type: 'expense', description: 'Pagos de impuestos', color: '#d35400' },
    { name: 'Suministros', type: 'expense', description: 'Compra de suministros de oficina', color: '#f39c12' },
    { name: 'Servicios', type: 'expense', description: 'Pago de servicios (agua, luz, internet)', color: '#f1c40f' },
    { name: 'Alquiler', type: 'expense', description: 'Alquiler de oficinas o locales', color: '#16a085' },
    
    // Transferencias
    { name: 'Entre cuentas', type: 'transfer', description: 'Transferencias entre cuentas propias', color: '#1abc9c' },
    { name: 'A proveedores', type: 'transfer', description: 'Transferencias a proveedores', color: '#3498db' },
    { name: 'A empleados', type: 'transfer', description: 'Transferencias a empleados', color: '#2980b9' }
  ];
  
  // Insertar categorías de gastos si no existen
  for (const category of expenseCategories) {
    const exists = await ExpenseCategory.findOne({ name: category.name });
    if (!exists) {
      await ExpenseCategory.create({
        ...category,
        createdBy: creatorId
      });
      console.log(`Categoría de gasto creada: ${category.name}`);
    }
  }
  
  // Insertar categorías de transacciones si no existen
  for (const category of transactionCategories) {
    const exists = await TransactionCategory.findOne({ 
      name: category.name, 
      type: category.type 
    });
    
    if (!exists) {
      await TransactionCategory.create({
        ...category,
        createdBy: creatorId
      });
      console.log(`Categoría de transacción creada: ${category.name} (${category.type})`);
    }
  }
  
  console.log('Seed de datos financieros completado');
} 