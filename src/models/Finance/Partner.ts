import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  position: string;
  participation: string;
  email: string;
  startDate: Date;
  status: 'active' | 'inactive';
  account: string;
  totalInvested: number;
  dividendsYTD: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const PartnerSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del socio es obligatorio'],
      trim: true
    },
    position: {
      type: String,
      required: [true, 'El cargo del socio es obligatorio'],
      trim: true
    },
    participation: {
      type: String,
      required: [true, 'El porcentaje de participación es obligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      trim: true,
      lowercase: true
    },
    startDate: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    account: {
      type: String,
      trim: true
    },
    totalInvested: {
      type: Number,
      default: 0
    },
    dividendsYTD: {
      type: Number,
      default: 0
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

export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema); 