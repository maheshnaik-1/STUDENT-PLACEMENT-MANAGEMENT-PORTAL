/**
 * validator.js
 * Comprehensive preflight validation engine for source MongoDB data
 * against MySQL relational constraints, uniqueness rules, enums, and lengths.
 */

const Logger = require('./logger');

const BCRYPT_REGEX = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

class PreflightValidator {
  constructor(data) {
    this.users = data.users || [];
    this.companies = data.companies || [];
    this.drives = data.drives || [];
    this.applications = data.applications || [];
    this.notifications = data.notifications || [];

    this.userMap = new Map(this.users.map(u => [u._id.toString(), u]));
    this.companyMap = new Map(this.companies.map(c => [c._id.toString(), c]));
    this.driveMap = new Map(this.drives.map(d => [d._id.toString(), d]));
    this.appMap = new Map(this.applications.map(a => [a._id.toString(), a]));

    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalRecordsAudited: 0,
      checksExecuted: 0,
      checksPassed: 0,
      checksFailed: 0,
    };
  }

  recordCheck(name, passed, errorMsg = null, isWarning = false) {
    this.stats.checksExecuted++;
    if (passed) {
      this.stats.checksPassed++;
    } else {
      this.stats.checksFailed++;
      if (isWarning) {
        this.warnings.push(`[${name}] ${errorMsg}`);
      } else {
        this.errors.push(`[${name}] ${errorMsg}`);
      }
    }
  }

  validateAll() {
    Logger.info('Beginning preflight data integrity validation...');

    this.validateUsers();
    this.validateCompanies();
    this.validateDrives();
    this.validateApplications();
    this.validateNotifications();

    this.stats.totalRecordsAudited =
      this.users.length +
      this.companies.length +
      this.drives.length +
      this.applications.length +
      this.notifications.length;

    const isHealthy = this.errors.length === 0;
    return {
      isHealthy,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats,
    };
  }

  validateUsers() {
    const emailSet = new Set();
    const rollNoSet = new Set();

    for (const u of this.users) {
      const uId = u._id.toString();

      // Required fields
      this.recordCheck('User:NameRequired', Boolean(u.name && u.name.trim()), `User ${uId} is missing a name`);
      this.recordCheck('User:EmailRequired', Boolean(u.email && u.email.trim()), `User ${uId} is missing an email`);
      this.recordCheck('User:PasswordRequired', Boolean(u.password), `User ${uId} is missing password hash`);

      // Password BCrypt format
      if (u.password) {
        const isBcrypt = BCRYPT_REGEX.test(u.password) && u.password.length === 60;
        this.recordCheck('User:PasswordBcryptFormat', isBcrypt, `User ${uId} password is not a valid 60-character BCrypt hash`);
      }

      // Email uniqueness & format
      if (u.email) {
        const lowerEmail = u.email.trim().toLowerCase();
        this.recordCheck('User:EmailUnique', !emailSet.has(lowerEmail), `Duplicate email detected: ${lowerEmail}`);
        emailSet.add(lowerEmail);
        this.recordCheck('User:EmailFormat', EMAIL_REGEX.test(lowerEmail), `Invalid email format: ${lowerEmail}`);
        this.recordCheck('User:EmailLength', lowerEmail.length <= 255, `Email length > 255 for user ${uId}`);
      }

      // Role enum
      this.recordCheck('User:RoleEnum', ['student', 'officer'].includes(u.role), `Invalid user role "${u.role}" on user ${uId}`);

      // RollNo uniqueness & nullable check
      if (u.rollNo && u.rollNo.trim()) {
        const normRollNo = u.rollNo.trim().toUpperCase();
        this.recordCheck('User:RollNoUnique', !rollNoSet.has(normRollNo), `Duplicate roll number detected: ${normRollNo}`);
        rollNoSet.add(normRollNo);
        this.recordCheck('User:RollNoLength', normRollNo.length <= 50, `Roll number length > 50 on user ${uId}`);
      }

      // Academic details
      if (u.academicDetails) {
        const ad = u.academicDetails;
        if (ad.tenthPercentage != null) {
          this.recordCheck('User:TenthPercentageRange', ad.tenthPercentage >= 0 && ad.tenthPercentage <= 100, `10th percentage out of range (0-100) on user ${uId}`);
        }
        if (ad.twelfthPercentage != null) {
          this.recordCheck('User:TwelfthPercentageRange', ad.twelfthPercentage >= 0 && ad.twelfthPercentage <= 100, `12th percentage out of range (0-100) on user ${uId}`);
        }
        if (ad.currentSemester != null) {
          this.recordCheck('User:SemesterRange', ad.currentSemester >= 1 && ad.currentSemester <= 12, `Semester out of range (1-12) on user ${uId}`);
        }
      }

      // Resume file metadata
      if (u.resumeFile && u.resumeFile.filename) {
        const rf = u.resumeFile;
        this.recordCheck('User:ResumeFileLength', rf.filename.length <= 255, `Resume filename > 255 on user ${uId}`);
        if (rf.mimeType) this.recordCheck('User:ResumeMimeLength', rf.mimeType.length <= 100, `Resume mime type > 100 on user ${uId}`);
        if (rf.path) this.recordCheck('User:ResumePathLength', rf.path.length <= 1024, `Resume path > 1024 on user ${uId}`);
      }

      // Skills array
      if (Array.isArray(u.skills)) {
        const seenSkills = new Set();
        for (const s of u.skills) {
          const clean = (s || '').trim();
          this.recordCheck('User:SkillLength', clean.length <= 100, `Skill string > 100 on user ${uId}`);
          this.recordCheck('User:SkillDuplicateInProfile', !seenSkills.has(clean.toLowerCase()), `Duplicate skill "${clean}" on user ${uId}`);
          seenSkills.add(clean.toLowerCase());
        }
      }
    }
  }

  validateCompanies() {
    const companyNames = new Set();

    for (const c of this.companies) {
      const cId = c._id.toString();

      // Required fields
      this.recordCheck('Company:NameRequired', Boolean(c.name && c.name.trim()), `Company ${cId} is missing name`);
      this.recordCheck('Company:IndustryRequired', Boolean(c.industry && c.industry.trim()), `Company ${cId} is missing industry`);
      this.recordCheck('Company:LocationRequired', Boolean(c.location && c.location.trim()), `Company ${cId} is missing location`);
      this.recordCheck('Company:DescriptionRequired', Boolean(c.description && c.description.trim()), `Company ${cId} is missing description`);

      // Name uniqueness
      if (c.name) {
        const normName = c.name.trim().toLowerCase();
        this.recordCheck('Company:NameUnique', !companyNames.has(normName), `Duplicate company name detected: ${c.name}`);
        companyNames.add(normName);
        this.recordCheck('Company:NameLength', normName.length <= 255, `Company name > 255 on company ${cId}`);
      }

      if (c.industry) this.recordCheck('Company:IndustryLength', c.industry.length <= 100, `Industry > 100 on company ${cId}`);
      if (c.website) this.recordCheck('Company:WebsiteLength', c.website.length <= 500, `Website > 500 on company ${cId}`);
      if (c.location) this.recordCheck('Company:LocationLength', c.location.length <= 255, `Location > 255 on company ${cId}`);
    }
  }

  validateDrives() {
    for (const d of this.drives) {
      const dId = d._id.toString();

      // Company foreign key
      const compId = d.company ? d.company.toString() : null;
      this.recordCheck('Drive:CompanyRefExists', Boolean(compId && this.companyMap.has(compId)), `Drive ${dId} references missing company: ${compId}`);

      // CreatedBy foreign key (nullable)
      if (d.createdBy) {
        const cbId = d.createdBy.toString();
        this.recordCheck('Drive:CreatedByRefExists', this.userMap.has(cbId), `Drive ${dId} references missing user: ${cbId}`);
      }

      // Required fields
      this.recordCheck('Drive:TitleRequired', Boolean(d.title && d.title.trim()), `Drive ${dId} is missing title`);
      this.recordCheck('Drive:JobRoleRequired', Boolean(d.jobRole && d.jobRole.trim()), `Drive ${dId} is missing jobRole`);
      this.recordCheck('Drive:PackageCTCRequired', Boolean(d.packageCTC && d.packageCTC.trim()), `Drive ${dId} is missing packageCTC`);
      this.recordCheck('Drive:DriveDateRequired', Boolean(d.driveDate), `Drive ${dId} is missing driveDate`);
      this.recordCheck('Drive:DeadlineRequired', Boolean(d.deadline), `Drive ${dId} is missing deadline`);

      // Status enum
      this.recordCheck('Drive:StatusEnum', ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(d.status), `Invalid drive status "${d.status}" on drive ${dId}`);

      // String lengths
      if (d.title) this.recordCheck('Drive:TitleLength', d.title.length <= 255, `Drive title > 255 on drive ${dId}`);
      if (d.jobRole) this.recordCheck('Drive:JobRoleLength', d.jobRole.length <= 255, `Job role > 255 on drive ${dId}`);
      if (d.packageCTC) this.recordCheck('Drive:PackageCTCLength', d.packageCTC.length <= 100, `Package CTC > 100 on drive ${dId}`);

      // Allowed branches
      const branches = (d.eligibility && d.eligibility.allowedBranches) || [];
      const seenBranches = new Set();
      for (const b of branches) {
        const norm = (b || '').trim();
        this.recordCheck('Drive:AllowedBranchLength', norm.length <= 50, `Allowed branch > 50 on drive ${dId}`);
        this.recordCheck('Drive:BranchDuplicateInDrive', !seenBranches.has(norm), `Duplicate allowed branch "${norm}" on drive ${dId}`);
        seenBranches.add(norm);
      }

      // Rounds
      const rounds = d.rounds || [];
      const seenRounds = new Set();
      for (const r of rounds) {
        const norm = (r || '').trim();
        this.recordCheck('Drive:RoundLength', norm.length <= 100, `Round name > 100 on drive ${dId}`);
        this.recordCheck('Drive:RoundDuplicateInDrive', !seenRounds.has(norm), `Duplicate round name "${norm}" on drive ${dId}`);
        seenRounds.add(norm);
      }

      // Required skills
      const reqSkills = d.requiredSkills || [];
      const seenReqSkills = new Set();
      for (const s of reqSkills) {
        const norm = (s || '').trim();
        this.recordCheck('Drive:RequiredSkillLength', norm.length <= 100, `Required skill > 100 on drive ${dId}`);
        this.recordCheck('Drive:RequiredSkillDuplicate', !seenReqSkills.has(norm.toLowerCase()), `Duplicate required skill "${norm}" on drive ${dId}`);
        seenReqSkills.add(norm.toLowerCase());
      }
    }
  }

  validateApplications() {
    const pairSet = new Set();

    for (const a of this.applications) {
      const aId = a._id.toString();
      const driveId = a.drive ? a.drive.toString() : null;
      const studentId = a.student ? a.student.toString() : null;

      // Foreign keys
      this.recordCheck('Application:DriveRefExists', Boolean(driveId && this.driveMap.has(driveId)), `Application ${aId} references missing drive: ${driveId}`);
      this.recordCheck('Application:StudentRefExists', Boolean(studentId && this.userMap.has(studentId)), `Application ${aId} references missing student: ${studentId}`);

      // Student role check
      if (studentId && this.userMap.has(studentId)) {
        const user = this.userMap.get(studentId);
        this.recordCheck('Application:ApplicantRoleIsStudent', user.role === 'student', `Applicant ${studentId} in application ${aId} has non-student role: ${user.role}`);
      }

      // Compound unique index (drive, student)
      if (driveId && studentId) {
        const pairKey = `${driveId}_${studentId}`;
        this.recordCheck('Application:DriveStudentUnique', !pairSet.has(pairKey), `Duplicate application pair detected for drive ${driveId} and student ${studentId}`);
        pairSet.add(pairKey);
      }

      // Status enum
      const validStatuses = ['Applied', 'Shortlisted', 'Technical Round', 'Interview', 'Selected', 'Rejected'];
      this.recordCheck('Application:StatusEnum', validStatuses.includes(a.status), `Invalid application status "${a.status}" on app ${aId}`);

      // Status history
      if (Array.isArray(a.statusHistory)) {
        for (const sh of a.statusHistory) {
          if (sh.changedBy) {
            const cbId = sh.changedBy.toString();
            this.recordCheck('Application:StatusHistoryChangedByExists', this.userMap.has(cbId), `Status history on app ${aId} references missing user: ${cbId}`);
          }
          if (sh.remarks) {
            this.recordCheck('Application:StatusHistoryRemarksLength', sh.remarks.length <= 1000, `Status history remarks > 1000 on app ${aId}`);
          }
        }
      }
    }
  }

  validateNotifications() {
    for (const n of this.notifications) {
      const nId = n._id.toString();
      const recipId = n.recipient ? n.recipient.toString() : null;

      // Recipient foreign key
      this.recordCheck('Notification:RecipientRefExists', Boolean(recipId && this.userMap.has(recipId)), `Notification ${nId} references missing recipient: ${recipId}`);

      // Required fields
      this.recordCheck('Notification:TitleRequired', Boolean(n.title && n.title.trim()), `Notification ${nId} missing title`);
      this.recordCheck('Notification:MessageRequired', Boolean(n.message && n.message.trim()), `Notification ${nId} missing message`);

      // Related entity reference
      if (n.relatedEntity) {
        const reId = n.relatedEntity.toString();
        let exists = false;
        if (n.relatedEntityType === 'Application') exists = this.appMap.has(reId);
        else if (n.relatedEntityType === 'PlacementDrive') exists = this.driveMap.has(reId);
        else if (n.relatedEntityType === 'User') exists = this.userMap.has(reId);
        else exists = this.appMap.has(reId) || this.driveMap.has(reId) || this.userMap.has(reId);

        this.recordCheck('Notification:RelatedEntityRefExists', exists, `Notification ${nId} references missing relatedEntity: ${reId} (${n.relatedEntityType})`);
      }

      // String lengths
      if (n.title) this.recordCheck('Notification:TitleLength', n.title.length <= 255, `Notification title > 255 on notif ${nId}`);
      if (n.link) this.recordCheck('Notification:LinkLength', n.link.length <= 500, `Notification link > 500 on notif ${nId}`);
    }
  }
}

module.exports = PreflightValidator;
