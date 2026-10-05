const express = require('express');
const router = express.Router();
const {
  applyForDrive,
  getMyApplications,
  getDriveApplicants,
  updateApplicationStatus,
  getPlacementStats,
  getOfficerAnalytics,
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public / Summary stats
router.get('/stats', getPlacementStats);

// Student routes
router.post('/apply/:driveId', protect, authorize('student'), applyForDrive);
router.get('/my-applications', protect, authorize('student'), getMyApplications);

// Placement Officer routes
router.get('/analytics', protect, authorize('officer'), getOfficerAnalytics);
router.get('/drive/:driveId', protect, authorize('officer'), getDriveApplicants);
router.put('/:id/status', protect, authorize('officer'), updateApplicationStatus);

module.exports = router;
