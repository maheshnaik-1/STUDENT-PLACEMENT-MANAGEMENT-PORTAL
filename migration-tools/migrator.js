/**
 * migrator.js
 * Core migration engine for Student Placement Management Portal.
 * Handles extraction, deterministic ID mapping, row transformation,
 * dry-run simulation, and transactional execution.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (_) {
  mongoose = require('../server/node_modules/mongoose');
}
const mysql = require('mysql2/promise');
const Logger = require('./logger');
const PreflightValidator = require('./validator');
const Reconciler = require('./reconciler');
const {
  SCHEMA_DEFINITIONS,
  Transformers,
  POPULATED_TARGET_TABLES,
  EXCLUDED_ARCHITECTURAL_TABLES,
} = require('./mappings');

class Migrator {
  constructor(config) {
    this.config = config;
    this.rawSourceData = null;
    this.idMaps = {
      users: new Map(),
      companies: new Map(),
      projects: new Map(),
      drives: new Map(),
      applications: new Map(),
      notifications: new Map(),
    };
    this.transformedRows = {
      users: [],
      student_skills: [],
      student_projects: [],
      student_project_tech_stacks: [],
      student_certifications: [],
      companies: [],
      placement_drives: [],
      drive_allowed_branches: [],
      drive_rounds: [],
      drive_required_skills: [],
      applications: [],
      application_status_history: [],
      application_withdrawals: [],
      notifications: [],
      notification_outbox: [],
      audit_logs: [],
      idempotency_keys: [],
      system_settings: [],
    };
  }

  async extractSourceData() {
    Logger.section('Step 1: Extracting Live Documents from MongoDB');
    Logger.info(`Connecting to MongoDB at: ${this.config.mongo.uri}...`);

    await mongoose.connect(this.config.mongo.uri, this.config.mongo.options);
    Logger.success('Connected to MongoDB successfully.');

    // Load Mongoose models
    const User = require('../server/models/User');
    const Company = require('../server/models/Company');
    const PlacementDrive = require('../server/models/PlacementDrive');
    const Application = require('../server/models/Application');
    const Notification = require('../server/models/Notification');

    // Extract all documents with hidden fields (+password, +resumeFile.path)
    Logger.info('Retrieving root collections with all fields...');
    const users = await User.find({}).select('+password +resumeFile.path').lean();
    const companies = await Company.find({}).lean();
    const drives = await PlacementDrive.find({}).lean();
    const applications = await Application.find({}).lean();
    const notifications = await Notification.find({}).lean();

    this.rawSourceData = {
      users,
      companies,
      drives,
      applications,
      notifications,
    };

    Logger.success(
      `Extracted: ${users.length} users, ${companies.length} companies, ${drives.length} drives, ${applications.length} applications, ${notifications.length} notifications.`
    );

    // Run in-memory preflight validation
    Logger.section('Step 2: Preflight Data Integrity Validation');
    const validator = new PreflightValidator(this.rawSourceData);
    const validationResult = validator.validateAll();

    if (!validationResult.isHealthy) {
      Logger.error(`Validation failed with ${validationResult.errors.length} errors:`);
      validationResult.errors.forEach(err => Logger.error(`  - ${err}`));
      throw new Error('[VALIDATION FAILED] Source data contains constraint violations. Aborting migration.');
    }

    Logger.success(
      `Preflight validation passed: ${validationResult.stats.checksPassed} checks passed across ${validationResult.stats.totalRecordsAudited} records with 0 errors.`
    );
    if (validationResult.warnings.length > 0) {
      Logger.warn(`${validationResult.warnings.length} warnings reported:`);
      validationResult.warnings.forEach(w => Logger.warn(`  - ${w}`));
    }
  }

  buildDeterministicIdMappings() {
    Logger.section('Step 3: Calculating Deterministic ObjectId -> BIGINT ID Mappings');

    // Deterministic ordering: sort lexicographically by hex ObjectId string
    const sortById = (a, b) => a._id.toString().localeCompare(b._id.toString());

    // 1. Users
    const sortedUsers = [...this.rawSourceData.users].sort(sortById);
    sortedUsers.forEach((u, index) => {
      this.idMaps.users.set(u._id.toString(), index + 1);
    });
    Logger.info(`Mapped ${this.idMaps.users.size} users to IDs 1 .. ${this.idMaps.users.size}`);

    // 2. Companies
    const sortedCompanies = [...this.rawSourceData.companies].sort(sortById);
    sortedCompanies.forEach((c, index) => {
      this.idMaps.companies.set(c._id.toString(), index + 1);
    });
    Logger.info(`Mapped ${this.idMaps.companies.size} companies to IDs 1 .. ${this.idMaps.companies.size}`);

    // 3. Placement Drives
    const sortedDrives = [...this.rawSourceData.drives].sort(sortById);
    sortedDrives.forEach((d, index) => {
      this.idMaps.drives.set(d._id.toString(), index + 1);
    });
    Logger.info(`Mapped ${this.idMaps.drives.size} placement drives to IDs 1 .. ${this.idMaps.drives.size}`);

    // 4. Applications
    const sortedApps = [...this.rawSourceData.applications].sort(sortById);
    sortedApps.forEach((a, index) => {
      this.idMaps.applications.set(a._id.toString(), index + 1);
    });
    Logger.info(`Mapped ${this.idMaps.applications.size} applications to IDs 1 .. ${this.idMaps.applications.size}`);

    // 5. Notifications
    const sortedNotifs = [...this.rawSourceData.notifications].sort(sortById);
    sortedNotifs.forEach((n, index) => {
      this.idMaps.notifications.set(n._id.toString(), index + 1);
    });
    Logger.info(`Mapped ${this.idMaps.notifications.size} notifications to IDs 1 .. ${this.idMaps.notifications.size}`);
  }

  transformData() {
    Logger.section('Step 4: Transforming Documents & Normalizing Child Tables');

    // 1. Users & User Child Tables
    let projectSeq = 1;
    let skillSeq = 1;
    let certSeq = 1;
    let techStackSeq = 1;

    for (const [mongoId, newUserId] of this.idMaps.users.entries()) {
      const u = this.rawSourceData.users.find(x => x._id.toString() === mongoId);
      const rf = u.resumeFile || {};
      const ad = u.academicDetails || {};
      const links = u.links || {};

      this.transformedRows.users.push({
        id: newUserId,
        name: Transformers.cleanString(u.name, 255),
        email: Transformers.cleanString(u.email, 255).toLowerCase(),
        password: u.password, // Preserved exact hash; not logged
        role: u.role || 'student',
        roll_no: Transformers.cleanRollNo(u.rollNo),
        branch: u.branch || 'CSE',
        cgpa: Transformers.cleanNumber(u.cgpa, 0.0),
        active_backlogs: Transformers.cleanNumber(u.activeBacklogs, 0),
        passing_year: Transformers.cleanNumber(u.passingYear, 2026),
        phone: Transformers.cleanString(u.phone, 25) || '',
        resume_url: Transformers.cleanString(u.resumeUrl, 1024) || '',
        resume_file_name: Transformers.cleanString(rf.filename, 255),
        resume_original_name: Transformers.cleanString(rf.originalName, 255),
        resume_mime_type: Transformers.cleanString(rf.mimeType, 100),
        resume_size: Transformers.cleanNumber(rf.size, null),
        resume_path: Transformers.cleanString(rf.path, 1024),
        resume_uploaded_at: Transformers.formatDate(rf.uploadedAt),
        tenth_percentage: Transformers.cleanNumber(ad.tenthPercentage, null),
        twelfth_percentage: Transformers.cleanNumber(ad.twelfthPercentage, null),
        diploma_percentage: Transformers.cleanNumber(ad.diplomaPercentage, null),
        current_semester: Transformers.cleanNumber(ad.currentSemester, null),
        gap_years: Transformers.cleanNumber(ad.gapYears, 0),
        github_link: Transformers.cleanString(links.github, 500) || '',
        linkedin_link: Transformers.cleanString(links.linkedin, 500) || '',
        portfolio_link: Transformers.cleanString(links.portfolio, 500) || '',
        created_at: Transformers.formatDate(u.createdAt) || Transformers.formatDate(new Date()),
        updated_at: Transformers.formatDate(u.updatedAt) || Transformers.formatDate(new Date()),
      });

      // Child Table: student_skills
      if (Array.isArray(u.skills)) {
        const seenSkills = new Set();
        for (const skill of u.skills) {
          const cleanSkill = (skill || '').trim();
          if (cleanSkill && !seenSkills.has(cleanSkill.toLowerCase())) {
            seenSkills.add(cleanSkill.toLowerCase());
            this.transformedRows.student_skills.push({
              id: skillSeq++,
              student_id: newUserId,
              skill: Transformers.cleanString(cleanSkill, 100),
              created_at: Transformers.formatDate(u.createdAt) || Transformers.formatDate(new Date()),
            });
          }
        }
      }

      // Child Table: student_projects & student_project_tech_stacks
      if (Array.isArray(u.projects)) {
        for (const p of u.projects) {
          const newProjectId = projectSeq++;
          if (p._id) {
            this.idMaps.projects.set(p._id.toString(), newProjectId);
          }
          this.transformedRows.student_projects.push({
            id: newProjectId,
            student_id: newUserId,
            title: Transformers.cleanString(p.title, 255) || '',
            description: p.description ? String(p.description).trim() : null,
            link: Transformers.cleanString(p.link, 500) || '',
            created_at: Transformers.formatDate(u.createdAt) || Transformers.formatDate(new Date()),
          });

          // Grandchild: student_project_tech_stacks
          if (Array.isArray(p.techStack)) {
            for (const tech of p.techStack) {
              const cleanTech = (tech || '').trim();
              if (cleanTech) {
                this.transformedRows.student_project_tech_stacks.push({
                  id: techStackSeq++,
                  project_id: newProjectId,
                  tech: Transformers.cleanString(cleanTech, 100),
                });
              }
            }
          }
        }
      }

      // Child Table: student_certifications
      if (Array.isArray(u.certifications)) {
        for (const cert of u.certifications) {
          this.transformedRows.student_certifications.push({
            id: certSeq++,
            student_id: newUserId,
            name: Transformers.cleanString(cert.name, 255) || '',
            issuer: Transformers.cleanString(cert.issuer, 255) || '',
            issue_date: Transformers.cleanString(cert.issueDate, 100) || '',
            certificate_url: Transformers.cleanString(cert.certificateUrl, 1024) || '',
            created_at: Transformers.formatDate(u.createdAt) || Transformers.formatDate(new Date()),
          });
        }
      }
    }

    // 2. Companies
    for (const [mongoId, newCompanyId] of this.idMaps.companies.entries()) {
      const c = this.rawSourceData.companies.find(x => x._id.toString() === mongoId);
      this.transformedRows.companies.push({
        id: newCompanyId,
        name: Transformers.cleanString(c.name, 255),
        industry: Transformers.cleanString(c.industry, 100),
        website: Transformers.cleanString(c.website, 500) || '',
        location: Transformers.cleanString(c.location, 255),
        description: String(c.description || '').trim(),
        contact_email: Transformers.cleanString(c.contactEmail, 255) || '',
        contact_person: Transformers.cleanString(c.contactPerson, 255) || '',
        logo_url: Transformers.cleanString(c.logoUrl, 1024) || '',
        created_at: Transformers.formatDate(c.createdAt) || Transformers.formatDate(new Date()),
        updated_at: Transformers.formatDate(c.updatedAt) || Transformers.formatDate(new Date()),
      });
    }

    // 3. Placement Drives & Drive Child Tables
    let branchSeq = 1;
    let roundSeq = 1;
    let reqSkillSeq = 1;

    for (const [mongoId, newDriveId] of this.idMaps.drives.entries()) {
      const d = this.rawSourceData.drives.find(x => x._id.toString() === mongoId);
      const companyId = this.idMaps.companies.get(d.company.toString());
      const createdBy = d.createdBy ? this.idMaps.users.get(d.createdBy.toString()) || null : null;
      const elig = d.eligibility || {};

      this.transformedRows.placement_drives.push({
        id: newDriveId,
        company_id: companyId,
        title: Transformers.cleanString(d.title, 255),
        job_role: Transformers.cleanString(d.jobRole, 255),
        job_description: String(d.jobDescription || '').trim(),
        package_ctc: Transformers.cleanString(d.packageCTC, 100), // Preserved exact String
        location: Transformers.cleanString(d.location, 255),
        min_cgpa: Transformers.cleanNumber(elig.minCGPA, 6.0),
        max_backlogs: Transformers.cleanNumber(elig.maxBacklogs, 0),
        passing_year: Transformers.cleanNumber(elig.passingYear, 2026),
        drive_date: Transformers.formatDate(d.driveDate),
        deadline: Transformers.formatDate(d.deadline),
        status: d.status || 'Upcoming',
        created_by: createdBy,
        created_at: Transformers.formatDate(d.createdAt) || Transformers.formatDate(new Date()),
        updated_at: Transformers.formatDate(d.updatedAt) || Transformers.formatDate(new Date()),
      });

      // Child Table: drive_allowed_branches
      if (Array.isArray(elig.allowedBranches)) {
        const seenBranches = new Set();
        for (const branch of elig.allowedBranches) {
          const cleanBranch = (branch || '').trim();
          if (cleanBranch && !seenBranches.has(cleanBranch)) {
            seenBranches.add(cleanBranch);
            this.transformedRows.drive_allowed_branches.push({
              id: branchSeq++,
              drive_id: newDriveId,
              branch: Transformers.cleanString(cleanBranch, 50),
            });
          }
        }
      }

      // Child Table: drive_rounds
      if (Array.isArray(d.rounds)) {
        d.rounds.forEach((round, rIndex) => {
          const cleanRound = (round || '').trim();
          if (cleanRound) {
            this.transformedRows.drive_rounds.push({
              id: roundSeq++,
              drive_id: newDriveId,
              round_order: rIndex,
              round_name: Transformers.cleanString(cleanRound, 100),
            });
          }
        });
      }

      // Child Table: drive_required_skills
      if (Array.isArray(d.requiredSkills)) {
        const seenSkills = new Set();
        for (const skill of d.requiredSkills) {
          const cleanSkill = (skill || '').trim();
          if (cleanSkill && !seenSkills.has(cleanSkill.toLowerCase())) {
            seenSkills.add(cleanSkill.toLowerCase());
            this.transformedRows.drive_required_skills.push({
              id: reqSkillSeq++,
              drive_id: newDriveId,
              skill: Transformers.cleanString(cleanSkill, 100),
            });
          }
        }
      }
    }

    // 4. Applications & Status History
    let historySeq = 1;

    for (const [mongoId, newAppId] of this.idMaps.applications.entries()) {
      const a = this.rawSourceData.applications.find(x => x._id.toString() === mongoId);
      const driveId = this.idMaps.drives.get(a.drive.toString());
      const studentId = this.idMaps.users.get(a.student.toString());

      this.transformedRows.applications.push({
        id: newAppId,
        drive_id: driveId,
        student_id: studentId,
        applied_at: Transformers.formatDate(a.appliedAt) || Transformers.formatDate(a.createdAt),
        status: a.status || 'Applied',
        remarks: Transformers.cleanString(a.remarks, 1000) || 'Application submitted successfully.',
        created_at: Transformers.formatDate(a.createdAt) || Transformers.formatDate(new Date()),
        updated_at: Transformers.formatDate(a.updatedAt) || Transformers.formatDate(new Date()),
      });

      // Child Table: application_status_history
      if (Array.isArray(a.statusHistory)) {
        for (const sh of a.statusHistory) {
          const changedBy = sh.changedBy ? this.idMaps.users.get(sh.changedBy.toString()) || null : null;
          this.transformedRows.application_status_history.push({
            id: historySeq++,
            application_id: newAppId,
            status: Transformers.cleanString(sh.status, 50),
            remarks: Transformers.cleanString(sh.remarks, 1000) || '',
            changed_by: changedBy,
            changed_at: Transformers.formatDate(sh.changedAt) || Transformers.formatDate(new Date()),
          });
        }
      }
    }

    // 5. Notifications
    for (const [mongoId, newNotifId] of this.idMaps.notifications.entries()) {
      const n = this.rawSourceData.notifications.find(x => x._id.toString() === mongoId);
      const recipientId = this.idMaps.users.get(n.recipient.toString());

      // Resolve polymorphic related_entity_id to MySQL BIGINT
      let relatedEntityId = null;
      if (n.relatedEntity) {
        const reHex = n.relatedEntity.toString();
        if (n.relatedEntityType === 'Application') {
          relatedEntityId = this.idMaps.applications.get(reHex) || null;
        } else if (n.relatedEntityType === 'PlacementDrive') {
          relatedEntityId = this.idMaps.drives.get(reHex) || null;
        } else if (n.relatedEntityType === 'User') {
          relatedEntityId = this.idMaps.users.get(reHex) || null;
        } else {
          // Fallback resolution
          relatedEntityId =
            this.idMaps.applications.get(reHex) ||
            this.idMaps.drives.get(reHex) ||
            this.idMaps.users.get(reHex) ||
            null;
        }
      }

      this.transformedRows.notifications.push({
        id: newNotifId,
        recipient_id: recipientId,
        role: Transformers.cleanString(n.role, 20) || 'student',
        title: Transformers.cleanString(n.title, 255),
        message: String(n.message || '').trim(),
        type: Transformers.cleanString(n.type, 50) || 'SYSTEM',
        related_entity_id: relatedEntityId,
        related_entity_type: Transformers.cleanString(n.relatedEntityType, 50),
        link: Transformers.cleanString(n.link, 500),
        is_read: Transformers.cleanBoolean(n.isRead),
        read_at: Transformers.formatDate(n.readAt),
        metadata_json: Transformers.cleanJson(n.metadata),
        created_at: Transformers.formatDate(n.createdAt) || Transformers.formatDate(new Date()),
        updated_at: Transformers.formatDate(n.updatedAt) || Transformers.formatDate(new Date()),
      });
    }

    Logger.success('Data transformation and relationship mapping completed successfully.');
  }

  getExpectedCounts() {
    const counts = {};
    for (const [table, rows] of Object.entries(this.transformedRows)) {
      counts[table] = rows.length;
    }
    return counts;
  }

  generateDryRunReport() {
    Logger.section('DRY-RUN SIMULATION REPORT (NO DATABASE WRITES PERFORMED)');

    const expectedCounts = this.getExpectedCounts();
    let totalTargetRows = 0;

    console.log('\n  Target MySQL Table Breakdown:');
    console.log('  ' + '-'.repeat(68));
    console.log('  ' + 'Table Name'.padEnd(32) + 'Source Origin'.padEnd(24) + 'Rows');
    console.log('  ' + '-'.repeat(68));

    for (const [table, count] of Object.entries(expectedCounts)) {
      totalTargetRows += count;
      const origin =
        table === 'users' ? 'users' :
        table === 'companies' ? 'companies' :
        table === 'placement_drives' ? 'placementdrives' :
        table === 'applications' ? 'applications' :
        table === 'notifications' ? 'notifications' :
        table.startsWith('student_') ? 'users (child)' :
        table.startsWith('drive_') ? 'placementdrives (child)' :
        table.startsWith('application_status') ? 'applications (child)' : '(arch table)';

      console.log(`  ${table.padEnd(32)}${origin.padEnd(24)}${String(count).padStart(5)}`);
    }

    console.log('  ' + '-'.repeat(68));
    console.log(`  ${'TOTAL INTENDED MYSQL ROWS'.padEnd(56)}${String(totalTargetRows).padStart(5)}`);
    console.log('  ' + '-'.repeat(68));

    Logger.section('Unmapped Fields Audit (Documented & Preserved)');
    console.log('  - users: [__v] (Mongoose version key, omitted)');
    console.log('  - users.projects[]._id: [ObjectId] (replaced by student_projects.id BIGINT)');
    console.log('  - users.certifications[]._id: [ObjectId] (replaced by student_certifications.id BIGINT)');
    console.log('  - companies: [__v] (Mongoose version key, omitted)');
    console.log('  - placementdrives: [__v] (Mongoose version key, omitted)');
    console.log('  - applications: [__v] (Mongoose version key, omitted)');
    console.log('  - applications.statusHistory[]._id: [ObjectId] (replaced by application_status_history.id BIGINT)');
    console.log('  - notifications: [__v] (Mongoose version key, omitted)');

    Logger.section('Resume File On-Disk Verification');
    const userWithResume = this.transformedRows.users.find(u => u.resume_path);
    if (userWithResume) {
      Logger.info(`Found uploaded resume file reference for user: ${userWithResume.email}`);
      Logger.info(`  Original Name: ${userWithResume.resume_original_name}`);
      Logger.info(`  Stored Name  : ${userWithResume.resume_file_name}`);
      Logger.info(`  Stored Path  : ${userWithResume.resume_path}`);
      Logger.info(`  Size (bytes) : ${userWithResume.resume_size}`);
      Logger.info(`  Uploaded At  : ${userWithResume.resume_uploaded_at}`);
      Logger.info('  Status: Metadata will be preserved in MySQL. Binary file remains untouched on disk.');
    }

    Logger.success(`Dry-run simulation completed. All ${totalTargetRows} records validated and ready for transfer.`);
  }

  /**
   * Pre-write emptiness check:
   * Verifies that every single target table that the migration runner may populate (all 13 tables)
   * is completely empty (0 rows). If ANY table contains > 0 rows, execution aborts immediately
   * BEFORE any transaction or write statement is initiated.
   *
   * The 5 remaining Flyway V1 tables are intentionally excluded from migration population:
   * - application_withdrawals: Architectural table for withdrawal audit history.
   * - notification_outbox: Transactional outbox for runtime messaging events.
   * - audit_logs: Runtime administrative and security event logs.
   * - idempotency_keys: Runtime mutation deduplication cache.
   * - system_settings: Runtime global system configuration.
   */
  async checkTargetTablesEmpty(connection) {
    Logger.info(`Checking all ${POPULATED_TARGET_TABLES.length} populated target tables for emptiness before writing...`);

    for (const table of POPULATED_TARGET_TABLES) {
      const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      const rowCount = Number(rows[0].count);
      if (rowCount > 0) {
        throw new Error(
          `[SAFETY CHECK FAILED] Target table "${table}" already contains ${rowCount} rows. Aborting before write transaction to avoid duplicate or mixed data.`
        );
      }
    }

    Logger.success(`All ${POPULATED_TARGET_TABLES.length} target tables are clean (0 rows) and ready for initial import.`);
  }

  async executeLiveMigration(injectedConnection = null) {
    Logger.section('STEP 5: LIVE TRANSACTIONAL MYSQL MIGRATION EXECUTION');

    if (!this.config.flags.isExecute) {
      throw new Error('[SECURITY INTERLOCK] Write execution is blocked. Provide --execute AND --confirm-write.');
    }

    Logger.warn(`TARGET DATABASE: ${this.config.mysql.database} on ${this.config.mysql.host}:${this.config.mysql.port}`);
    Logger.warn('Connecting to MySQL with transactional write privileges...');

    const connection = injectedConnection || (await mysql.createConnection(this.config.mysql));
    Logger.success('Connected to MySQL successfully.');

    let transactionStarted = false;
    let commitAttempted = false;
    let commitConfirmed = false;

    try {
      // Pre-check: verify all 13 populated target tables are clean before starting transaction
      await this.checkTargetTablesEmpty(connection);

      // Begin transaction
      Logger.info('Starting MySQL transaction (START TRANSACTION)...');
      await connection.beginTransaction();
      transactionStarted = true;

      // Ordered 9-batch insert
      const insertOrder = [
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

      for (const table of insertOrder) {
        const rows = this.transformedRows[table];
        if (!rows || rows.length === 0) continue;

        Logger.info(`Inserting ${rows.length} rows into \`${table}\`...`);
        const sampleRow = rows[0];
        const columns = Object.keys(sampleRow);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;

        for (const row of rows) {
          const values = columns.map(c => row[c]);
          await connection.execute(sql, values);
        }
        Logger.success(`  Successfully inserted ${rows.length} rows into \`${table}\`.`);
      }

      // In-transaction reconciliation (BEFORE COMMIT)
      // Validates all row counts and referential integrity (0 orphans) on uncommitted data.
      // If any discrepancy is detected, an error is thrown triggering automatic rollback.
      Logger.section('IN-TRANSACTION RECONCILIATION AUDIT (BEFORE COMMIT)');
      Logger.info('Validating all row counts and foreign-key references within active transaction...');
      const reconciler = new Reconciler(connection, this.getExpectedCounts());
      const reconResults = await reconciler.runReconciliation();

      if (!reconResults.countsMatched || reconResults.orphansFound > 0) {
        const errorDetails = [];
        if (!reconResults.countsMatched) {
          const mismatches = Object.entries(reconResults.tableCounts)
            .filter(([, v]) => !v.matched)
            .map(([t, v]) => `${t}: actual ${v.actual} != expected ${v.expected}`);
          errorDetails.push(`Count mismatches: [${mismatches.join(', ')}]`);
        }
        if (reconResults.orphansFound > 0) {
          errorDetails.push(`Referential integrity: ${reconResults.orphansFound} orphan foreign-key references found`);
        }
        throw new Error(
          `[PRE-COMMIT RECONCILIATION FAILED] Discrepancies detected before commit: ${errorDetails.join('; ')}. Triggering rollback.`
        );
      }

      Logger.success('In-transaction reconciliation passed: 100% count match and 0 orphaned references.');

      // Commit transaction
      Logger.info('All pre-commit verification checks passed. Committing transaction (COMMIT)...');
      commitAttempted = true;
      await connection.commit();
      commitConfirmed = true;
      Logger.success('Migration transaction committed successfully! Target database is updated and verified.');

      return reconResults;
    } catch (err) {
      if (commitConfirmed) {
        // Error occurred after commit succeeded
        Logger.error(`[POST-COMMIT FAILURE] Data was committed successfully to MySQL, but a subsequent operation failed: ${err.message}`);
      } else if (commitAttempted) {
        // Error occurred during connection.commit()
        Logger.error(`[UNCERTAIN COMMIT OUTCOME] Failure occurred during transaction commit: ${err.message}`);
        Logger.warn('The commit was sent to MySQL, but confirmation was not received.');
        Logger.warn('Do NOT re-run migration without verifying target table counts first.');
        try {
          await connection.rollback();
        } catch (_) {
          // Rollback on uncertain commit / broken connection is expected to fail or be no-op
        }
      } else if (transactionStarted) {
        // Error occurred before commit was attempted (during insert or in-transaction reconciliation)
        Logger.error(`Migration transaction failed prior to commit: ${err.message}`);
        Logger.warn('Executing transaction rollback (ROLLBACK)...');
        try {
          await connection.rollback();
          Logger.success('Rollback confirmed. MySQL target database remains completely unmodified (0 writes committed).');
        } catch (rollbackErr) {
          Logger.error(`[CRITICAL] Rollback attempt failed: ${rollbackErr.message}`);
          Logger.error('Connection may have dropped. Note: MySQL InnoDB will automatically rollback uncommitted transactions when the connection closes.');
        }
      } else {
        // Error occurred before beginTransaction (e.g. target emptiness check or connection failure)
        Logger.error(`Pre-transaction check failed: ${err.message}`);
        Logger.info('No transaction was started. Target database remains unmodified.');
      }
      throw err;
    } finally {
      if (connection && typeof connection.end === 'function') {
        try {
          await connection.end();
        } catch (_) {}
      }
    }
  }

  async executeVerificationOnly() {
    Logger.section('STEP 5: POST-MIGRATION RECONCILIATION VERIFICATION');
    Logger.info(`Connecting to MySQL database: ${this.config.mysql.database}...`);

    const connection = await mysql.createConnection(this.config.mysql);
    Logger.success('Connected to MySQL successfully.');

    try {
      const reconciler = new Reconciler(connection, this.getExpectedCounts());
      const reconResults = await reconciler.runReconciliation();

      if (!reconResults.countsMatched || reconResults.orphansFound > 0) {
        Logger.error('Post-migration reconciliation identified discrepancies!');
      } else {
        Logger.success('Post-migration reconciliation passed: 100% count match and 0 orphaned references.');
      }
      return reconResults;
    } finally {
      await connection.end();
      Logger.info('Disconnected from MySQL.');
    }
  }

  async run() {
    try {
      await this.extractSourceData();
      this.buildDeterministicIdMappings();
      this.transformData();

      if (this.config.flags.isDryRun) {
        this.generateDryRunReport();
      } else if (this.config.flags.isExecute) {
        await this.executeLiveMigration();
      } else if (this.config.flags.isVerifyOnly) {
        await this.executeVerificationOnly();
      }
    } finally {
      await mongoose.disconnect();
      Logger.info('Disconnected from MongoDB.');
    }
  }
}

module.exports = Migrator;
