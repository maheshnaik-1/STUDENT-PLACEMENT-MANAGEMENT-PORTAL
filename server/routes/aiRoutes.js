const express = require('express');
const router = express.Router();
const { parseMyResume } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student-only route: parse authenticated student's stored resume
router.post('/parse-resume', protect, authorize('student'), parseMyResume);

module.exports = router;
