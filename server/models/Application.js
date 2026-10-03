const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementDrive',
      required: [true, 'Application must be associated with a placement drive'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must be associated with a student'],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        'Applied',
        'Shortlisted',
        'Technical Round',
        'Interview',
        'Selected',
        'Rejected',
      ],
      default: 'Applied',
    },
    remarks: {
      type: String,
      trim: true,
      default: 'Application submitted successfully.',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent a student from applying more than once to the same drive
applicationSchema.index({ drive: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
