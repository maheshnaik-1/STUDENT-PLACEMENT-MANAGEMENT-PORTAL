const User = require('../models/User');
const Application = require('../models/Application');

/**
 * @desc    Get all registered students with application summary
 * @route   GET /api/students
 * @access  Private (Officer only)
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { branch, search, minCGPA } = req.query;
    let query = { role: 'student' };

    if (branch && branch !== 'ALL' && branch !== 'undefined') {
      query.branch = branch;
    }

    if (minCGPA) {
      query.cgpa = { $gte: Number(minCGPA) };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [{ name: searchRegex }, { rollNo: searchRegex }, { email: searchRegex }];
    }

    const students = await User.find(query).sort({ rollNo: 1, name: 1 });

    // Attach application stats for each student
    const studentsWithStats = await Promise.all(
      students.map(async (st) => {
        const applications = await Application.find({ student: st._id }).populate({
          path: 'drive',
          populate: { path: 'company', select: 'name' },
        });

        const selectedApp = applications.find((a) => a.status === 'Selected');

        return {
          ...st.toObject(),
          totalApplications: applications.length,
          placementStatus: selectedApp
            ? `Placed at ${selectedApp.drive?.company?.name || 'Company'}`
            : applications.length > 0
            ? 'In Progress'
            : 'Not Applied',
          selectedOffer: selectedApp || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      data: studentsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student profile by ID
 * @route   GET /api/students/:id
 * @access  Private (Officer only)
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const applications = await Application.find({ student: student._id })
      .populate({
        path: 'drive',
        populate: { path: 'company', select: 'name logoUrl location' },
      })
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
};
