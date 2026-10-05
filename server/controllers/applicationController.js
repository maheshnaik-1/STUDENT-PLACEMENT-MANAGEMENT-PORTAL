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
        'name email rollNo branch cgpa activeBacklogs passingYear phone skills resumeUrl resumeFile.filename resumeFile.originalName resumeFile.mimeType resumeFile.size resumeFile.uploadedAt'
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

/**
 * @desc    Get detailed Placement Analytics & Reports for Officer
 * @route   GET /api/applications/analytics
 * @access  Private (Officer only)
 */
const getOfficerAnalytics = async (req, res, next) => {
  try {
    const { driveId, branch, status, search } = req.query;

    // Fetch all base data
    const allDrives = await PlacementDrive.find()
      .populate('company', 'name logoUrl location industry website')
      .sort({ createdAt: -1 });

    const allStudents = await User.find({ role: 'student' })
      .select('name email rollNo branch cgpa activeBacklogs passingYear')
      .sort({ rollNo: 1 });

    // Distinct filter options
    const distinctBranches = [...new Set(allStudents.map((s) => s.branch).filter(Boolean))].sort();
    const driveFilterOptions = allDrives.map((d) => ({
      _id: d._id,
      title: d.title,
      companyName: d.company?.name || 'Company',
      packageCTC: d.packageCTC,
      status: d.status,
    }));
    const validStatuses = [
      'Applied',
      'Shortlisted',
      'Technical Round',
      'Interview',
      'Selected',
      'Rejected',
    ];

    // Build query for applications based on filters
    let applicationQuery = {};
    if (driveId && driveId !== 'ALL') {
      applicationQuery.drive = driveId;
    }
    if (status && status !== 'ALL') {
      applicationQuery.status = status;
    }

    let applications = await Application.find(applicationQuery)
      .populate('student', 'name email rollNo branch cgpa activeBacklogs phone')
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name logoUrl location industry' },
      })
      .sort({ appliedAt: -1 });

    // Filter by branch if requested
    if (branch && branch !== 'ALL') {
      applications = applications.filter(
        (app) => app.student && app.student.branch === branch
      );
    }

    // Filter by search keyword (student name, roll number, email, company name, drive title)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      applications = applications.filter((app) => {
        const sName = (app.student?.name || '').toLowerCase();
        const sRoll = (app.student?.rollNo || '').toLowerCase();
        const sEmail = (app.student?.email || '').toLowerCase();
        const cName = (app.drive?.company?.name || '').toLowerCase();
        const dTitle = (app.drive?.title || '').toLowerCase();
        return (
          sName.includes(q) ||
          sRoll.includes(q) ||
          sEmail.includes(q) ||
          cName.includes(q) ||
          dTitle.includes(q)
        );
      });
    }

    // Compute Summary KPIs
    const totalApplications = applications.length;
    const uniqueApplicantIds = new Set(
      applications.map((a) => a.student?._id?.toString()).filter(Boolean)
    );
    const uniqueApplicantsCount = uniqueApplicantIds.size;

    const relevantStudents =
      branch && branch !== 'ALL'
        ? allStudents.filter((s) => s.branch === branch)
        : allStudents;
    const totalStudents = relevantStudents.length;

    const totalSelected = applications.filter((a) => a.status === 'Selected').length;
    const totalShortlisted = applications.filter((a) => a.status === 'Shortlisted').length;
    const totalTechnicalRound = applications.filter((a) => a.status === 'Technical Round').length;
    const totalInterview = applications.filter((a) => a.status === 'Interview').length;
    const totalApplied = applications.filter((a) => a.status === 'Applied').length;
    const totalRejected = applications.filter((a) => a.status === 'Rejected').length;
    const totalUnderReview = totalApplied + totalTechnicalRound + totalInterview;

    // Unique students who received at least one selection offer in this filtered dataset
    const uniqueSelectedStudentIds = new Set(
      applications
        .filter((a) => a.status === 'Selected')
        .map((a) => a.student?._id?.toString())
        .filter(Boolean)
    );
    const uniqueSelectedStudentsCount = uniqueSelectedStudentIds.size;

    const selectionRate =
      totalApplications > 0
        ? Number(((totalSelected / totalApplications) * 100).toFixed(1))
        : 0;

    const studentPlacementRate =
      totalStudents > 0
        ? Number(((uniqueSelectedStudentsCount / totalStudents) * 100).toFixed(1))
        : 0;

    // Status Distribution
    const statusDistribution = validStatuses.map((st) => {
      const count = applications.filter((a) => a.status === st).length;
      const percentage =
        totalApplications > 0
          ? Number(((count / totalApplications) * 100).toFixed(1))
          : 0;
      return {
        status: st,
        count,
        percentage,
      };
    });

    // Drive-Wise Analytics
    const targetDrives =
      driveId && driveId !== 'ALL'
        ? allDrives.filter((d) => d._id.toString() === driveId.toString())
        : allDrives;

    const driveAnalytics = targetDrives.map((d) => {
      const driveApps = applications.filter(
        (a) => a.drive && a.drive._id.toString() === d._id.toString()
      );
      const selCount = driveApps.filter((a) => a.status === 'Selected').length;
      const appCount = driveApps.length;
      const selRate =
        appCount > 0 ? Number(((selCount / appCount) * 100).toFixed(1)) : 0;

      return {
        driveId: d._id,
        driveTitle: d.title,
        companyName: d.company?.name || 'Company',
        companyLogo: d.company?.logoUrl || '',
        packageCTC: d.packageCTC,
        driveStatus: d.status,
        driveDate: d.driveDate,
        applicationsCount: appCount,
        appliedCount: driveApps.filter((a) => a.status === 'Applied').length,
        shortlistedCount: driveApps.filter((a) => a.status === 'Shortlisted').length,
        technicalRoundCount: driveApps.filter((a) => a.status === 'Technical Round').length,
        interviewCount: driveApps.filter((a) => a.status === 'Interview').length,
        selectedCount: selCount,
        rejectedCount: driveApps.filter((a) => a.status === 'Rejected').length,
        underReviewCount: driveApps.filter((a) =>
          ['Applied', 'Technical Round', 'Interview'].includes(a.status)
        ).length,
        selectionRate: selRate,
      };
    });

    // Branch-Wise Analytics
    const branchMap = {};
    allStudents.forEach((s) => {
      const b = s.branch || 'Unknown';
      if (!branchMap[b]) {
        branchMap[b] = {
          branch: b,
          totalStudents: 0,
          applicationsCount: 0,
          shortlistedCount: 0,
          technicalRoundCount: 0,
          interviewCount: 0,
          selectedCount: 0,
          rejectedCount: 0,
          underReviewCount: 0,
        };
      }
      branchMap[b].totalStudents += 1;
    });

    applications.forEach((a) => {
      const b = a.student?.branch || 'Unknown';
      if (!branchMap[b]) {
        branchMap[b] = {
          branch: b,
          totalStudents: 0,
          applicationsCount: 0,
          shortlistedCount: 0,
          technicalRoundCount: 0,
          interviewCount: 0,
          selectedCount: 0,
          rejectedCount: 0,
          underReviewCount: 0,
        };
      }
      branchMap[b].applicationsCount += 1;
      if (a.status === 'Shortlisted') branchMap[b].shortlistedCount += 1;
      else if (a.status === 'Technical Round') branchMap[b].technicalRoundCount += 1;
      else if (a.status === 'Interview') branchMap[b].interviewCount += 1;
      else if (a.status === 'Selected') branchMap[b].selectedCount += 1;
      else if (a.status === 'Rejected') branchMap[b].rejectedCount += 1;

      if (['Applied', 'Technical Round', 'Interview'].includes(a.status)) {
        branchMap[b].underReviewCount += 1;
      }
    });

    let branchAnalytics = Object.values(branchMap).map((b) => ({
      ...b,
      selectionRate:
        b.applicationsCount > 0
          ? Number(((b.selectedCount / b.applicationsCount) * 100).toFixed(1))
          : 0,
    }));

    if (branch && branch !== 'ALL') {
      branchAnalytics = branchAnalytics.filter((b) => b.branch === branch);
    }

    // Recent applications list (preview of latest applications)
    const recentApplications = applications.slice(0, 10).map((a) => ({
      _id: a._id,
      studentName: a.student?.name || 'Student',
      rollNo: a.student?.rollNo || 'N/A',
      branch: a.student?.branch || 'N/A',
      email: a.student?.email || '',
      companyName: a.drive?.company?.name || 'Company',
      driveTitle: a.drive?.title || 'Drive',
      packageCTC: a.drive?.packageCTC || 'N/A',
      status: a.status,
      remarks: a.remarks || '',
      appliedAt: a.appliedAt,
    }));

    // Applications roster for table & CSV export
    const applicationsRoster = applications.map((a) => ({
      _id: a._id,
      rollNo: a.student?.rollNo || 'N/A',
      studentName: a.student?.name || 'Student',
      email: a.student?.email || '',
      branch: a.student?.branch || 'N/A',
      cgpa: a.student?.cgpa || 0,
      activeBacklogs: a.student?.activeBacklogs ?? 0,
      companyName: a.drive?.company?.name || 'Company',
      driveTitle: a.drive?.title || 'Drive',
      packageCTC: a.drive?.packageCTC || 'N/A',
      status: a.status,
      remarks: a.remarks || '',
      appliedAt: a.appliedAt,
    }));

    // All student applications to determine accurate placement status across all registered students
    const allStudentApplications = await Application.find()
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name packageCTC' },
      });

    // Student Placement Master Roster (Respects branch & search filters, includes students with 0 applications)
    let filteredStudents = allStudents;
    if (branch && branch !== 'ALL' && branch !== 'undefined') {
      filteredStudents = filteredStudents.filter((s) => s.branch === branch);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredStudents = filteredStudents.filter((s) => {
        const sName = (s.name || '').toLowerCase();
        const sRoll = (s.rollNo || '').toLowerCase();
        const sEmail = (s.email || '').toLowerCase();
        const sBranch = (s.branch || '').toLowerCase();
        return sName.includes(q) || sRoll.includes(q) || sEmail.includes(q) || sBranch.includes(q);
      });
    }

    const studentRoster = filteredStudents.map((st) => {
      const stApps = allStudentApplications.filter(
        (a) => a.student && a.student.toString() === st._id.toString()
      );
      const selectedApp = stApps.find((a) => a.status === 'Selected');

      return {
        _id: st._id,
        rollNo: st.rollNo || 'N/A',
        name: st.name || 'Student',
        email: st.email || '',
        branch: st.branch || 'N/A',
        cgpa: st.cgpa || 0,
        activeBacklogs: st.activeBacklogs ?? 0,
        passingYear: st.passingYear || 2026,
        totalApplications: stApps.length,
        placementStatus: selectedApp
          ? `Placed at ${selectedApp.drive?.company?.name || 'Company'}`
          : stApps.length > 0
          ? 'In Progress'
          : 'Not Applied',
        selectedOffer: selectedApp
          ? {
              driveTitle: selectedApp.drive?.title,
              companyName: selectedApp.drive?.company?.name,
              packageCTC: selectedApp.drive?.packageCTC,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDrives: targetDrives.length,
          totalApplications,
          uniqueApplicants: uniqueApplicantsCount,
          totalStudents,
          totalSelected,
          totalShortlisted,
          totalTechnicalRound,
          totalInterview,
          totalApplied,
          totalRejected,
          totalUnderReview,
          selectionRate,
          studentPlacementRate,
        },
        statusDistribution,
        driveAnalytics,
        branchAnalytics,
        recentApplications,
        applicationsRoster,
        studentRoster,
        availableFilters: {
          branches: distinctBranches,
          drives: driveFilterOptions,
          statuses: validStatuses,
        },
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
  getOfficerAnalytics,
};
