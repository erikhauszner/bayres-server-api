import { Request, Response, NextFunction, RequestHandler } from 'express';
import Report from '../models/Report';
import { Metric } from '../models/Metric';
import { Campaign } from '../models/Campaign';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

export const getReports: RequestHandler = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('campaign', 'name description')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

export const getReportById: RequestHandler = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('campaign', 'name description')
      .populate('createdBy', 'firstName lastName email');
    
    if (!report) {
      res.status(404).json({ message: 'Informe no encontrado' });
      return;
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const createReport: RequestHandler = async (req, res, next) => {
  try {
    const { campaignId, startDate, endDate, type } = req.body;
    
    // Obtener métricas del rango de fechas
    const metrics = await Metric.find({
      campaign: campaignId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    // Calcular estadísticas
    const stats = calculateReportStats(metrics);
    
    const employeeId = req.employee?._id || req.user?._id;
    
    if (!employeeId) {
      res.status(401).json({ message: 'Empleado no autorizado' });
      return;
    }

    const report = new Report({
      campaign: campaignId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      metrics: metrics.map(m => m._id),
      statistics: stats,
      createdBy: employeeId
    });

    await report.save();
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

export const updateReport: RequestHandler = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('campaign', 'name description')
    .populate('createdBy', 'firstName lastName email');
    
    if (!report) {
      res.status(404).json({ message: 'Informe no encontrado' });
      return;
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const deleteReport: RequestHandler = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      res.status(404).json({ message: 'Informe no encontrado' });
      return;
    }
    res.json({ message: 'Informe eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getReportsByCampaign: RequestHandler = async (req, res, next) => {
  try {
    const reports = await Report.find({ campaign: req.params.campaignId })
      .populate('campaign', 'name description')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

// Función auxiliar para calcular estadísticas del informe
const calculateReportStats = (metrics: any[]) => {
  const stats: any = {
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    averageCTR: 0,
    averageConversionRate: 0,
    averageRevenuePerConversion: 0
  };

  const impressions = metrics.filter(m => m.type === 'impressions');
  const clicks = metrics.filter(m => m.type === 'clicks');
  const conversions = metrics.filter(m => m.type === 'conversions');
  const revenue = metrics.filter(m => m.type === 'revenue');

  stats.totalImpressions = impressions.reduce((sum, m) => sum + m.value, 0);
  stats.totalClicks = clicks.reduce((sum, m) => sum + m.value, 0);
  stats.totalConversions = conversions.reduce((sum, m) => sum + m.value, 0);
  stats.totalRevenue = revenue.reduce((sum, m) => sum + m.value, 0);

  if (stats.totalImpressions > 0) {
    stats.averageCTR = (stats.totalClicks / stats.totalImpressions) * 100;
  }

  if (stats.totalClicks > 0) {
    stats.averageConversionRate = (stats.totalConversions / stats.totalClicks) * 100;
  }

  if (stats.totalConversions > 0) {
    stats.averageRevenuePerConversion = stats.totalRevenue / stats.totalConversions;
  }

  return stats;
}; 