const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Placement Officer exclusive routes
router.get('/', protect, authorize('officer'), getAllStudents);
router.get('/:id', protect, authorize('officer'), getStudentById);

module.exports = router;
