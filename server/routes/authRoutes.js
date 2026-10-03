const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  uploadResume,
  deleteResume,
  getResumeFile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { handleResumeUpload } = require('../middleware/uploadMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private profile routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// v2.1.2-A Resume Upload, Deletion & Download endpoints
router.post('/resume-upload', protect, handleResumeUpload, uploadResume);
router.delete('/resume', protect, deleteResume);
router.get('/resume', protect, getResumeFile);
router.get('/resume-download/:studentId', protect, getResumeFile);

module.exports = router;
