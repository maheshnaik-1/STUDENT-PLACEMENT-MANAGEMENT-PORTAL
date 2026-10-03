const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');

/**
 * @desc    Get all companies with active drive counts
 * @route   GET /api/companies
 * @access  Public / Authenticated
 */
const getCompanies = async (req, res, next) => {
  try {
    const { search, industry } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }

    if (industry && industry !== 'ALL') {
      query.industry = industry;
    }

    const companies = await Company.find(query).sort({ name: 1 });

    // Attach drive counts for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (comp) => {
        const driveCount = await PlacementDrive.countDocuments({ company: comp._id });
        const activeDriveCount = await PlacementDrive.countDocuments({
          company: comp._id,
          status: { $in: ['Upcoming', 'Ongoing'] },
        });

        return {
          ...comp.toObject(),
          totalDrives: driveCount,
          activeDrives: activeDriveCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: companiesWithStats.length,
      data: companiesWithStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single company details by ID
 * @route   GET /api/companies/:id
 * @access  Public / Authenticated
 */
const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Get all placement drives conducted by this company
    const drives = await PlacementDrive.find({ company: company._id }).sort({
      driveDate: -1,
    });

    res.status(200).json({
      success: true,
      data: {
        ...company.toObject(),
        drives,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new company
 * @route   POST /api/companies
 * @access  Private (Officer only)
 */
const createCompany = async (req, res, next) => {
  try {
    const {
      name,
      industry,
      website,
      location,
      description,
      contactEmail,
      contactPerson,
      logoUrl,
    } = req.body;

    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: `Company '${name}' is already registered in the system`,
      });
    }

    const company = await Company.create({
      name,
      industry,
      website,
      location,
      description,
      contactEmail,
      contactPerson,
      logoUrl,
    });

    res.status(201).json({
      success: true,
      message: `Company '${company.name}' added successfully!`,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update company details
 * @route   PUT /api/companies/:id
 * @access  Private (Officer only)
 */
const updateCompany = async (req, res, next) => {
  try {
    let company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Company updated successfully!',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete company and cascade delete/archive its drives & applications
 * @route   DELETE /api/companies/:id
 * @access  Private (Officer only)
 */
const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Find all drives for this company
    const drives = await PlacementDrive.find({ company: company._id });
    const driveIds = drives.map((d) => d._id);

    // Delete associated applications
    await Application.deleteMany({ drive: { $in: driveIds } });

    // Delete placement drives
    await PlacementDrive.deleteMany({ company: company._id });

    // Delete company
    await company.deleteOne();

    res.status(200).json({
      success: true,
      message: `Company '${company.name}' and all associated drives deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
