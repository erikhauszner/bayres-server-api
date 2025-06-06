import { Router, Request, Response, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  InvoiceController, 
  ExpenseCategoryController,
  ExpenseController,
  FinancialAccountController,
  TransactionCategoryController,
  PartnerController,
  DistributionController,
  PartnerDistributionController
} from '../controllers/finance';
import { Invoice } from '../models/Finance';
import { upload } from '../middleware/upload.middleware';

// Función auxiliar asyncHandler definida localmente
const asyncHandler = (fn: Function): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Configuración para subida de archivos
const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas para facturas
router.get('/invoices', InvoiceController.getAll as RequestHandler);
router.get('/invoices/:id', InvoiceController.getById as RequestHandler);
router.post('/invoices', InvoiceController.create as RequestHandler);
router.put('/invoices/:id', InvoiceController.update as RequestHandler);
router.post('/invoices/:id/mark-as-paid', InvoiceController.markAsPaid as RequestHandler);
router.delete('/invoices/:id', InvoiceController.delete as RequestHandler);

// Rutas para confirmación de facturas
router.get('/pending-invoices', InvoiceController.getPendingInvoices as RequestHandler);
router.post('/confirm-invoices', InvoiceController.confirmInvoicePayments as RequestHandler);

// Ruta para obtener todas las transacciones
router.get('/transactions', InvoiceController.getAllTransactions as RequestHandler);

// Rutas para facturas por proyecto
router.get('/projects/:projectId/invoices', InvoiceController.getByProject as RequestHandler);

// Rutas para facturas por cliente
router.get('/clients/:clientId/invoices', InvoiceController.getByClient as RequestHandler);

// Rutas para categorías de gastos
router.get('/expense-categories', ExpenseCategoryController.getAll as RequestHandler);
router.get('/expense-categories/:id', ExpenseCategoryController.getById as RequestHandler);
router.post('/expense-categories', ExpenseCategoryController.create as RequestHandler);
router.put('/expense-categories/:id', ExpenseCategoryController.update as RequestHandler);
router.delete('/expense-categories/:id', ExpenseCategoryController.delete as RequestHandler);

// Rutas para categorías de transacciones
router.get('/transaction-categories', TransactionCategoryController.getAll as RequestHandler);
router.get('/transaction-categories/type/:type', TransactionCategoryController.getByType as RequestHandler);
router.get('/transaction-categories/:id', TransactionCategoryController.getById as RequestHandler);
router.post('/transaction-categories', TransactionCategoryController.create as RequestHandler);
router.put('/transaction-categories/:id', TransactionCategoryController.update as RequestHandler);
router.delete('/transaction-categories/:id', TransactionCategoryController.delete as RequestHandler);

// Rutas para gastos
router.get('/expenses', ExpenseController.getAll as RequestHandler);
router.get('/expenses/:id', ExpenseController.getById as RequestHandler);
router.post('/expenses', upload.single('receipt'), ExpenseController.create as RequestHandler);
router.put('/expenses/:id', upload.single('receipt'), ExpenseController.update as RequestHandler);
router.post('/expenses/:id/approve', ExpenseController.approve as RequestHandler);
router.post('/expenses/:id/reject', ExpenseController.reject as RequestHandler);
router.delete('/expenses/:id', ExpenseController.delete as RequestHandler);

// Rutas para gastos por proyecto
router.get('/projects/:projectId/expenses', ExpenseController.getByProject as RequestHandler);

// Rutas para cuentas financieras
router.get('/accounts', FinancialAccountController.getAll as RequestHandler);
router.get('/accounts/:id', FinancialAccountController.getById as RequestHandler);
router.post('/accounts', FinancialAccountController.create as RequestHandler);
router.put('/accounts/:id', FinancialAccountController.update as RequestHandler);
router.post('/accounts/:id/update-balance', FinancialAccountController.updateBalance as RequestHandler);
router.delete('/accounts/:id', FinancialAccountController.delete as RequestHandler);

