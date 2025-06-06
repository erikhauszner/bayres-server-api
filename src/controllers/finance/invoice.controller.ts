import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice, IInvoice } from '../../models/Finance';
import { Project } from '../../models/Project';
import { Client } from '../../models/Client';

export class InvoiceController {
  /**
   * Obtener todas las facturas
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const invoices = await Invoice.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName');

      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener facturas por proyecto
   */
  static async getByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      
      const invoices = await Invoice.find({ 
        projectId, 
        isActive: { $ne: false } 
      })
        .sort({ createdAt: -1 })
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName');

      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener facturas por cliente
   */
  static async getByClient(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId } = req.params;
      
      const invoices = await Invoice.find({ 
        clientId, 
        isActive: { $ne: false } 
      })
        .sort({ createdAt: -1 })
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName');

      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener una factura por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findById(id)
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName');
      
      if (!invoice) {
        return res.status(404).json({ message: 'Factura no encontrada' });
      }
      
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear una nueva factura
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const {
        number,
        clientId,
        projectId,
        status,
        issueDate,
        dueDate,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        notes,
        terms
      } = req.body;
      
      // Verificar que el proyecto existe
      if (projectId && projectId.trim() !== '') {
        const project = await Project.findById(projectId);
        if (!project) {
          return res.status(404).json({ message: 'Proyecto no encontrado' });
        }
      }
      
      // Verificar que el cliente existe
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Crear la factura
      const invoiceData: Partial<IInvoice> = {
        number,
        clientId,
        status,
        issueDate,
        dueDate,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        paid: 0,
        balance: total,
        notes,
        terms,
        createdBy: employeeId
      };
      
      // Solo agregar projectId si no está vacío
      if (projectId && projectId.trim() !== '') {
        invoiceData.projectId = projectId;
      }
      
      const invoice = new Invoice(invoiceData);
      
      await invoice.save();
      
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar una factura
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const updateData = { ...req.body };
      
      // Si se actualiza el total, recalcular el balance
      if (updateData.total !== undefined) {
        const invoice = await Invoice.findById(id);
        if (invoice) {
          updateData.balance = updateData.total - (invoice.paid || 0);
        }
      }
      
      const invoice = await Invoice.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName');
      
      if (!invoice) {
        return res.status(404).json({ message: 'Factura no encontrada' });
      }
      
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar el estado de una factura a pagada
   */
  static async markAsPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { paidAmount, paidDate } = req.body;
      
