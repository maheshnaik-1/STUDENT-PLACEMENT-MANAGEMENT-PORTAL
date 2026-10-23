const express = require('express');
const router = express.Router();
const {
  applyForDrive,
  getMyApplications,
  getDriveApplicants,
  getDriveApplicantMatchScores,
  updateApplicationStatus,
  bulkUpdateApplicationStatus,
  getPlacementStats,
  getOfficerAnalytics,
  withdrawApplication,
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public / Summary stats
router.get('/stats', getPlacementStats);

// Student routes
router.post('/apply/:driveId', protect, authorize('student'), applyForDrive);
router.get('/my-applications', protect, authorize('student'), getMyApplications);
router.delete('/:id/withdraw', protect, authorize('student'), withdrawApplication);

// Placement Officer routes
router.get('/analytics', protect, authorize('officer'), getOfficerAnalytics);
router.get('/drive/:driveId/match-scores', protect, authorize('officer'), getDriveApplicantMatchScores);
router.get('/drive/:driveId', protect, authorize('officer'), getDriveApplicants);
router.put('/bulk-status', protect, authorize('officer'), bulkUpdateApplicationStatus);
router.put('/:id/status', protect, authorize('officer'), updateApplicationStatus);

module.exports = router;