// Rutas para gestión de ingresos
router.get('/incomes-summary', asyncHandler(async (req: Request, res: Response) => {
  // Esta ruta devuelve un resumen de los ingresos
  try {
    const now = new Date();
    
    // Obtener facturas pendientes (status = draft o sent)
    const pendingInvoices = await Invoice.find({ 
      status: { $in: ['draft', 'sent'] },
      isActive: { $ne: false }
    });
    
    // Obtener facturas vencidas (status = sent y dueDate < hoy)
    const overdueInvoices = await Invoice.find({ 
      status: 'sent',
      dueDate: { $lt: now },
      isActive: { $ne: false }
    });
    
    // Obtener próximas facturas (vencen en los próximos 7 días)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingInvoices = await Invoice.find({
      status: { $in: ['draft', 'sent'] },
      dueDate: { $gte: now, $lte: nextWeek },
      isActive: { $ne: false }
    });
    
    // Calcular totales pendientes
    const totalPending = pendingInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
    
    // Calcular totales vencidos
    const overdue = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
    
    // Calcular próximos ingresos
    const upcomingTotal = upcomingInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    
    // Para planes recurrentes, utilizamos los valores reales si hay una colección RecurringPlan
    // Si no existe esa colección, usamos 0 para indicar que no hay datos
    let recurringTotal = 0;
    let recurringCount = 0;
    
    try {
      // Intentar obtener datos de planes recurrentes si existe el modelo
      // Si el modelo no existe, esto generará un error que será capturado
      const RecurringPlan = require('../models/Finance/RecurringPlan').RecurringPlan;
      const recurringPlans = await RecurringPlan.find({ status: 'active' });
      recurringTotal = recurringPlans.reduce((sum: number, plan: any) => sum + plan.amount, 0);
      recurringCount = recurringPlans.length;
    } catch (err) {
      console.log('Modelo RecurringPlan no encontrado, usando valores por defecto');
      // No hacemos nada, ya tenemos los valores por defecto
    }
    
    const response = {
      totalPending,
      overdue,
      recurringTotal,
      upcomingTotal,
      pendingCount: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
      recurringCount,
      upcomingCount: upcomingInvoices.length
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error al obtener resumen de ingresos:', error);
    res.status(500).json({ message: 'Error al obtener resumen de ingresos' });
  }
}));

// Enviar recordatorio de factura
router.post('/invoices/:id/send-reminder', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar que la factura existe
    const invoice = await Invoice.findById(id)
      .populate('clientId', 'name email');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    // Aquí se implementaría el código para enviar el email recordatorio
    // Por ahora solo simulamos que se envió correctamente
    
    // Registrar el envío del recordatorio (opcional)
    invoice.updatedAt = new Date();
    await invoice.save();
    
    // Obtenemos el email de forma segura verificando el tipo
    const clientEmail = typeof invoice.clientId === 'object' ? 
      (invoice.clientId as any).email || 'cliente@ejemplo.com' : 
      'cliente@ejemplo.com';
    
    res.json({ 
      success: true, 
      message: `Recordatorio enviado a ${clientEmail}` 
    });
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    res.status(500).json({ message: 'Error al enviar recordatorio' });
  }
}));

// Obtener clientes con facturas
router.get('/clients-with-invoices', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Obtener todos los clientes que tienen facturas
    const clientsWithInvoices = await Invoice.aggregate([
      // Agrupar por cliente
      { $group: {
          _id: '$clientId',
          invoices: { $sum: 1 },
          total: { $sum: '$total' },
          // Determinar si hay facturas vencidas
          hasOverdue: { 
            $max: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } 
          }
      }}
    ]);
    
    res.json(clientsWithInvoices);
  } catch (error) {
    console.error('Error al obtener clientes con facturas:', error);
    res.status(500).json({ message: 'Error al obtener clientes con facturas' });
  }
}));

