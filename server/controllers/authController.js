const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT Token Helper
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'college_placement_portal_super_secret_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      rollNo,
      branch,
      cgpa,
      activeBacklogs,
      passingYear,
      phone,
      skills,
      resumeUrl,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // Check if roll number already exists (if provided)
    if (rollNo) {
      const existingRoll = await User.findOne({ rollNo: rollNo.toUpperCase().trim() });
      if (existingRoll) {
        return res.status(400).json({
          success: false,
          message: 'A student with this Roll Number is already registered',
        });
      }
    }

    // Format skills array if sent as string
    let parsedSkills = [];
    if (Array.isArray(skills)) {
      parsedSkills = skills;
    } else if (typeof skills === 'string') {
      parsedSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Create student user
    const user = await User.create({
      name,
      email,
      password,
      role: 'student', // Registration is strictly for students
      rollNo: rollNo ? rollNo.toUpperCase().trim() : undefined,
      branch: branch || 'CSE',
      cgpa: cgpa ? Number(cgpa) : 0,
      activeBacklogs: activeBacklogs !== undefined ? Number(activeBacklogs) : 0,
      passingYear: passingYear ? Number(passingYear) : 2026,
      phone: phone || '',
      skills: parsedSkills,
      resumeUrl: resumeUrl || '',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Student registration successful!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        branch: user.branch,
        cgpa: user.cgpa,
        activeBacklogs: user.activeBacklogs,
        passingYear: user.passingYear,
        phone: user.phone,
        skills: user.skills,
        resumeUrl: user.resumeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login student or placement officer
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Query user and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // If role was explicitly specified in login request, verify match
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `Invalid credentials for ${role === 'officer' ? 'Placement Officer' : 'Student'} portal.`,
      });
    }

    // Compare passwords
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        branch: user.branch,
        cgpa: user.cgpa,
        activeBacklogs: user.activeBacklogs,
        passingYear: user.passingYear,
        phone: user.phone,
        skills: user.skills,
        resumeUrl: user.resumeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Allowed update fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.resumeUrl !== undefined) user.resumeUrl = req.body.resumeUrl;

    // Student academic details
    if (user.role === 'student') {
      if (req.body.branch) user.branch = req.body.branch;
      if (req.body.cgpa !== undefined) user.cgpa = Number(req.body.cgpa);
      if (req.body.activeBacklogs !== undefined)
        user.activeBacklogs = Number(req.body.activeBacklogs);
      if (req.body.passingYear !== undefined)
        user.passingYear = Number(req.body.passingYear);
      if (req.body.skills !== undefined) {
        if (Array.isArray(req.body.skills)) {
          user.skills = req.body.skills;
        } else if (typeof req.body.skills === 'string') {
          user.skills = req.body.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
    }

    // Optional password change
    if (req.body.password && req.body.password.trim().length >= 6) {
      user.password = req.body.password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
