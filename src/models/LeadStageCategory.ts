import mongoose from 'mongoose';

const LeadStageCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    },
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const LeadStageCategory = mongoose.model('LeadStageCategory', LeadStageCategorySchema);

export default LeadStageCategory; 