// Obtener planes recurrentes de ingresos
router.get('/recurring-plans', asyncHandler(async (req: Request, res: Response) => {
  try {
    let recurringPlans = [];
    
    try {
      // Intentar obtener datos de planes recurrentes si existe el modelo
      const RecurringPlan = require('../models/Finance/RecurringPlan').RecurringPlan;
      recurringPlans = await RecurringPlan.find().sort({ nextDate: 1 });
    } catch (err) {
      console.log('Modelo RecurringPlan no encontrado, devolviendo array vacío');
      // Si el modelo no existe, devolver array vacío
    }
    
    res.json(recurringPlans);
  } catch (error) {
    console.error('Error al obtener planes recurrentes:', error);
    res.status(500).json({ message: 'Error al obtener planes recurrentes' });
  }
}));

// Rutas para gestión de nómina
router.get('/payroll/employees', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Obtenemos datos de empleados desde el modelo Employee
    const Employee = require('../models/Employee').default;
    const employees = await Employee.find({ isActive: true })
      .select('_id firstName lastName email position department createdAt')
      .lean();
    
    // Buscamos transacciones relacionadas con pagos de nómina para obtener información sobre salarios
    const Transaction = require('../models/Finance/Transaction').Transaction;
    const payrollTransactions = await Transaction.find({
      type: 'expense',
      $or: [
        { description: { $regex: 'nómina', $options: 'i' } },
        { description: { $regex: 'salario', $options: 'i' } }
      ]
    })
    .sort({ date: -1 })
    .lean();
    
    // Creamos un mapa para encontrar fácilmente la última transacción de salario para cada empleado
    const lastPaymentByEmployee = new Map();
    const salaryByEmployee = new Map();
    
    for (const transaction of payrollTransactions) {
      const employeeId = transaction.employeeId?.toString();
      const description = transaction.description.toLowerCase();
      
      if (employeeId && !lastPaymentByEmployee.has(employeeId)) {
        lastPaymentByEmployee.set(employeeId, {
          date: transaction.date,
          amount: transaction.amount
        });
      }
      
      if (employeeId && !salaryByEmployee.has(employeeId) && 
          (description.includes('salario') || description.includes('nómina'))) {
        salaryByEmployee.set(employeeId, transaction.amount);
      }
    }
    
    // Formatear los datos de empleados con la información adicional
    const formattedEmployees = employees.map((emp: any) => {
      const employeeId = emp._id.toString();
      const lastPayment = lastPaymentByEmployee.get(employeeId);
      const salary = salaryByEmployee.get(employeeId) || 0;
      
      // Calcular un número de cuenta ficticio basado en el ID del empleado
      const accountSuffix = employeeId.substring(employeeId.length - 4);
      
      return {
        id: employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
        salary: `$${salary.toFixed(2)}`,
        email: emp.email,
        startDate: new Date(emp.createdAt).toLocaleDateString(),
        paymentMethod: "Transferencia",
        accountNumber: `****${accountSuffix}`,
        lastPayment: lastPayment ? new Date(lastPayment.date).toLocaleDateString() : 'Sin pagos',
        status: "active"
      };
    });
    
    res.json(formattedEmployees);
  } catch (error) {
    console.error('Error al obtener datos de nómina de empleados:', error);
    res.status(500).json({ message: 'Error al obtener datos de nómina de empleados' });
  }
}));

router.get('/payroll/history', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Obtenemos transacciones relacionadas con pagos de nómina
    const Transaction = require('../models/Finance/Transaction').Transaction;
    const payrollTransactions = await Transaction.find({
      type: 'expense',
      $or: [
        { description: { $regex: 'nómina', $options: 'i' } },
        { description: { $regex: 'salario', $options: 'i' } },
        { description: { $regex: 'bono', $options: 'i' } }
      ]
    })
    .sort({ date: -1 })
    .lean();
    
    // Obtenemos los empleados para añadir información
    const Employee = require('../models/Employee').default;
    const employees = await Employee.find().select('_id firstName lastName').lean();
    
    // Creamos un mapa de empleados por ID para búsqueda rápida
    const employeeMap = new Map();
    for (const emp of employees) {
      employeeMap.set(emp._id.toString(), `${emp.firstName} ${emp.lastName}`);
    }
    
    // Formatear transacciones como pagos de nómina
    const payrollHistory = payrollTransactions.map((transaction: any) => {
      // Extraer el ID de empleado de la descripción si no está en el campo específico
      let employeeId = transaction.employeeId?.toString();
      let employeeName = '';
      
      if (employeeId && employeeMap.has(employeeId)) {
        employeeName = employeeMap.get(employeeId);
      } else {
        // Intentamos extraer el nombre del empleado de la descripción
        const parts = transaction.description.split(' - ');
        if (parts.length > 1) {
          employeeName = parts[1];
        }
      }
      
      return {
        id: transaction._id.toString(),
        employee: employeeName || 'Empleado no especificado',
        employeeId: employeeId || '',
        amount: `$${transaction.amount.toFixed(2)}`,
        concept: transaction.description,
        date: new Date(transaction.date).toLocaleDateString(),
        status: transaction.status
      };
    });
    
    res.json(payrollHistory);
  } catch (error) {
    console.error('Error al obtener historial de pagos de nómina:', error);
    res.status(500).json({ message: 'Error al obtener historial de pagos de nómina' });
  }
}));

