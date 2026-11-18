/**
 * mappings.js
 * Explicit schema definitions, column mappings, and transformations
 * between MongoDB collections and MySQL tables.
 */

const SCHEMA_DEFINITIONS = {
  users: {
    targetTable: 'users',
    fields: [
      { source: 'name', target: 'name', type: 'VARCHAR(255)', required: true },
      { source: 'email', target: 'email', type: 'VARCHAR(255)', required: true },
      { source: 'password', target: 'password', type: 'VARCHAR(255)', required: true },
      { source: 'role', target: 'role', type: 'ENUM', required: true, allowed: ['student', 'officer'], default: 'student' },
      { source: 'rollNo', target: 'roll_no', type: 'VARCHAR(50)', transform: 'rollNo' },
      { source: 'branch', target: 'branch', type: 'VARCHAR(20)', default: 'CSE' },
      { source: 'cgpa', target: 'cgpa', type: 'DECIMAL(4,2)', default: 0.00 },
      { source: 'activeBacklogs', target: 'active_backlogs', type: 'INT', default: 0 },
      { source: 'passingYear', target: 'passing_year', type: 'INT', default: 2026 },
      { source: 'phone', target: 'phone', type: 'VARCHAR(25)', default: '' },
      { source: 'resumeUrl', target: 'resume_url', type: 'VARCHAR(1024)', default: '' },
      { source: 'resumeFile.filename', target: 'resume_file_name', type: 'VARCHAR(255)' },
      { source: 'resumeFile.originalName', target: 'resume_original_name', type: 'VARCHAR(255)' },
      { source: 'resumeFile.mimeType', target: 'resume_mime_type', type: 'VARCHAR(100)' },
      { source: 'resumeFile.size', target: 'resume_size', type: 'BIGINT' },
      { source: 'resumeFile.path', target: 'resume_path', type: 'VARCHAR(1024)' },
      { source: 'resumeFile.uploadedAt', target: 'resume_uploaded_at', type: 'DATETIME(3)' },
      { source: 'academicDetails.tenthPercentage', target: 'tenth_percentage', type: 'DECIMAL(5,2)' },
      { source: 'academicDetails.twelfthPercentage', target: 'twelfth_percentage', type: 'DECIMAL(5,2)' },
      { source: 'academicDetails.diplomaPercentage', target: 'diploma_percentage', type: 'DECIMAL(5,2)' },
      { source: 'academicDetails.currentSemester', target: 'current_semester', type: 'INT' },
      { source: 'academicDetails.gapYears', target: 'gap_years', type: 'INT', default: 0 },
      { source: 'links.github', target: 'github_link', type: 'VARCHAR(500)', default: '' },
      { source: 'links.linkedin', target: 'linkedin_link', type: 'VARCHAR(500)', default: '' },
      { source: 'links.portfolio', target: 'portfolio_link', type: 'VARCHAR(500)', default: '' },
      { source: 'createdAt', target: 'created_at', type: 'DATETIME(3)', required: true },
      { source: 'updatedAt', target: 'updated_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['__v'],
  },

  student_skills: {
    targetTable: 'student_skills',
    sourceCollection: 'users',
    sourceArray: 'skills',
    fields: [
      { target: 'student_id', type: 'BIGINT', required: true, refTable: 'users' },
      { target: 'skill', type: 'VARCHAR(100)', required: true },
      { target: 'created_at', type: 'DATETIME(3)', required: true },
    ],
  },

  student_projects: {
    targetTable: 'student_projects',
    sourceCollection: 'users',
    sourceArray: 'projects',
    fields: [
      { target: 'student_id', type: 'BIGINT', required: true, refTable: 'users' },
      { source: 'title', target: 'title', type: 'VARCHAR(255)', default: '' },
      { source: 'description', target: 'description', type: 'TEXT' },
      { source: 'link', target: 'link', type: 'VARCHAR(500)', default: '' },
      { target: 'created_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['_id (subdocument ObjectId replaced by MySQL auto-increment BIGINT)'],
  },

  student_project_tech_stacks: {
    targetTable: 'student_project_tech_stacks',
    sourceCollection: 'users',
    sourceArray: 'projects.techStack',
    fields: [
      { target: 'project_id', type: 'BIGINT', required: true, refTable: 'student_projects' },
      { target: 'tech', type: 'VARCHAR(100)', required: true },
    ],
  },

  student_certifications: {
    targetTable: 'student_certifications',
    sourceCollection: 'users',
    sourceArray: 'certifications',
    fields: [
      { target: 'student_id', type: 'BIGINT', required: true, refTable: 'users' },
      { source: 'name', target: 'name', type: 'VARCHAR(255)', default: '' },
      { source: 'issuer', target: 'issuer', type: 'VARCHAR(255)', default: '' },
      { source: 'issueDate', target: 'issue_date', type: 'VARCHAR(100)', default: '' },
      { source: 'certificateUrl', target: 'certificate_url', type: 'VARCHAR(1024)', default: '' },
      { target: 'created_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['_id (subdocument ObjectId replaced by MySQL auto-increment BIGINT)'],
  },

  companies: {
    targetTable: 'companies',
    fields: [
      { source: 'name', target: 'name', type: 'VARCHAR(255)', required: true, unique: true },
      { source: 'industry', target: 'industry', type: 'VARCHAR(100)', required: true },
      { source: 'website', target: 'website', type: 'VARCHAR(500)', default: '' },
      { source: 'location', target: 'location', type: 'VARCHAR(255)', required: true },
      { source: 'description', target: 'description', type: 'TEXT', required: true },
      { source: 'contactEmail', target: 'contact_email', type: 'VARCHAR(255)', default: '' },
      { source: 'contactPerson', target: 'contact_person', type: 'VARCHAR(255)', default: '' },
      { source: 'logoUrl', target: 'logo_url', type: 'VARCHAR(1024)', default: '' },
      { source: 'createdAt', target: 'created_at', type: 'DATETIME(3)', required: true },
      { source: 'updatedAt', target: 'updated_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['__v'],
  },

  placement_drives: {
    targetTable: 'placement_drives',
    fields: [
      { source: 'company', target: 'company_id', type: 'BIGINT', required: true, refTable: 'companies' },
      { source: 'title', target: 'title', type: 'VARCHAR(255)', required: true },
      { source: 'jobRole', target: 'job_role', type: 'VARCHAR(255)', required: true },
      { source: 'jobDescription', target: 'job_description', type: 'TEXT', required: true },
      { source: 'packageCTC', target: 'package_ctc', type: 'VARCHAR(100)', required: true },
      { source: 'location', target: 'location', type: 'VARCHAR(255)', required: true },
      { source: 'eligibility.minCGPA', target: 'min_cgpa', type: 'DECIMAL(4,2)', default: 6.00 },
      { source: 'eligibility.maxBacklogs', target: 'max_backlogs', type: 'INT', default: 0 },
      { source: 'eligibility.passingYear', target: 'passing_year', type: 'INT', default: 2026 },
      { source: 'driveDate', target: 'drive_date', type: 'DATETIME(3)', required: true },
      { source: 'deadline', target: 'deadline', type: 'DATETIME(3)', required: true },
      { source: 'status', target: 'status', type: 'VARCHAR(50)', default: 'Upcoming', allowed: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] },
      { source: 'createdBy', target: 'created_by', type: 'BIGINT', refTable: 'users', nullable: true },
      { source: 'createdAt', target: 'created_at', type: 'DATETIME(3)', required: true },
      { source: 'updatedAt', target: 'updated_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['__v'],
  },

  drive_allowed_branches: {
    targetTable: 'drive_allowed_branches',
    sourceCollection: 'placementdrives',
    sourceArray: 'eligibility.allowedBranches',
    fields: [
      { target: 'drive_id', type: 'BIGINT', required: true, refTable: 'placement_drives' },
      { target: 'branch', type: 'VARCHAR(50)', required: true },
    ],
  },

  drive_rounds: {
    targetTable: 'drive_rounds',
    sourceCollection: 'placementdrives',
    sourceArray: 'rounds',
    fields: [
      { target: 'drive_id', type: 'BIGINT', required: true, refTable: 'placement_drives' },
      { target: 'round_order', type: 'INT', required: true },
      { target: 'round_name', type: 'VARCHAR(100)', required: true },
    ],
  },

  drive_required_skills: {
    targetTable: 'drive_required_skills',
    sourceCollection: 'placementdrives',
    sourceArray: 'requiredSkills',
    fields: [
      { target: 'drive_id', type: 'BIGINT', required: true, refTable: 'placement_drives' },
      { target: 'skill', type: 'VARCHAR(100)', required: true },
    ],
  },

  applications: {
    targetTable: 'applications',
    fields: [
      { source: 'drive', target: 'drive_id', type: 'BIGINT', required: true, refTable: 'placement_drives' },
      { source: 'student', target: 'student_id', type: 'BIGINT', required: true, refTable: 'users' },
      { source: 'appliedAt', target: 'applied_at', type: 'DATETIME(3)', required: true },
      { source: 'status', target: 'status', type: 'VARCHAR(50)', default: 'Applied', allowed: ['Applied', 'Shortlisted', 'Technical Round', 'Interview', 'Selected', 'Rejected'] },
      { source: 'remarks', target: 'remarks', type: 'VARCHAR(1000)', default: 'Application submitted successfully.' },
      { source: 'createdAt', target: 'created_at', type: 'DATETIME(3)', required: true },
      { source: 'updatedAt', target: 'updated_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['__v'],
  },

  application_status_history: {
    targetTable: 'application_status_history',
    sourceCollection: 'applications',
    sourceArray: 'statusHistory',
    fields: [
      { target: 'application_id', type: 'BIGINT', required: true, refTable: 'applications' },
      { source: 'status', target: 'status', type: 'VARCHAR(50)', required: true },
      { source: 'remarks', target: 'remarks', type: 'VARCHAR(1000)', default: '' },
      { source: 'changedBy', target: 'changed_by', type: 'BIGINT', refTable: 'users', nullable: true },
      { source: 'changedAt', target: 'changed_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['_id (subdocument ObjectId replaced by MySQL auto-increment BIGINT)'],
  },

  notifications: {
    targetTable: 'notifications',
    fields: [
      { source: 'recipient', target: 'recipient_id', type: 'BIGINT', required: true, refTable: 'users' },
      { source: 'role', target: 'role', type: 'VARCHAR(20)', default: 'student' },
      { source: 'title', target: 'title', type: 'VARCHAR(255)', required: true },
      { source: 'message', target: 'message', type: 'TEXT', required: true },
      { source: 'type', target: 'type', type: 'VARCHAR(50)', default: 'SYSTEM' },
      { source: 'relatedEntity', target: 'related_entity_id', type: 'BIGINT', nullable: true },
      { source: 'relatedEntityType', target: 'related_entity_type', type: 'VARCHAR(50)', nullable: true },
      { source: 'link', target: 'link', type: 'VARCHAR(500)', nullable: true },
      { source: 'isRead', target: 'is_read', type: 'BOOLEAN', default: false },
      { source: 'readAt', target: 'read_at', type: 'DATETIME(3)', nullable: true },
      { source: 'metadata', target: 'metadata_json', type: 'JSON', nullable: true },
      { source: 'createdAt', target: 'created_at', type: 'DATETIME(3)', required: true },
      { source: 'updatedAt', target: 'updated_at', type: 'DATETIME(3)', required: true },
    ],
    unmappedSourceFields: ['__v'],
  },
};

// Transformation helper functions
const Transformers = {
  formatDate(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    // Format YYYY-MM-DD HH:mm:ss.SSS for MySQL DATETIME(3)
    return d.toISOString().replace('T', ' ').replace('Z', '').substring(0, 23);
  },

  cleanRollNo(val) {
    if (val === undefined || val === null) return null;
    const trimmed = String(val).trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  },

  cleanString(val, maxLength) {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (maxLength && str.length > maxLength) {
      return str.substring(0, maxLength);
    }
    return str;
  },

  cleanJson(val) {
    if (val === undefined || val === null) return null;
    try {
      return JSON.stringify(val);
    } catch (_) {
      return null;
    }
  },

  cleanBoolean(val) {
    return Boolean(val);
  },

  cleanNumber(val, defaultVal = null) {
    if (val === undefined || val === null || val === '') return defaultVal;
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
  },
};

// All 13 target tables populated by this migration runner
const POPULATED_TARGET_TABLES = [
  'users',
  'companies',
  'student_skills',
  'student_projects',
  'student_project_tech_stacks',
  'student_certifications',
  'placement_drives',
  'drive_allowed_branches',
  'drive_rounds',
  'drive_required_skills',
  'applications',
  'application_status_history',
  'notifications',
];

// All 5 Flyway V1 tables intentionally excluded from migration population
const EXCLUDED_ARCHITECTURAL_TABLES = [
  {
    table: 'application_withdrawals',
    reason: 'New relational architectural table for withdrawal history; no historical application withdrawal records exist in legacy MongoDB.',
  },
  {
    table: 'notification_outbox',
    reason: 'Transactional outbox table for reliable event dispatching; populated dynamically during live application runtime mutations.',
  },
  {
    table: 'audit_logs',
    reason: 'Security and administrative audit trail; populated dynamically during live application runtime mutations.',
  },
  {
    table: 'idempotency_keys',
    reason: 'Mutation replay deduplication cache; populated dynamically during live application runtime mutations.',
  },
  {
    table: 'system_settings',
    reason: 'Global system settings key-value store; populated on demand or during runtime administration.',
  },
];

module.exports = {
  SCHEMA_DEFINITIONS,
  Transformers,
  POPULATED_TARGET_TABLES,
  EXCLUDED_ARCHITECTURAL_TABLES,
};
