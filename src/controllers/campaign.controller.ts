import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Campaign } from '../models/Campaign';

export const getCampaigns: RequestHandler = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find()
      .populate('client', 'name email')
      .populate('assignedTo', 'firstName lastName email');
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

export const getCampaignById: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedTo', 'firstName lastName email');
    
    if (!campaign) {
      res.status(404).json({ message: 'Campaña no encontrada' });
      return;
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

export const createCampaign: RequestHandler = async (req, res, next) => {
  try {
    const campaign = new Campaign(req.body);
    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
};

export const updateCampaign: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('client', 'name email')
    .populate('assignedTo', 'firstName lastName email');
    
    if (!campaign) {
      res.status(404).json({ message: 'Campaña no encontrada' });
      return;
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

export const deleteCampaign: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      res.status(404).json({ message: 'Campaña no encontrada' });
      return;
    }
    res.json({ message: 'Campaña eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const searchCampaigns: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req.query;
    const searchQuery = query ? {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { status: { $regex: query, $options: 'i' } }
      ]
    } : {};

    const campaigns = await Campaign.find(searchQuery)
      .populate('client', 'name email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    next(error);
  }
}; 