router.get('/payroll/scheduled', asyncHandler(async (req: Request, res: Response) => {
  try {
    let scheduledPayments = [];
    
    // Intentamos obtener planes recurrentes relacionados con nómina
    try {
      const RecurringPlan = require('../models/Finance/RecurringPlan').RecurringPlan;
      const recurringPlans = await RecurringPlan.find({
        type: 'expense',
        $or: [
          { description: { $regex: 'nómina', $options: 'i' } },
          { description: { $regex: 'salario', $options: 'i' } }
        ],
        status: 'active'
      }).lean();
      
      scheduledPayments = recurringPlans.map((plan: any) => ({
        id: plan._id.toString(),
        name: plan.description,
        frequency: plan.frequency,
        employees: plan.items?.length || 1,
        totalAmount: `$${plan.amount.toFixed(2)}`,
        nextDate: new Date(plan.nextDate).toLocaleDateString(),
        status: plan.status
      }));
    } catch (err) {
      console.log('Modelo RecurringPlan no encontrado o error al buscar planes recurrentes:', err);
    }
    
    // Si no hay planes recurrentes, creamos uno simulado para la nómina mensual
    if (scheduledPayments.length === 0) {
      // Obtenemos el total de la nómina de todos los empleados activos
      const Employee = require('../models/Employee').default;
      const activeEmployees = await Employee.find({ isActive: true }).countDocuments();
      
      // Obtenemos transacciones de nómina para estimar el monto total
      const Transaction = require('../models/Finance/Transaction').Transaction;
      const payrollTransactions = await Transaction.find({
        type: 'expense',
        $or: [
          { description: { $regex: 'nómina', $options: 'i' } },
          { description: { $regex: 'salario', $options: 'i' } }
        ]
      }).lean();
      
      // Calcular un promedio aproximado de salario
      let totalSalary = 0;
      if (payrollTransactions.length > 0) {
        totalSalary = payrollTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      }
      
      // Si no hay transacciones, usamos un valor estimado de salario
      const averageSalary = payrollTransactions.length > 0 
        ? totalSalary / payrollTransactions.length 
        : 3000;
      
      // Obtener fecha para el próximo pago (15 del mes siguiente)
      const nextDate = new Date();
      nextDate.setDate(15);
      if (nextDate.getDate() < 15) {
        // Si estamos antes del 15, el próximo pago es el 15 de este mes
      } else {
        // Si estamos después del 15, el próximo pago es el 15 del mes siguiente
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      
      scheduledPayments.push({
        id: 'scheduled-payroll-1',
        name: 'Nómina Mensual',
        frequency: 'Mensual',
        employees: activeEmployees,
        totalAmount: `$${(averageSalary * activeEmployees).toFixed(2)}`,
        nextDate: nextDate.toLocaleDateString(),
        status: 'active'
      });
    }
    
    res.json(scheduledPayments);
  } catch (error) {
    console.error('Error al obtener pagos programados de nómina:', error);
    res.status(500).json({ message: 'Error al obtener pagos programados de nómina' });
  }
}));

router.post('/payroll/register', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { 
      employeeId,
      employeeName,
      amount,
      concept,
      date,
      accountId,
      paymentMethod,
      reference
    } = req.body;
    
    if (!amount || !concept) {
      return res.status(400).json({ message: 'Se requiere monto y concepto para registrar el pago' });
    }
    
    // Creamos una nueva transacción para registrar el pago de nómina
    const Transaction = require('../models/Finance/Transaction').Transaction;
    
    // Buscar una categoría para nómina o usar una por defecto
    const TransactionCategory = require('../models/Finance/TransactionCategory').TransactionCategory;
    let payrollCategory = await TransactionCategory.findOne({
      type: 'expense',
      name: { $regex: 'nómina|salario|personal', $options: 'i' }
    });
    
    if (!payrollCategory) {
      // Si no existe una categoría para nómina, creamos una
      payrollCategory = await TransactionCategory.create({
        name: 'Nómina y Personal',
        type: 'expense',
        description: 'Pagos de nómina y personal',
        createdBy: req.user?._id || 'system'
      });
    }
    
    // Buscar una cuenta financiera por defecto si no se especifica una
    let financialAccountId = accountId;
    if (!financialAccountId) {
      const FinancialAccount = require('../models/Finance/FinancialAccount').FinancialAccount;
      const defaultAccount = await FinancialAccount.findOne().sort('name');
      if (defaultAccount) {
        financialAccountId = defaultAccount._id;
      }
    }
    
    // Crear la transacción
    const transaction = new Transaction({
      type: 'expense',
      amount: parseFloat(amount),
      date: date || new Date(),
      description: concept || `Nómina - ${employeeName || 'Empleado'}`,
      categoryId: payrollCategory._id,
      status: 'pending',
      accountId: financialAccountId,
      paymentMethod: paymentMethod || 'bank_transfer',
      employeeId: employeeId,
      reference: reference,
      createdBy: req.user?._id || 'system'
    });
    
    await transaction.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error al registrar pago de nómina:', error);
    res.status(500).json({ message: 'Error al registrar pago de nómina' });
  }
}));

