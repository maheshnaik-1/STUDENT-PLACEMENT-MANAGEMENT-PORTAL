const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a recipient user'],
      index: true,
    },
    role: {
      type: String,
      enum: ['student', 'officer', 'admin'],
      default: 'student',
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'APPLICATION_STATUS_CHANGED',
        'SHORTLISTED',
        'TECHNICAL_ROUND',
        'INTERVIEW',
        'SELECTED',
        'REJECTED',
        'DRIVE_UPDATE',
        'SYSTEM',
      ],
      default: 'SYSTEM',
    },
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ['Application', 'PlacementDrive', 'User', null],
      default: null,
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal notification retrieval and filtering
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
