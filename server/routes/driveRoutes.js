const express = require('express');
const router = express.Router();
const {
  getDrives,
  getDriveById,
  getDriveRecommendations,
  getDriveMatchScore,
  createDrive,
  updateDrive,
  deleteDrive,
} = require('../controllers/driveController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');

// Student recommendations endpoint (must precede /:id)
router.get('/recommendations', protect, authorize('student'), getDriveRecommendations);

// Student skill match score endpoint for a specific drive (must precede generic /:id)
router.get('/:id/match-score', protect, authorize('student'), getDriveMatchScore);

// View drives (with optional student context to compute eligibility)
router.get('/', optionalAuth, getDrives);
router.get('/:id', optionalAuth, getDriveById);

// Placement Officer exclusive routes
router.post('/', protect, authorize('officer'), createDrive);
router.put('/:id', protect, authorize('officer'), updateDrive);
router.delete('/:id', protect, authorize('officer'), deleteDrive);

module.exports = router;