      const invoice = await Invoice.findById(id);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Factura no encontrada' });
      }
      
      // Actualizar los campos
      invoice.paid = paidAmount || invoice.total;
      invoice.balance = invoice.total - invoice.paid;
      invoice.status = 'paid';
      invoice.paidDate = paidDate ? new Date(paidDate) : new Date();
      
      await invoice.save();
      
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar una factura (desactivar)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );
      
      if (!invoice) {
        return res.status(404).json({ message: 'Factura no encontrada' });
      }
      
      res.json({ message: 'Factura eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener resumen de ingresos para el dashboard
   */
  static async getIncomesSummary(req: Request, res: Response, next: NextFunction) {
    try {
      // Fecha actual
      const now = new Date();
      
      // Calcular facturas pendientes
      const pendingInvoices = await Invoice.find({ 
        status: { $in: ['draft', 'sent'] },
        isActive: { $ne: false }
      });
      
      const totalPending = pendingInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
      
      // Calcular facturas vencidas
      const overdueInvoices = await Invoice.find({
        status: { $in: ['sent'] },
        dueDate: { $lt: now },
        isActive: { $ne: false }
      });
      
      const overdue = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
      
      // Calcular próximos ingresos (facturas que vencen en los próximos 7 días)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingInvoices = await Invoice.find({
        status: { $in: ['draft', 'sent'] },
        dueDate: { $gte: now, $lte: nextWeek },
        isActive: { $ne: false }
      });
      
      const upcomingTotal = upcomingInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      
      // Para ingresos recurrentes, se debería integrar con un modelo RecurringPlan
      // Por ahora usamos valores de ejemplo
      const recurringTotal = 0; // Implementar cuando exista el modelo RecurringPlan
      const recurringCount = 0; // Implementar cuando exista el modelo RecurringPlan
      
      // Construir y enviar el resumen
      const summary = {
        totalPending,
        overdue,
        recurringTotal,
        upcomingTotal,
        pendingCount: pendingInvoices.length,
        overdueCount: overdueInvoices.length,
        recurringCount,
        upcomingCount: upcomingInvoices.length
      };
      
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todas las transacciones (facturas y gastos)
   */
  static async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      // Importar el modelo de Expense (gastos)
      const { Expense } = require('../../models/Finance');
      
      // Obtener facturas recientes
      const invoices = await Invoice.find({ isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('clientId', 'name email')
        .populate('createdBy', 'firstName lastName');

      // Obtener gastos recientes
      const expenses = await Expense.find({ status: { $ne: 'rejected' } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('createdBy', 'firstName lastName');
      
      // Convertir facturas a formato de transacción
      const invoiceTransactions = invoices.map(invoice => {
        const invoiceId = invoice._id ? invoice._id.toString() : 'unknown';
        const clientName = typeof invoice.clientId === 'object' && invoice.clientId && 'name' in invoice.clientId 
          ? invoice.clientId.name 
          : 'Cliente';
        
        return {
          id: `INV-${invoiceId.substring(0, 8)}`,
          type: 'income',
          amount: `+$${invoice.total.toFixed(2)}`,
          description: `Factura: ${clientName} - ${invoice.items[0]?.description || 'Servicios'}`,
          date: new Date(invoice.createdAt).toLocaleDateString('es-ES'),
          status: invoice.status,
          createdAt: invoice.createdAt
        };
      });
      
      // Convertir gastos a formato de transacción
      const expenseTransactions = expenses.map((expense: any) => {
        const expenseId = expense._id ? expense._id.toString() : 'unknown';
        
        return {
          id: `EXP-${expenseId.substring(0, 8)}`,
          type: 'expense',
          amount: `-$${expense.amount.toFixed(2)}`,
          description: `Gasto: ${expense.description || 'Sin descripción'}`,
          date: new Date(expense.date || expense.createdAt).toLocaleDateString('es-ES'),
          status: expense.status,
          createdAt: expense.createdAt
        };
      });
      
      // Combinar las transacciones y ordenarlas por fecha (más recientes primero)
      const allTransactions = [...invoiceTransactions, ...expenseTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20); // Limitar a 20 transacciones
      
      res.json(allTransactions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener facturas pendientes de confirmación
   */
  static async getPendingInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      // Obtener facturas con estado 'draft' o 'sent'
      const pendingInvoices = await Invoice.find({ 
        status: { $in: ['draft', 'sent'] },
        isActive: { $ne: false }
      })
      .sort({ createdAt: -1 })
      .populate('clientId', 'name email')
      .populate('projectId', 'name')
      .populate('createdBy', 'firstName lastName');

      // Formatear las facturas con información adicional relevante
      const formattedInvoices = pendingInvoices.map(invoice => {
        const clientName = typeof invoice.clientId === 'object' && invoice.clientId && 'name' in invoice.clientId 
          ? invoice.clientId.name 
          : 'Cliente';
        
        const projectName = typeof invoice.projectId === 'object' && invoice.projectId && 'name' in invoice.projectId
          ? invoice.projectId.name
          : 'General';
          
        return {
          _id: invoice._id,
          number: invoice.number,
          clientId: invoice.clientId,
          clientName,
          projectId: invoice.projectId,
          projectName,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          paid: invoice.paid,
          balance: invoice.balance,
          notes: invoice.notes,
          terms: invoice.terms,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt
        };
      });
      
      res.json(formattedInvoices);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirmar pago de facturas (múltiples)
   */
  static async confirmInvoicePayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        invoiceIds, 
        accountId, 
        reference, 
        notes, 
        isPartialPayment, 
        partialAmount, 
        amount 
      } = req.body;
      
      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ message: 'Se requiere al menos un ID de factura' });
      }
      
      const results = {
        success: [] as string[],
        failed: [] as { id: string, reason: string }[],
        newInvoice: null as any
      };
      
      // Procesar cada factura
      for (const invoiceId of invoiceIds) {
        try {
          const invoice = await Invoice.findById(invoiceId);
          
          if (!invoice) {
            results.failed.push({ id: invoiceId, reason: 'Factura no encontrada' });
            continue;
          }
          
          // Si es un pago parcial, actualizar diferente
          if (isPartialPayment && partialAmount && partialAmount < invoice.total) {
            try {
              // Actualizar factura como parcialmente pagada
              invoice.status = 'partially_paid';
              invoice.paid = partialAmount;
              invoice.balance = invoice.total - partialAmount;
              invoice.paidDate = new Date();
              invoice.updatedAt = new Date();
              invoice.notes = invoice.notes 
                ? `${invoice.notes}\nPago parcial: ${partialAmount}. Fecha: ${new Date().toLocaleDateString()}`
                : `Pago parcial: ${partialAmount}. Fecha: ${new Date().toLocaleDateString()}`;
                
              if (notes) {
                invoice.notes = `${invoice.notes}\nNotas: ${notes}`;
              }
              
              // Guardar los cambios
              await invoice.save();
              
              // Crear una nueva factura por el monto restante
              const remainingAmount = invoice.total - partialAmount;
              
              // Crear la nueva factura con el saldo restante
              const newInvoiceData: Partial<IInvoice> = {
                number: `${invoice.number}-R`,
                clientId: invoice.clientId,
                projectId: invoice.projectId,
                status: 'sent',
                issueDate: new Date(),
                dueDate: invoice.dueDate,
                items: invoice.items.map(item => ({
                  description: `${item.description} (Saldo pendiente)`,
                  quantity: 1,
                  unitPrice: remainingAmount,
                  amount: remainingAmount,
                  taskId: item.taskId
                })),
                subtotal: remainingAmount,
                taxRate: invoice.taxRate,
                taxAmount: invoice.taxRate ? (remainingAmount * invoice.taxRate / 100) : 0,
                total: remainingAmount,
                paid: 0,
                balance: remainingAmount,
                notes: `Saldo pendiente de factura #${invoice.number}`,
                terms: invoice.terms,
                createdBy: invoice.createdBy
              };
              
              // Verificar que todos los campos obligatorios estén presentes
              if (!newInvoiceData.number) {
                newInvoiceData.number = `REM-${Date.now().toString().slice(-6)}`;
              }
              
              if (!newInvoiceData.taxRate) {
                newInvoiceData.taxRate = 0;
              }
              
              if (!newInvoiceData.taxAmount) {
                newInvoiceData.taxAmount = 0;
              }
              
              const newInvoice = new Invoice(newInvoiceData);
              
              try {
                await newInvoice.save();
                
                // Guardar la nueva factura en los resultados
                results.newInvoice = newInvoice;
                
                // Marcar como éxito
                results.success.push(invoiceId);
              } catch (saveError: any) {
                console.error('Error al guardar nueva factura:', saveError);
                
                // Revertir cambios en la factura original si hay error en la nueva
                invoice.status = 'sent';
                invoice.paid = 0;
                invoice.balance = invoice.total;
                invoice.paidDate = undefined;
                await invoice.save();
                
                results.failed.push({ 
                  id: invoiceId, 
                  reason: `Error al crear la factura por el saldo restante: ${saveError.message || 'Error desconocido'}`
                });
              }
            } catch (partialError: any) {
              console.error('Error procesando pago parcial:', partialError);
              results.failed.push({ 
                id: invoiceId, 
                reason: `Error en pago parcial: ${partialError.message || 'Error desconocido'}`
              });
            }
          } else {
            // Pago completo: actualizar factura como pagada
            invoice.status = 'paid';
            invoice.paid = amount || invoice.total;
            invoice.balance = 0;
            invoice.paidDate = new Date();
            invoice.updatedAt = new Date();
            
            if (notes) {
              invoice.notes = invoice.notes
                ? `${invoice.notes}\nNotas de pago: ${notes}`
                : `Notas de pago: ${notes}`;
            }
            
            // Guardar los cambios
            await invoice.save();
            
            // Marcar como éxito
            results.success.push(invoiceId);
          }
        } catch (err: any) {
          console.error(`Error al confirmar factura ${invoiceId}:`, err);
          results.failed.push({ 
            id: invoiceId, 
            reason: err.message || 'Error interno al procesar la factura' 
          });
        }
      }
      
      res.json({
        message: `${results.success.length} facturas confirmadas, ${results.failed.length} fallidas`,
        results,
        success: results.success,
        failed: results.failed,
        newInvoice: results.newInvoice
      });
    } catch (error) {
      next(error);
    }
  }
} 