import mongoose, { Schema, Document } from 'mongoose';
import { IPartner } from './Partner';
import { IDistribution } from './Distribution';

export interface IPartnerDistribution extends Document {
  distributionId: IDistribution['_id'];
  partnerId: IPartner['_id'];
  amount: number;
  participation: string;
  status: 'pending' | 'paid';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const PartnerDistributionSchema: Schema = new Schema(
  {
    distributionId: {
      type: Schema.Types.ObjectId,
      ref: 'Distribution',
      required: [true, 'El ID de distribución es obligatorio']
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'El ID de socio es obligatorio']
    },
    amount: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      default: 0
    },
    participation: {
      type: String,
      required: [true, 'El porcentaje de participación es obligatorio'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    date: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const PartnerDistribution = mongoose.model<IPartnerDistribution>('PartnerDistribution', PartnerDistributionSchema); 