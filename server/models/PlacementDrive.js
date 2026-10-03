const mongoose = require('mongoose');

const eligibilitySchema = new mongoose.Schema(
  {
    minCGPA: {
      type: Number,
      required: [true, 'Minimum CGPA is required'],
      min: 0,
      max: 10,
      default: 6.0,
    },
    allowedBranches: {
      type: [String],
      required: [true, 'At least one branch must be allowed'],
      default: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'],
    },
    maxBacklogs: {
      type: Number,
      required: [true, 'Maximum allowed backlogs is required'],
      min: 0,
      default: 0,
    },
    passingYear: {
      type: Number,
      required: [true, 'Target batch passing year is required'],
      default: 2026,
    },
  },
  { _id: false }
);

const placementDriveSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Placement drive must be linked to a company'],
    },
    title: {
      type: String,
      required: [true, 'Please provide drive title / role headline'],
      trim: true,
    },
    jobRole: {
      type: String,
      required: [true, 'Please specify the job designation / role'],
      trim: true,
    },
    jobDescription: {
      type: String,
      required: [true, 'Please provide job description and responsibilities'],
      trim: true,
    },
    packageCTC: {
      type: String,
      required: [true, 'Please specify package CTC (e.g. 10 LPA)'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Please specify job location (e.g. Bangalore / Remote)'],
      trim: true,
    },
    eligibility: {
      type: eligibilitySchema,
      required: true,
      default: () => ({}),
    },
    driveDate: {
      type: Date,
      required: [true, 'Please provide drive date'],
    },
    deadline: {
      type: Date,
      required: [true, 'Please provide application deadline'],
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
    },
    rounds: {
      type: [String],
      default: ['Online Assessment', 'Technical Interview', 'HR Interview'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
