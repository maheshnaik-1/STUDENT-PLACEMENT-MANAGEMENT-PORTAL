const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const User = require('../models/User');

/**
 * Helper function to evaluate student eligibility against a drive's criteria
 */
const checkStudentEligibility = (student, drive) => {
  const reasons = [];
  let isEligible = true;

  if (!student || student.role !== 'student') {
    return { isEligible: true, reasons: [] }; // Officers are inherently unrestricted
  }

  const { minCGPA, allowedBranches, maxBacklogs, passingYear } = drive.eligibility;

  // 1. CGPA check
  if (minCGPA && (student.cgpa || 0) < minCGPA) {
    isEligible = false;
    reasons.push(
      `CGPA requirement not met (Your CGPA: ${student.cgpa || 0}, Required: ${minCGPA})`
    );
  }

  // 2. Branch check
  if (
    allowedBranches &&
    allowedBranches.length > 0 &&
    !allowedBranches.includes(student.branch)
  ) {
    isEligible = false;
    reasons.push(
      `Branch '${student.branch}' is not eligible (Eligible: ${allowedBranches.join(', ')})`
    );
  }

  // 3. Backlogs check
  if (maxBacklogs !== undefined && (student.activeBacklogs || 0) > maxBacklogs) {
    isEligible = false;
    reasons.push(
      `Active backlogs (${student.activeBacklogs || 0}) exceeds limit (${maxBacklogs})`
    );
  }

  // 4. Passing Year check
  if (passingYear && student.passingYear && student.passingYear !== passingYear) {
    isEligible = false;
    reasons.push(
      `Batch mismatch (Your Batch: ${student.passingYear}, Target Batch: ${passingYear})`
    );
  }

  return { isEligible, reasons };
};

/**
 * @desc    Get all placement drives (with optional student eligibility computation)
 * @route   GET /api/drives
 * @access  Public / Authenticated
 */
const getDrives = async (req, res, next) => {
  try {
    const { search, status, branch, eligibleOnly } = req.query;
    let query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (branch && branch !== 'ALL') {
      query['eligibility.allowedBranches'] = branch;
    }

    let drives = await PlacementDrive.find(query)
      .populate('company', 'name industry website location logoUrl contactEmail')
      .sort({ driveDate: 1, createdAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();
      drives = drives.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.jobRole.toLowerCase().includes(searchLower) ||
          (d.company && d.company.name.toLowerCase().includes(searchLower)) ||
          d.location.toLowerCase().includes(searchLower)
      );
    }

    // If user is a logged-in student, augment drives with eligibility & applied status
    let studentUser = null;
    let studentApplications = [];

    if (req.user && req.user.role === 'student') {
      studentUser = await User.findById(req.user._id);
      studentApplications = await Application.find({ student: req.user._id });
    }

    const appliedDriveIds = new Set(
      studentApplications.map((app) => app.drive.toString())
    );

    let processedDrives = await Promise.all(
      drives.map(async (drive) => {
        const driveObj = drive.toObject();
        const applicantCount = await Application.countDocuments({ drive: drive._id });
        driveObj.totalApplicants = applicantCount;

        if (studentUser) {
          const { isEligible, reasons } = checkStudentEligibility(studentUser, drive);
          driveObj.isEligible = isEligible;
          driveObj.eligibilityReasons = reasons;
          driveObj.hasApplied = appliedDriveIds.has(drive._id.toString());

          // Find specific application status if applied
          if (driveObj.hasApplied) {
            const app = studentApplications.find(
              (a) => a.drive.toString() === drive._id.toString()
            );
            driveObj.myApplicationStatus = app ? app.status : 'Applied';
            driveObj.myApplicationId = app ? app._id : null;
          }
        }

        return driveObj;
      })
    );

    // If student requested only eligible drives
    if (studentUser && eligibleOnly === 'true') {
      processedDrives = processedDrives.filter((d) => d.isEligible);
    }

    res.status(200).json({
      success: true,
      count: processedDrives.length,
      data: processedDrives,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single placement drive by ID
 * @route   GET /api/drives/:id
 * @access  Public / Authenticated
 */
const getDriveById = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id).populate(
      'company',
      'name industry website location description contactEmail contactPerson logoUrl'
    );

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    const driveObj = drive.toObject();
    const applicantCount = await Application.countDocuments({ drive: drive._id });
    driveObj.totalApplicants = applicantCount;

    // Check student eligibility & applied status if user is a student
    if (req.user && req.user.role === 'student') {
      const student = await User.findById(req.user._id);
      const { isEligible, reasons } = checkStudentEligibility(student, drive);
      driveObj.isEligible = isEligible;
      driveObj.eligibilityReasons = reasons;

      const application = await Application.findOne({
        drive: drive._id,
        student: req.user._id,
      });

      driveObj.hasApplied = !!application;
      driveObj.myApplication = application;
    }

    res.status(200).json({
      success: true,
      data: driveObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new placement drive
 * @route   POST /api/drives
 * @access  Private (Officer only)
 */
const createDrive = async (req, res, next) => {
  try {
    const {
      company,
      title,
      jobRole,
      jobDescription,
      packageCTC,
      location,
      eligibility,
      driveDate,
      deadline,
      status,
      rounds,
    } = req.body;

    const drive = await PlacementDrive.create({
      company,
      title,
      jobRole,
      jobDescription,
      packageCTC,
      location,
      eligibility,
      driveDate,
      deadline,
      status: status || 'Upcoming',
      rounds: rounds || ['Online Assessment', 'Technical Interview', 'HR Interview'],
      createdBy: req.user._id,
    });

    const populatedDrive = await PlacementDrive.findById(drive._id).populate(
      'company',
      'name industry logoUrl'
    );

    res.status(201).json({
      success: true,
      message: 'Placement drive created successfully!',
      data: populatedDrive,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update placement drive details
 * @route   PUT /api/drives/:id
 * @access  Private (Officer only)
 */
const updateDrive = async (req, res, next) => {
  try {
    let drive = await PlacementDrive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    drive = await PlacementDrive.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('company', 'name industry logoUrl');

    res.status(200).json({
      success: true,
      message: 'Placement drive updated successfully!',
      data: drive,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete placement drive and its applications
 * @route   DELETE /api/drives/:id
 * @access  Private (Officer only)
 */
const deleteDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    // Delete all applications linked to this drive
    await Application.deleteMany({ drive: drive._id });

    // Delete the drive
    await drive.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Placement drive and all related applications deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkStudentEligibility,
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive,
};
