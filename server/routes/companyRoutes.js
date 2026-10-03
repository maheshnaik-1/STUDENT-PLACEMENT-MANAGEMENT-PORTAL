const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public / viewable routes
router.get('/', getCompanies);
router.get('/:id', getCompanyById);

// Placement Officer exclusive routes
router.post('/', protect, authorize('officer'), createCompany);
router.put('/:id', protect, authorize('officer'), updateCompany);
router.delete('/:id', protect, authorize('officer'), deleteCompany);

module.exports = router;
