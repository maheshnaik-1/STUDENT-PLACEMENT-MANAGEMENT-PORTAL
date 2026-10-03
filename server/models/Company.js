const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
      unique: true,
    },
    industry: {
      type: String,
      required: [true, 'Please specify industry (e.g. IT, FinTech, Product)'],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      required: [true, 'Please provide office/headquarter location'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide company overview / description'],
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Company', companySchema);
