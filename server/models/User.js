const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['student', 'officer'],
      default: 'student',
    },
    // Student Specific Fields
    rollNo: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true, // Allows null for officers while enforcing uniqueness for students
    },
    branch: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'OTHER'],
      default: 'CSE',
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10.0'],
      default: 0.0,
    },
    activeBacklogs: {
      type: Number,
      min: [0, 'Backlogs cannot be negative'],
      default: 0,
    },
    passingYear: {
      type: Number,
      default: 2026,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // v2.1.1 Additive Profile Foundation Fields
    academicDetails: {
      tenthPercentage: {
        type: Number,
        min: [0, '10th percentage cannot be negative'],
        max: [100, '10th percentage cannot exceed 100%'],
        default: null,
      },
      twelfthPercentage: {
        type: Number,
        min: [0, '12th percentage cannot be negative'],
        max: [100, '12th percentage cannot exceed 100%'],
        default: null,
      },
      diplomaPercentage: {
        type: Number,
        min: [0, 'Diploma percentage cannot be negative'],
        max: [100, 'Diploma percentage cannot exceed 100%'],
        default: null,
      },
      currentSemester: {
        type: Number,
        min: [1, 'Semester must be at least 1'],
        max: [12, 'Semester cannot exceed 12'],
        default: null,
      },
      gapYears: {
        type: Number,
        min: [0, 'Gap years cannot be negative'],
        default: 0,
      },
    },
    links: {
      github: {
        type: String,
        trim: true,
        default: '',
      },
      linkedin: {
        type: String,
        trim: true,
        default: '',
      },
      portfolio: {
        type: String,
        trim: true,
        default: '',
      },
    },
    projects: [
      {
        title: { type: String, trim: true, default: '' },
        description: { type: String, trim: true, default: '' },
        techStack: { type: [String], default: [] },
        link: { type: String, trim: true, default: '' },
      },
    ],
    certifications: [
      {
        name: { type: String, trim: true, default: '' },
        issuer: { type: String, trim: true, default: '' },
        issueDate: { type: String, trim: true, default: '' },
        certificateUrl: { type: String, trim: true, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
