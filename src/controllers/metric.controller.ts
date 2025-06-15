import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Metric, IMetric } from '../models/Metric';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

export const getMetrics: RequestHandler = async (req, res, next) => {
  try {
    const metrics = await Metric.find()
      .populate('campaign', 'name description')
      .sort({ date: -1 });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

export const getMetricById: RequestHandler = async (req, res, next) => {
  try {
    const metric = await Metric.findById(req.params.id)
      .populate('campaign', 'name description');
    
    if (!metric) {
      res.status(404).json({ message: 'Métrica no encontrada' });
      return;
    }
    res.json(metric);
  } catch (error) {
    next(error);
  }
};

export const createMetric: RequestHandler = async (req, res, next) => {
  try {
    const metric = new Metric(req.body);
    await metric.save();
    res.status(201).json(metric);
  } catch (error) {
    next(error);
  }
};

export const updateMetric: RequestHandler = async (req, res, next) => {
  try {
    const metric = await Metric.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('campaign', 'name description');
    
    if (!metric) {
      res.status(404).json({ message: 'Métrica no encontrada' });
      return;
    }
    res.json(metric);
  } catch (error) {
    next(error);
  }
};

export const deleteMetric: RequestHandler = async (req, res, next) => {
  try {
    const metric = await Metric.findByIdAndDelete(req.params.id);
    if (!metric) {
      res.status(404).json({ message: 'Métrica no encontrada' });
      return;
    }
    res.json({ message: 'Métrica eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getMetricsByCampaign: RequestHandler = async (req, res, next) => {
  try {
    const metrics = await Metric.find({ campaign: req.params.campaignId })
      .populate('campaign', 'name description')
      .sort({ date: -1 });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

export const getMetricsByDateRange: RequestHandler = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query: any = {};

    if (startDate) {
      query.date = { ...query.date, $gte: new Date(startDate as string) };
    }
    if (endDate) {
      query.date = { ...query.date, $lte: new Date(endDate as string) };
    }

    const metrics = await Metric.find(query)
      .populate('campaign', 'name description')
      .sort({ date: -1 });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
}; 