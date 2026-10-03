const express = require('express');
const router = express.Router();
const {
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive,
} = require('../controllers/driveController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');

// View drives (with optional student context to compute eligibility)
router.get('/', optionalAuth, getDrives);
router.get('/:id', optionalAuth, getDriveById);

// Placement Officer exclusive routes
router.post('/', protect, authorize('officer'), createDrive);
router.put('/:id', protect, authorize('officer'), updateDrive);
router.delete('/:id', protect, authorize('officer'), deleteDrive);

module.exports = router;
