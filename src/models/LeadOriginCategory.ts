import mongoose from 'mongoose';

const LeadOriginCategorySchema = new mongoose.Schema(
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
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const LeadOriginCategory = mongoose.model('LeadOriginCategory', LeadOriginCategorySchema);

export default LeadOriginCategory; 