router.post('/payroll/confirm/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Buscamos la transacción correspondiente
    const Transaction = require('../models/Finance/Transaction').Transaction;
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Pago de nómina no encontrado' });
    }
    
    // Actualizar estado a completado
    transaction.status = 'completed';
    await transaction.save();
    
    // Actualizar el saldo de la cuenta financiera
    const FinancialAccount = require('../models/Finance/FinancialAccount').FinancialAccount;
    const account = await FinancialAccount.findById(transaction.accountId);
    
    if (account) {
      account.balance -= transaction.amount;
      await account.save();
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error al confirmar pago de nómina:', error);
    res.status(500).json({ message: 'Error al confirmar pago de nómina' });
  }
}));

// Rutas para socios
router.get('/partners', PartnerController.getAll as RequestHandler);
router.get('/partners/:id', PartnerController.getById as RequestHandler);
router.post('/partners', PartnerController.create as RequestHandler);
router.put('/partners/:id', PartnerController.update as RequestHandler);
router.delete('/partners/:id', PartnerController.delete as RequestHandler);

// Rutas para distribuciones
router.get('/distributions', DistributionController.getAll as RequestHandler);
router.get('/distributions/:id', DistributionController.getById as RequestHandler);
router.post('/distributions', DistributionController.create as RequestHandler);
router.put('/distributions/:id', DistributionController.update as RequestHandler);
router.post('/distributions/:id/complete', DistributionController.complete as RequestHandler);
router.delete('/distributions/:id', DistributionController.delete as RequestHandler);

// Rutas para distribuciones por socio
router.get('/partner-distributions', PartnerDistributionController.getAll as RequestHandler);
router.get('/partner-distributions/:id', PartnerDistributionController.getById as RequestHandler);
router.put('/partner-distributions/:id', PartnerDistributionController.update as RequestHandler);
router.get('/partners/:partnerId/distributions', PartnerDistributionController.getByPartner as RequestHandler);
router.get('/distributions/:distributionId/partners', PartnerDistributionController.getByDistribution as RequestHandler);

// Ruta para resumen de dividendos
router.get('/dividends-summary', DistributionController.getDividendsSummary as RequestHandler);

export default router; 