const mongoose = require('mongoose');
const Application = require('../models/Application');
const PlacementDrive = require('../models/PlacementDrive');
const Company = require('../models/Company');
const User = require('../models/User');
const { checkStudentEligibility } = require('./driveController');
const { createNotification } = require('./notificationController');
const { calculateSkillMatch } = require('../services/skillMatcher');

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

    // 3. Check if student has already applied (Duplicate Prevention)
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

    // 4. Check application deadline
    if (new Date() > new Date(drive.deadline)) {
      return res.status(400).json({
        success: false,
        message: `Application deadline was on ${new Date(drive.deadline).toLocaleDateString()}. Submissions are closed.`,
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
    const submissionRemarks = 'Application submitted successfully. Under review.';
    const application = await Application.create({
      drive: driveId,
      student: studentId,
      appliedAt: new Date(),
      status: 'Applied',
      remarks: submissionRemarks,
      statusHistory: [
        {
          status: 'Applied',
          remarks: submissionRemarks,
          changedBy: studentId,
          changedAt: new Date(),
        },
      ],
    });

    const populatedApp = await Application.findById(application._id)
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name logoUrl location' },
      })
      .populate('student', 'name email rollNo branch cgpa');

    // 7. Trigger Automatic Notifications
    // A. Student Notification
    await createNotification({
      recipient: studentId,
      role: 'student',
      title: 'Application Submitted',
      message: `Your application for ${drive.company?.name || 'Company'} - ${drive.title} has been successfully submitted.`,
      type: 'APPLICATION_SUBMITTED',
      relatedEntity: application._id,
      relatedEntityType: 'Application',
      link: '/student/applications',
      metadata: {
        driveId: drive._id,
        companyName: drive.company?.name,
        jobTitle: drive.title,
      },
    });

    // B. Officer Notifications
    const officers = await User.find({ role: 'officer' }).select('_id');
    for (const officer of officers) {
      await createNotification({
        recipient: officer._id,
        role: 'officer',
        title: 'New Application Received',
        message: `${student.name} (${student.rollNo || student.branch}) applied for ${drive.company?.name || 'Company'} - ${drive.title}.`,
        type: 'APPLICATION_SUBMITTED',
        relatedEntity: application._id,
        relatedEntityType: 'Application',
        link: `/officer/drives/${drive._id}/applicants`,
        metadata: {
          driveId: drive._id,
          studentId: student._id,
          studentName: student.name,
          companyName: drive.company?.name,
          jobTitle: drive.title,
        },
      });
    }

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
        'name email rollNo branch cgpa activeBacklogs passingYear phone skills resumeUrl resumeFile.filename resumeFile.originalName resumeFile.mimeType resumeFile.size resumeFile.uploadedAt academicDetails links projects certifications'
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

    const previousStatus = application.status;
    const isStatusChanged = Boolean(status && status !== previousStatus);

    if (status) application.status = status;
    if (remarks !== undefined) application.remarks = remarks;
    application.updatedAt = new Date();

    if (isStatusChanged) {
      if (!application.statusHistory) application.statusHistory = [];
      application.statusHistory.push({
        status,
        remarks: remarks !== undefined ? remarks : (application.remarks || ''),
        changedBy: req.user._id,
        changedAt: new Date(),
      });
    }

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('student', 'name email rollNo branch cgpa')
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name' },
      });

    // Automatic Notification for Student on Status Change (Idempotency Protected)
    if (isStatusChanged && populatedApp) {
      const companyName = populatedApp.drive?.company?.name || 'Company';
      const driveTitle = populatedApp.drive?.title || 'Placement Drive';
      const cleanRemarks = (remarks !== undefined && remarks.trim()) ? remarks.trim() : (application.remarks || '');

      let notifType = 'APPLICATION_STATUS_CHANGED';
      let notifTitle = 'Application Status Updated';
      let notifMessage = `Your application status for ${companyName} (${driveTitle}) is now '${status}'.`;

      if (status === 'Shortlisted') {
        notifType = 'SHORTLISTED';
        notifTitle = 'Application Shortlisted';
        notifMessage = `Your application for ${companyName} (${driveTitle}) has been shortlisted.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      } else if (status === 'Technical Round') {
        notifType = 'TECHNICAL_ROUND';
        notifTitle = 'Technical Round Scheduled';
        notifMessage = `Your application for ${companyName} (${driveTitle}) has progressed to the Technical Round.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      } else if (status === 'Interview') {
        notifType = 'INTERVIEW';
        notifTitle = 'Interview Scheduled';
        notifMessage = `Your application for ${companyName} (${driveTitle}) has progressed to the Interview stage.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      } else if (status === 'Selected') {
        notifType = 'SELECTED';
        notifTitle = 'Congratulations! You are Selected';
        notifMessage = `Congratulations! You have been selected for ${companyName} (${driveTitle}).${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      } else if (status === 'Rejected') {
        notifType = 'REJECTED';
        notifTitle = 'Application Update';
        notifMessage = `Your application for ${companyName} (${driveTitle}) was not selected.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      } else {
        notifMessage = `Your application status for ${companyName} (${driveTitle}) is now '${status}'.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
      }

      await createNotification({
        recipient: application.student,
        role: 'student',
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        relatedEntity: application._id,
        relatedEntityType: 'Application',
        link: '/student/applications',
        metadata: {
          driveId: populatedApp.drive?._id,
          companyName,
          jobTitle: driveTitle,
          previousStatus,
          newStatus: status,
          remarks: cleanRemarks,
        },
      });
    }

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
 * @desc    Bulk update applicants' selection status and remarks for a drive
 * @route   PUT /api/applications/bulk-status
 * @access  Private (Officer only)
 */
const bulkUpdateApplicationStatus = async (req, res, next) => {
  try {
    const { driveId, applicationIds, status, remarks } = req.body;

    if (!driveId) {
      return res.status(400).json({
        success: false,
        message: 'Placement drive ID is required for bulk status updates',
      });
    }

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty list of application IDs to update',
      });
    }

    if (applicationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Bulk status update batch size cannot exceed 100 applications',
      });
    }

    const validStatuses = [
      'Applied',
      'Shortlisted',
      'Technical Round',
      'Interview',
      'Selected',
      'Rejected',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const drive = await PlacementDrive.findById(driveId).populate('company', 'name');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    const companyName = drive.company?.name || 'Company';
    const driveTitle = drive.title || 'Placement Drive';

    // Find all applications belonging strictly to this drive
    const applications = await Application.find({
      _id: { $in: applicationIds },
      drive: driveId,
    }).populate('student', 'name email rollNo branch');

    const foundIdMap = new Map();
    applications.forEach((app) => foundIdMap.set(app._id.toString(), app));

    const TERMINAL_STATUSES = ['Selected', 'Rejected'];
    const updated = [];
    const skipped = [];

    for (const id of applicationIds) {
      const app = foundIdMap.get(id?.toString());
      if (!app) {
        skipped.push({
          id,
          reason: 'Application not found or does not belong to the specified drive',
        });
        continue;
      }

      // V4.0 Phase 2 Step 4: Bulk Terminal-State Protection
      // Applications in 'Selected' or 'Rejected' statuses represent finalized decisions
      // and must be protected from accidental bulk overwrite.
      if (TERMINAL_STATUSES.includes(app.status)) {
        skipped.push({
          id: app._id,
          studentName: app.student?.name || 'Unknown',
          rollNo: app.student?.rollNo || 'N/A',
          currentStatus: app.status,
          attemptedStatus: status,
          reason: `Cannot bulk update application in terminal state '${app.status}'. Terminal statuses are protected to prevent accidental overwrites.`,
          isTerminalProtected: true,
        });
        continue;
      }

      const previousStatus = app.status;
      const isStatusChanged = Boolean(status && status !== previousStatus);

      app.status = status;
      if (remarks !== undefined) {
        app.remarks = remarks;
      }
      app.updatedAt = new Date();

      if (isStatusChanged) {
        if (!app.statusHistory) app.statusHistory = [];
        app.statusHistory.push({
          status,
          remarks: remarks !== undefined ? remarks : (app.remarks || ''),
          changedBy: req.user._id,
          changedAt: new Date(),
        });
      }

      await app.save();

      // Trigger notification if status actually changed
      if (isStatusChanged && app.student) {
        const cleanRemarks = (remarks !== undefined && remarks.trim()) ? remarks.trim() : (app.remarks || '');
        let notifType = 'APPLICATION_STATUS_CHANGED';
        let notifTitle = 'Application Status Updated';
        let notifMessage = `Your application status for ${companyName} (${driveTitle}) is now '${status}'.`;

        if (status === 'Shortlisted') {
          notifType = 'SHORTLISTED';
          notifTitle = 'Application Shortlisted';
          notifMessage = `Your application for ${companyName} (${driveTitle}) has been shortlisted.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        } else if (status === 'Technical Round') {
          notifType = 'TECHNICAL_ROUND';
          notifTitle = 'Technical Round Scheduled';
          notifMessage = `Your application for ${companyName} (${driveTitle}) has progressed to the Technical Round.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        } else if (status === 'Interview') {
          notifType = 'INTERVIEW';
          notifTitle = 'Interview Scheduled';
          notifMessage = `Your application for ${companyName} (${driveTitle}) has progressed to the Interview stage.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        } else if (status === 'Selected') {
          notifType = 'SELECTED';
          notifTitle = 'Congratulations! You are Selected';
          notifMessage = `Congratulations! You have been selected for ${companyName} (${driveTitle}).${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        } else if (status === 'Rejected') {
          notifType = 'REJECTED';
          notifTitle = 'Application Update';
          notifMessage = `Your application for ${companyName} (${driveTitle}) was not selected.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        } else {
          notifMessage = `Your application status for ${companyName} (${driveTitle}) is now '${status}'.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;
        }

        await createNotification({
          recipient: app.student._id || app.student,
          role: 'student',
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          relatedEntity: app._id,
          relatedEntityType: 'Application',
          link: '/student/applications',
          metadata: {
            driveId: drive._id,
            companyName,
            jobTitle: driveTitle,
            previousStatus,
            newStatus: status,
            remarks: cleanRemarks,
          },
        });
      }

      updated.push({
        id: app._id,
        studentName: app.student?.name,
        rollNo: app.student?.rollNo,
        previousStatus,
        newStatus: status,
        statusChanged: isStatusChanged,
      });
    }

    const terminalSkippedCount = skipped.filter((s) => s.isTerminalProtected).length;

    let responseMessage = `Bulk update complete: ${updated.length} updated, ${skipped.length} skipped`;
    if (updated.length === 0 && terminalSkippedCount > 0) {
      responseMessage = `No applications updated. ${terminalSkippedCount} application${terminalSkippedCount > 1 ? 's were' : ' was'} skipped because terminal statuses ('Selected' or 'Rejected') cannot be modified in bulk.`;
    } else if (terminalSkippedCount > 0) {
      responseMessage = `Bulk update complete: ${updated.length} updated, ${skipped.length} skipped (${terminalSkippedCount} protected terminal status${terminalSkippedCount > 1 ? 'es' : ''})`;
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      terminalSkippedCount,
      data: {
        updated,
        skipped,
      },
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

    const totalTechnicalRound = await Application.countDocuments({ status: 'Technical Round' });
    const totalInterview = await Application.countDocuments({ status: 'Interview' });
    const totalApplied = await Application.countDocuments({ status: 'Applied' });
    const totalRejected = await Application.countDocuments({ status: 'Rejected' });

    // Recruitment Funnel Breakdown (Executive summary across whole portal)
    const calcRate = (num, denom) =>
      denom > 0 ? Number(((num / denom) * 100).toFixed(1)) : 0;

    const stage1Count = totalApplications;
    const stage2Count = await Application.countDocuments({
      status: { $in: ['Shortlisted', 'Technical Round', 'Interview', 'Selected'] },
    });
    const stage3Count = await Application.countDocuments({
      status: { $in: ['Technical Round', 'Interview', 'Selected'] },
    });
    const stage4Count = await Application.countDocuments({
      status: { $in: ['Interview', 'Selected'] },
    });
    const stage5Count = totalSelected;

    const recruitmentFunnel = {
      stages: [
        {
          stageId: 'applied',
          title: 'Applications Received',
          shortLabel: 'Applied',
          badge: 'Stage 1',
          count: stage1Count,
          percentageOfTotal: totalApplications > 0 ? 100 : 0,
          conversionFromPrev: 100,
          dropOffCount: Math.max(0, stage1Count - stage2Count),
          dropOffRate: calcRate(Math.max(0, stage1Count - stage2Count), stage1Count),
          color: '#2563eb',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          description: 'Total applications submitted across campus drives',
        },
        {
          stageId: 'shortlisted',
          title: 'Screening Cleared (Shortlisted+)',
          shortLabel: 'Shortlisted',
          badge: 'Stage 2',
          count: stage2Count,
          percentageOfTotal: calcRate(stage2Count, totalApplications),
          conversionFromPrev: calcRate(stage2Count, stage1Count),
          dropOffCount: Math.max(0, stage2Count - stage3Count),
          dropOffRate: calcRate(Math.max(0, stage2Count - stage3Count), stage2Count),
          color: '#d97706',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          description: 'Candidates meeting eligibility and advancing past screening',
        },
        {
          stageId: 'technical',
          title: 'Technical Evaluation (Tech Round+)',
          shortLabel: 'Technical Round',
          badge: 'Stage 3',
          count: stage3Count,
          percentageOfTotal: calcRate(stage3Count, totalApplications),
          conversionFromPrev: calcRate(stage3Count, stage2Count),
          dropOffCount: Math.max(0, stage3Count - stage4Count),
          dropOffRate: calcRate(Math.max(0, stage3Count - stage4Count), stage3Count),
          color: '#7c3aed',
          bgColor: '#f5f3ff',
          borderColor: '#ddd6fe',
          description: 'Candidates evaluated in coding and technical rounds',
        },
        {
          stageId: 'interview',
          title: 'Formal Interview (Interview+)',
          shortLabel: 'Interview',
          badge: 'Stage 4',
          count: stage4Count,
          percentageOfTotal: calcRate(stage4Count, totalApplications),
          conversionFromPrev: calcRate(stage4Count, stage3Count),
          dropOffCount: Math.max(0, stage4Count - stage5Count),
          dropOffRate: calcRate(Math.max(0, stage4Count - stage5Count), stage4Count),
          color: '#4f46e5',
          bgColor: '#eef2ff',
          borderColor: '#c7d2fe',
          description: 'Candidates appearing before technical and HR interview panels',
        },
        {
          stageId: 'selected',
          title: 'Offers Extended (Selected)',
          shortLabel: 'Offers Extended',
          badge: 'Stage 5',
          count: stage5Count,
          percentageOfTotal: calcRate(stage5Count, totalApplications),
          conversionFromPrev: calcRate(stage5Count, stage4Count),
          dropOffCount: 0,
          dropOffRate: 0,
          color: '#059669',
          bgColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          description: 'Confirmed placement offers extended to candidates',
        },
      ],
      pipelineHealth: {
        totalApplications,
        activeInReview: totalApplications - (totalSelected + totalRejected),
        offersExtended: totalSelected,
        rejected: totalRejected,
        overallConversionRate: calcRate(totalSelected, totalApplications),
      },
    };

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
        totalTechnicalRound,
        totalInterview,
        totalApplied,
        totalRejected,
        placementRate:
          totalStudents > 0
            ? Math.round((totalSelected / totalStudents) * 100)
            : 0,
        recruitmentFunnel,
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
    const totalUnderReview =
      totalApplied + totalShortlisted + totalTechnicalRound + totalInterview;

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

    // Helper for safe rate calculation
    const calcRate = (num, denom) =>
      denom > 0 ? Number(((num / denom) * 100).toFixed(1)) : 0;

    // Visual Recruitment Funnel Definition (Progressive math-based stages derived strictly from MongoDB data)
    // Stage 1: Applications Received
    const stage1Count = totalApplications;
    // Stage 2: Screening Cleared (Shortlisted and advanced)
    const stage2Count = applications.filter((a) =>
      ['Shortlisted', 'Technical Round', 'Interview', 'Selected'].includes(a.status)
    ).length;
    // Stage 3: Technical Round and advanced
    const stage3Count = applications.filter((a) =>
      ['Technical Round', 'Interview', 'Selected'].includes(a.status)
    ).length;
    // Stage 4: Formal Interview and advanced
    const stage4Count = applications.filter((a) =>
      ['Interview', 'Selected'].includes(a.status)
    ).length;
    // Stage 5: Offers Extended (Selected)
    const stage5Count = totalSelected;

    const stage1DropOff = Math.max(0, stage1Count - stage2Count);
    const stage2DropOff = Math.max(0, stage2Count - stage3Count);
    const stage3DropOff = Math.max(0, stage3Count - stage4Count);
    const stage4DropOff = Math.max(0, stage4Count - stage5Count);

    const recruitmentFunnel = {
      stages: [
        {
          stageId: 'applied',
          title: 'Applications Received',
          shortLabel: 'Applied',
          badge: 'Stage 1',
          count: stage1Count,
          percentageOfTotal: totalApplications > 0 ? 100 : 0,
          conversionFromPrev: 100,
          dropOffCount: stage1DropOff,
          dropOffRate: calcRate(stage1DropOff, stage1Count),
          color: '#2563eb',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          description: 'Total student applications submitted within selected scope',
        },
        {
          stageId: 'shortlisted',
          title: 'Screening Cleared (Shortlisted+)',
          shortLabel: 'Shortlisted',
          badge: 'Stage 2',
          count: stage2Count,
          percentageOfTotal: calcRate(stage2Count, totalApplications),
          conversionFromPrev: calcRate(stage2Count, stage1Count),
          dropOffCount: stage2DropOff,
          dropOffRate: calcRate(stage2DropOff, stage2Count),
          color: '#d97706',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          description: 'Candidates meeting eligibility criteria and clearing profile screening',
        },
        {
          stageId: 'technical',
          title: 'Technical Evaluation (Tech Round+)',
          shortLabel: 'Technical Round',
          badge: 'Stage 3',
          count: stage3Count,
          percentageOfTotal: calcRate(stage3Count, totalApplications),
          conversionFromPrev: calcRate(stage3Count, stage2Count),
          dropOffCount: stage3DropOff,
          dropOffRate: calcRate(stage3DropOff, stage3Count),
          color: '#7c3aed',
          bgColor: '#f5f3ff',
          borderColor: '#ddd6fe',
          description: 'Candidates evaluated in coding and technical assessments',
        },
        {
          stageId: 'interview',
          title: 'Formal Interview (Interview+)',
          shortLabel: 'Interview',
          badge: 'Stage 4',
          count: stage4Count,
          percentageOfTotal: calcRate(stage4Count, totalApplications),
          conversionFromPrev: calcRate(stage4Count, stage3Count),
          dropOffCount: stage4DropOff,
          dropOffRate: calcRate(stage4DropOff, stage4Count),
          color: '#4f46e5',
          bgColor: '#eef2ff',
          borderColor: '#c7d2fe',
          description: 'Candidates appearing before technical and leadership interview panels',
        },
        {
          stageId: 'selected',
          title: 'Offers Extended (Selected)',
          shortLabel: 'Offers Extended',
          badge: 'Stage 5',
          count: stage5Count,
          percentageOfTotal: calcRate(stage5Count, totalApplications),
          conversionFromPrev: calcRate(stage5Count, stage4Count),
          dropOffCount: 0,
          dropOffRate: 0,
          color: '#059669',
          bgColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          description: 'Confirmed placement offers extended to candidates',
        },
      ],
      pipelineHealth: {
        totalApplications,
        activeInReview: applications.filter((a) =>
          ['Applied', 'Shortlisted', 'Technical Round', 'Interview'].includes(a.status)
        ).length,
        offersExtended: totalSelected,
        rejected: totalRejected,
        overallConversionRate: selectionRate,
      },
    };

    // Helper to safely parse package CTC in LPA
    const parsePackageLPA = (pkgString) => {
      if (!pkgString || typeof pkgString !== 'string') return 0;
      const numbers = pkgString.match(/\d+(?:\.\d+)?/g);
      if (!numbers || numbers.length === 0) return 0;
      const floatVals = numbers.map(Number).filter((n) => !isNaN(n));
      return floatVals.length > 0 ? Math.max(...floatVals) : 0;
    };

    // Drive-Wise Analytics
    const targetDrives =
      driveId && driveId !== 'ALL'
        ? allDrives.filter((d) => d._id.toString() === driveId.toString())
        : allDrives;

    // Salary Analytics for Selected Candidates in Current Filter
    const selectedApplications = applications.filter((a) => a.status === 'Selected');
    const selectedSalaryValues = selectedApplications
      .map((a) => ({
        applicationId: a._id,
        studentName: a.student?.name || 'Student',
        rollNo: a.student?.rollNo || 'N/A',
        branch: a.student?.branch || 'N/A',
        companyName: a.drive?.company?.name || 'Company',
        driveTitle: a.drive?.title || 'Drive',
        packageCTC: a.drive?.packageCTC || 'N/A',
        lpa: parsePackageLPA(a.drive?.packageCTC),
      }))
      .filter((s) => s.lpa > 0);

    const lpaList = selectedSalaryValues.map((s) => s.lpa).sort((a, b) => a - b);
    const hasOffers = lpaList.length > 0;
    const highestLPA = hasOffers ? Math.max(...lpaList) : 0;
    const lowestLPA = hasOffers ? Math.min(...lpaList) : 0;
    const averageLPA = hasOffers
      ? Number((lpaList.reduce((acc, v) => acc + v, 0) / lpaList.length).toFixed(2))
      : 0;

    let medianLPA = 0;
    if (hasOffers) {
      const mid = Math.floor(lpaList.length / 2);
      medianLPA =
        lpaList.length % 2 !== 0
          ? lpaList[mid]
          : Number(((lpaList[mid - 1] + lpaList[mid]) / 2).toFixed(2));
    }

    const allDrivesWithLPA = targetDrives.map((d) => ({
      _id: d._id,
      title: d.title,
      packageCTC: d.packageCTC,
      lpa: parsePackageLPA(d.packageCTC),
    }));

    const superDreamDrives = allDrivesWithLPA.filter((d) => d.lpa >= 15);
    const dreamDrives = allDrivesWithLPA.filter((d) => d.lpa >= 8 && d.lpa < 15);
    const coreDrives = allDrivesWithLPA.filter((d) => d.lpa > 0 && d.lpa < 8);

    const superDreamOffers = selectedSalaryValues.filter((s) => s.lpa >= 15);
    const dreamOffers = selectedSalaryValues.filter((s) => s.lpa >= 8 && s.lpa < 15);
    const coreOffers = selectedSalaryValues.filter((s) => s.lpa > 0 && s.lpa < 8);

    const salaryAnalytics = {
      hasOffers,
      offersCount: selectedSalaryValues.length,
      highestLPA,
      lowestLPA,
      averageLPA,
      medianLPA,
      tiers: [
        {
          tierId: 'super-dream',
          label: 'Super Dream (≥ 15 LPA)',
          threshold: '≥ 15 LPA',
          color: '#7c3aed',
          bgColor: '#f5f3ff',
          borderColor: '#ddd6fe',
          drivesCount: superDreamDrives.length,
          offersCount: superDreamOffers.length,
          offersPercentage: hasOffers ? calcRate(superDreamOffers.length, lpaList.length) : 0,
        },
        {
          tierId: 'dream',
          label: 'Dream (8 - 14.9 LPA)',
          threshold: '8 - 14.9 LPA',
          color: '#2563eb',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          drivesCount: dreamDrives.length,
          offersCount: dreamOffers.length,
          offersPercentage: hasOffers ? calcRate(dreamOffers.length, lpaList.length) : 0,
        },
        {
          tierId: 'core-mass',
          label: 'Core / Mass (< 8 LPA)',
          threshold: '< 8 LPA',
          color: '#059669',
          bgColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          drivesCount: coreDrives.length,
          offersCount: coreOffers.length,
          offersPercentage: hasOffers ? calcRate(coreOffers.length, lpaList.length) : 0,
        },
      ],
      topOffers: [...selectedSalaryValues].sort((a, b) => b.lpa - a.lpa),
    };

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
          ['Applied', 'Shortlisted', 'Technical Round', 'Interview'].includes(a.status)
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

      if (['Applied', 'Shortlisted', 'Technical Round', 'Interview'].includes(a.status)) {
        branchMap[b].underReviewCount += 1;
      }
    });

    // Branch unique placement tracking
    const branchPlacedStudentMap = {};
    applications.forEach((a) => {
      if (a.status === 'Selected' && a.student) {
        const b = a.student.branch || 'Unknown';
        if (!branchPlacedStudentMap[b]) branchPlacedStudentMap[b] = new Set();
        branchPlacedStudentMap[b].add(a.student._id?.toString() || a.student.toString());
      }
    });

    let branchAnalytics = Object.values(branchMap).map((b) => {
      const placedUnique = branchPlacedStudentMap[b.branch]?.size || 0;
      return {
        ...b,
        placedStudentsCount: placedUnique,
        placementRate:
          b.totalStudents > 0
            ? Number(((placedUnique / b.totalStudents) * 100).toFixed(1))
            : 0,
        selectionRate:
          b.applicationsCount > 0
            ? Number(((b.selectedCount / b.applicationsCount) * 100).toFixed(1))
            : 0,
      };
    });

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
        recruitmentFunnel,
        salaryAnalytics,
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

/**
 * @desc    Get AI/skill-match scores and eligibility for all applicants to a drive
 * @route   GET /api/applications/drive/:driveId/match-scores
 * @access  Private (Placement Officer only)
 */
const getDriveApplicantMatchScores = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driveId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placement drive ID format',
      });
    }

    const drive = await PlacementDrive.findById(driveId).populate(
      'company',
      'name industry location logoUrl'
    );

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Placement drive not found',
      });
    }

    const applications = await Application.find({ drive: driveId })
      .populate({
        path: 'student',
        select: 'name email rollNo branch cgpa activeBacklogs passingYear skills resumeFile',
      })
      .sort({ appliedAt: -1 });

    let totalScore = 0;
    const scoreDistribution = {
      excellent: 0, // 80 - 100
      good: 0,      // 60 - 79
      moderate: 0,  // 40 - 59
      low: 0,       // 1 - 39
      zero: 0,      // 0
    };

    const applicantResults = applications.map((app) => {
      const student = app.student;
      const studentSkills = student?.skills || [];
      const match = calculateSkillMatch(
        studentSkills,
        drive.requiredSkills || []
      );

      const eligibility = student
        ? checkStudentEligibility(student, drive)
        : { isEligible: false, reasons: ['Student profile missing'] };

      totalScore += match.score;
      if (match.score >= 80) scoreDistribution.excellent++;
      else if (match.score >= 60) scoreDistribution.good++;
      else if (match.score >= 40) scoreDistribution.moderate++;
      else if (match.score > 0) scoreDistribution.low++;
      else scoreDistribution.zero++;

      return {
        applicationId: app._id,
        status: app.status,
        remarks: app.remarks || '',
        appliedAt: app.appliedAt,
        student: student
          ? {
              _id: student._id,
              name: student.name,
              email: student.email,
              rollNo: student.rollNo,
              branch: student.branch,
              cgpa: student.cgpa,
              activeBacklogs: student.activeBacklogs,
              passingYear: student.passingYear,
              skills: student.skills || [],
              hasResume: Boolean(student.resumeFile?.filename),
              resumeOriginalName: student.resumeFile?.originalName || null,
            }
          : null,
        academicEligibility: eligibility,
        skillMatch: {
          score: match.score,
          matchPercentage: match.matchPercentage,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          additionalSkills: match.additionalSkills,
          totalRequired: match.totalRequired,
          totalMatched: match.totalMatched,
          explanation: match.explanation,
        },
      };
    });

    const totalApplicants = applicantResults.length;
    const averageScore =
      totalApplicants > 0 ? Math.round(totalScore / totalApplicants) : 0;

    // Sort applicants: Highest match score first, then academically eligible first, then earliest applied
    applicantResults.sort((a, b) => {
      if (b.skillMatch.score !== a.skillMatch.score) {
        return b.skillMatch.score - a.skillMatch.score;
      }
      if (a.academicEligibility.isEligible !== b.academicEligibility.isEligible) {
        return a.academicEligibility.isEligible ? -1 : 1;
      }
      return new Date(a.appliedAt) - new Date(b.appliedAt);
    });

    res.status(200).json({
      success: true,
      data: {
        driveId: drive._id,
        driveTitle: drive.title,
        jobRole: drive.jobRole,
        company: drive.company,
        requiredSkills: drive.requiredSkills || [],
        totalApplicants,
        averageScore,
        scoreDistribution,
        applicants: applicantResults,
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
  getDriveApplicantMatchScores,
  updateApplicationStatus,
  bulkUpdateApplicationStatus,
  getPlacementStats,
  getOfficerAnalytics,
};
