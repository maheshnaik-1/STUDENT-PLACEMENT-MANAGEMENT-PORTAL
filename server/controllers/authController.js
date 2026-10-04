const path = require('path');
const fs = require('fs');
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
        resumeFile: user.resumeFile || {},
        academicDetails: user.academicDetails || {},
        links: user.links || {},
        projects: user.projects || [],
        certifications: user.certifications || [],
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
        resumeFile: user.resumeFile || {},
        academicDetails: user.academicDetails || {},
        links: user.links || {},
        projects: user.projects || [],
        certifications: user.certifications || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to validate HTTP/HTTPS URLs
 */
const isValidUrl = (string) => {
  if (!string || typeof string !== 'string') return true;
  const trimmed = string.trim();
  if (trimmed === '') return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
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

    // Allowed basic update fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.resumeUrl !== undefined) {
      if (!isValidUrl(req.body.resumeUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid resume URL (e.g., https://...)',
        });
      }
      user.resumeUrl = req.body.resumeUrl.trim();
    }

    // Student specific academic details and v2.1.1 extended profile
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

      // v2.1.1 Academic Details Validation & Update
      if (req.body.academicDetails && typeof req.body.academicDetails === 'object') {
        const ad = req.body.academicDetails;
        user.academicDetails = user.academicDetails || {};

        if (ad.tenthPercentage !== undefined) {
          const val = ad.tenthPercentage === null || ad.tenthPercentage === '' ? null : Number(ad.tenthPercentage);
          if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
            return res.status(400).json({
              success: false,
              message: '10th percentage must be a number between 0 and 100',
            });
          }
          user.academicDetails.tenthPercentage = val;
        }

        if (ad.twelfthPercentage !== undefined) {
          const val = ad.twelfthPercentage === null || ad.twelfthPercentage === '' ? null : Number(ad.twelfthPercentage);
          if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
            return res.status(400).json({
              success: false,
              message: '12th percentage must be a number between 0 and 100',
            });
          }
          user.academicDetails.twelfthPercentage = val;
        }

        if (ad.diplomaPercentage !== undefined) {
          const val = ad.diplomaPercentage === null || ad.diplomaPercentage === '' ? null : Number(ad.diplomaPercentage);
          if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
            return res.status(400).json({
              success: false,
              message: 'Diploma percentage must be a number between 0 and 100',
            });
          }
          user.academicDetails.diplomaPercentage = val;
        }

        if (ad.currentSemester !== undefined) {
          const val = ad.currentSemester === null || ad.currentSemester === '' ? null : Number(ad.currentSemester);
          if (val !== null && (isNaN(val) || !Number.isInteger(val) || val < 1 || val > 12)) {
            return res.status(400).json({
              success: false,
              message: 'Current semester must be an integer between 1 and 12',
            });
          }
          user.academicDetails.currentSemester = val;
        }

        if (ad.gapYears !== undefined) {
          const val = Number(ad.gapYears);
          if (isNaN(val) || val < 0) {
            return res.status(400).json({
              success: false,
              message: 'Gap years must be a non-negative number',
            });
          }
          user.academicDetails.gapYears = val;
        }
      }

      // v2.1.1 Social / Portfolio Links Validation & Update
      if (req.body.links && typeof req.body.links === 'object') {
        const l = req.body.links;
        user.links = user.links || {};

        if (l.github !== undefined) {
          if (!isValidUrl(l.github)) {
            return res.status(400).json({
              success: false,
              message: 'GitHub link must be a valid URL format (e.g. https://github.com/...)',
            });
          }
          user.links.github = (l.github || '').trim();
        }

        if (l.linkedin !== undefined) {
          if (!isValidUrl(l.linkedin)) {
            return res.status(400).json({
              success: false,
              message: 'LinkedIn link must be a valid URL format (e.g. https://linkedin.com/...)',
            });
          }
          user.links.linkedin = (l.linkedin || '').trim();
        }

        if (l.portfolio !== undefined) {
          if (!isValidUrl(l.portfolio)) {
            return res.status(400).json({
              success: false,
              message: 'Portfolio link must be a valid URL format (e.g. https://...)',
            });
          }
          user.links.portfolio = (l.portfolio || '').trim();
        }
      }

      // v2.1.1 Projects Validation & Update
      if (req.body.projects !== undefined) {
        if (!Array.isArray(req.body.projects)) {
          return res.status(400).json({
            success: false,
            message: 'Projects must be an array of project items',
          });
        }

        const formattedProjects = [];
        for (const proj of req.body.projects) {
          if (typeof proj === 'object' && proj !== null) {
            if (proj.link && !isValidUrl(proj.link)) {
              return res.status(400).json({
                success: false,
                message: `Invalid project URL format for project "${proj.title || 'Untitled'}"`,
              });
            }

            let stack = [];
            if (Array.isArray(proj.techStack)) {
              stack = proj.techStack;
            } else if (typeof proj.techStack === 'string') {
              stack = proj.techStack.split(',').map((s) => s.trim()).filter(Boolean);
            }

            formattedProjects.push({
              title: (proj.title || '').trim(),
              description: (proj.description || '').trim(),
              techStack: stack,
              link: (proj.link || '').trim(),
            });
          }
        }
        user.projects = formattedProjects;
      }

      // v2.1.1 Certifications Validation & Update
      if (req.body.certifications !== undefined) {
        if (!Array.isArray(req.body.certifications)) {
          return res.status(400).json({
            success: false,
            message: 'Certifications must be an array of certification items',
          });
        }

        const formattedCerts = [];
        for (const cert of req.body.certifications) {
          if (typeof cert === 'object' && cert !== null) {
            if (cert.certificateUrl && !isValidUrl(cert.certificateUrl)) {
              return res.status(400).json({
                success: false,
                message: `Invalid certificate URL format for "${cert.name || 'Untitled'}"`,
              });
            }

            formattedCerts.push({
              name: (cert.name || '').trim(),
              issuer: (cert.issuer || '').trim(),
              issueDate: (cert.issueDate || '').trim(),
              certificateUrl: (cert.certificateUrl || '').trim(),
            });
          }
        }
        user.certifications = formattedCerts;
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

/**
 * @desc    Upload student resume file (PDF, DOC, DOCX up to 5MB)
 * @route   POST /api/auth/resume-upload
 * @access  Private (Student only / Authenticated user)
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a resume file to upload (PDF, DOC, DOCX up to 5MB)',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Keep track of old file to remove only AFTER successful database update
    const oldFilename = user.resumeFile && user.resumeFile.filename;

    // Update resumeFile metadata
    user.resumeFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date(),
    };

    await user.save();

    // Safely remove old physical file from disk if it was replaced with a new one
    if (oldFilename && oldFilename !== req.file.filename) {
      const resumesDir = path.resolve(__dirname, '../uploads/resumes');
      const oldFilePath = path.join(resumesDir, path.basename(oldFilename));
      if (oldFilePath.startsWith(resumesDir) && fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (unlinkErr) {
          console.error('[Resume Upload] Warning removing old resume file:', unlinkErr.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully!',
      resumeFile: {
        filename: user.resumeFile.filename,
        originalName: user.resumeFile.originalName,
        mimeType: user.resumeFile.mimeType,
        size: user.resumeFile.size,
        uploadedAt: user.resumeFile.uploadedAt,
      },
    });
  } catch (error) {
    // If saving to DB fails, clean up the newly uploaded file to avoid orphans
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanErr) {
        console.error('[Resume Upload] Error cleaning orphaned file:', cleanErr.message);
      }
    }
    next(error);
  }
};

/**
 * @desc    Delete student uploaded resume file
 * @route   DELETE /api/auth/resume
 * @access  Private (Authenticated user)
 */
const deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // If an uploaded resume file exists on disk, remove it safely
    if (user.resumeFile && user.resumeFile.filename) {
      const resumesDir = path.resolve(__dirname, '../uploads/resumes');
      const safeFilename = path.basename(user.resumeFile.filename);
      const filePath = path.join(resumesDir, safeFilename);

      if (filePath.startsWith(resumesDir) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('[Resume Delete] Warning removing file from disk:', unlinkErr.message);
        }
      }
    }

    // Reset resumeFile metadata safely (leaves resumeUrl untouched)
    user.resumeFile = {
      filename: null,
      originalName: null,
      mimeType: null,
      size: null,
      path: null,
      uploadedAt: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Uploaded resume removed successfully',
      resumeFile: user.resumeFile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download / view student uploaded resume file with authorization & path-traversal protection
 * @route   GET /api/auth/resume (for logged in user) OR GET /api/auth/resume-download/:studentId
 * @access  Private (Student for self, Placement Officer for any student)
 */
const getResumeFile = async (req, res, next) => {
  try {
    const targetUserId = req.params.studentId || req.user._id;

    // Student can only access their own resume; Officer can access any student's resume
    if (req.user.role === 'student' && req.user._id.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this resume',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (!targetUser.resumeFile || !targetUser.resumeFile.filename) {
      return res.status(404).json({
        success: false,
        message: 'No uploaded resume found for this student',
      });
    }

    // Strict path traversal prevention: resolve strictly within uploads/resumes directory
    const resumesDir = path.resolve(__dirname, '../uploads/resumes');
    const safeFilename = path.basename(targetUser.resumeFile.filename);
    const filePath = path.join(resumesDir, safeFilename);

    if (!filePath.startsWith(resumesDir) || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found on server disk',
      });
    }

    // Set secure response headers for streaming/download
    res.setHeader('Content-Type', targetUser.resumeFile.mimeType || 'application/octet-stream');
    const originalName = targetUser.resumeFile.originalName || safeFilename;
    const encodedName = encodeURIComponent(originalName);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${originalName}"; filename*=UTF-8''${encodedName}`
    );

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  uploadResume,
  deleteResume,
  getResumeFile,
};
