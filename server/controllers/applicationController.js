const Application = require('../models/Application');
const PlacementDrive = require('../models/PlacementDrive');
const Company = require('../models/Company');
const User = require('../models/User');
const { checkStudentEligibility } = require('./driveController');

/**
 * @desc    Apply for a placement drive (with strict eligibility & duplicate checks)
 * @route   POST /api/applications/apply/:driveId
 * @access  Private (Student only)
 */
const applyForDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const studentId = req.user._id;

    // 1. Check if placement drive exists
    const drive = await PlacementDrive.findById(driveId).populate('company', 'name');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    // 2. Check if drive status allows applications
    if (drive.status === 'Completed' || drive.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Applications are closed. Drive status is '${drive.status}'.`,
      });
    }

    // 3. Check application deadline
    if (new Date() > new Date(drive.deadline)) {
      return res.status(400).json({
        success: false,
        message: `Application deadline was on ${new Date(drive.deadline).toLocaleDateString()}. Submissions are closed.`,
      });
    }

    // 4. Check if student has already applied (Duplicate Prevention)
    const existingApplication = await Application.findOne({
      drive: driveId,
      student: studentId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: `You have already applied for ${drive.company.name} - ${drive.title}. Current status: ${existingApplication.status}`,
      });
    }

    // 5. Evaluate Eligibility Criteria
    const student = await User.findById(studentId);
    const { isEligible, reasons } = checkStudentEligibility(student, drive);

    if (!isEligible) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for this placement drive.',
        reasons,
      });
    }

    // 6. Create Application
    const application = await Application.create({
      drive: driveId,
      student: studentId,
      appliedAt: new Date(),
      status: 'Applied',
      remarks: 'Application submitted successfully. Under review.',
    });

    const populatedApp = await Application.findById(application._id)
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name logoUrl location' },
      })
      .populate('student', 'name email rollNo branch cgpa');

    res.status(201).json({
      success: true,
      message: `Successfully applied to ${drive.company.name} - ${drive.title}!`,
      data: populatedApp,
    });
  } catch (error) {
    // Handle compound index unique error if caught at DB level
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this placement drive',
      });
    }
    next(error);
  }
};

/**
 * @desc    Get all applications submitted by the logged-in student
 * @route   GET /api/applications/my-applications
 * @access  Private (Student only)
 */
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate({
        path: 'drive',
        populate: {
          path: 'company',
          select: 'name industry logoUrl website location',
        },
      })
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all applicants for a specific drive (Officer view)
 * @route   GET /api/applications/drive/:driveId
 * @access  Private (Officer only)
 */
const getDriveApplicants = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { status, search } = req.query;

    const drive = await PlacementDrive.findById(driveId).populate('company');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    let query = { drive: driveId };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    let applications = await Application.find(query)
      .populate(
        'student',
        'name email rollNo branch cgpa activeBacklogs passingYear phone skills resumeUrl'
      )
      .sort({ appliedAt: -1 });

    // Optional student name/rollNo search
    if (search) {
      const searchLower = search.toLowerCase();
      applications = applications.filter(
        (app) =>
          app.student &&
          (app.student.name.toLowerCase().includes(searchLower) ||
            (app.student.rollNo &&
              app.student.rollNo.toLowerCase().includes(searchLower)) ||
            app.student.email.toLowerCase().includes(searchLower) ||
            app.student.branch.toLowerCase().includes(searchLower))
      );
    }

    res.status(200).json({
      success: true,
      drive,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an applicant's selection status and remarks
 * @route   PUT /api/applications/:id/status
 * @access  Private (Officer only)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const validStatuses = [
      'Applied',
      'Shortlisted',
      'Technical Round',
      'Interview',
      'Selected',
      'Rejected',
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (status) application.status = status;
    if (remarks !== undefined) application.remarks = remarks;
    application.updatedAt = new Date();

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('student', 'name email rollNo branch cgpa')
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name' },
      });

    res.status(200).json({
      success: true,
      message: `Applicant status updated to '${application.status}'`,
      data: populatedApp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete placement portal analytics & metrics
 * @route   GET /api/applications/stats
 * @access  Private / Public Summary
 */
const getPlacementStats = async (req, res, next) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const totalDrives = await PlacementDrive.countDocuments();
    const activeDrives = await PlacementDrive.countDocuments({
      status: { $in: ['Upcoming', 'Ongoing'] },
    });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalApplications = await Application.countDocuments();
    const totalSelected = await Application.countDocuments({ status: 'Selected' });
    const totalShortlisted = await Application.countDocuments({
      status: { $in: ['Shortlisted', 'Technical Round', 'Interview'] },
    });

    // Branch-wise placement distribution
    const branchStats = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $group: {
          _id: '$branch',
          totalStudents: { $sum: 1 },
          avgCGPA: { $avg: '$cgpa' },
        },
      },
    ]);

    // Branch-wise selections
    const placedStudents = await Application.aggregate([
      { $match: { status: 'Selected' } },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$studentInfo.branch',
          placedCount: { $sum: 1 },
        },
      },
    ]);

    // Company-wise selections
    const companyHires = await Application.aggregate([
      { $match: { status: 'Selected' } },
      {
        $lookup: {
          from: 'placementdrives',
          localField: 'drive',
          foreignField: '_id',
          as: 'driveInfo',
        },
      },
      { $unwind: '$driveInfo' },
      {
        $lookup: {
          from: 'companies',
          localField: 'driveInfo.company',
          foreignField: '_id',
          as: 'companyInfo',
        },
      },
      { $unwind: '$companyInfo' },
      {
        $group: {
          _id: '$companyInfo.name',
          hires: { $sum: 1 },
          package: { $first: '$driveInfo.packageCTC' },
        },
      },
      { $sort: { hires: -1 } },
      { $limit: 10 },
    ]);

    // Recent applications
    const recentApplications = await Application.find()
      .populate('student', 'name rollNo branch')
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name logoUrl' },
      })
      .sort({ appliedAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        totalDrives,
        activeDrives,
        totalStudents,
        totalApplications,
        totalSelected,
        totalShortlisted,
        placementRate:
          totalStudents > 0
            ? Math.round((totalSelected / totalStudents) * 100)
            : 0,
        branchStats,
        placedStudents,
        companyHires,
        recentApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForDrive,
  getMyApplications,
  getDriveApplicants,
  updateApplicationStatus,
  getPlacementStats,
};
