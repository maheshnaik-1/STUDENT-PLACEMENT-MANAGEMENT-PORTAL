/**
 * reconciler.js
 * Post-migration reconciliation and relationship verification queries.
 * Compares source vs target counts and verifies 0 orphan rows across foreign keys.
 */

const Logger = require('./logger');

class Reconciler {
  constructor(mysqlConnection, expectedCounts) {
    this.connection = mysqlConnection;
    this.expectedCounts = expectedCounts || {};
    this.results = {
      countsMatched: true,
      orphansFound: 0,
      tableCounts: {},
      referentialIntegrityChecks: [],
    };
  }

  async runReconciliation() {
    Logger.section('Running Post-Migration MySQL Reconciliation');

    await this.verifyTableCounts();
    await this.verifyReferentialIntegrity();

    return this.results;
  }

  async verifyTableCounts() {
    Logger.info('Verifying row counts across all 18 MySQL tables...');

    const tables = [
      'users',
      'student_skills',
      'student_projects',
      'student_project_tech_stacks',
      'student_certifications',
      'companies',
      'placement_drives',
      'drive_allowed_branches',
      'drive_rounds',
      'drive_required_skills',
      'applications',
      'application_status_history',
      'application_withdrawals',
      'notifications',
      'notification_outbox',
      'audit_logs',
      'idempotency_keys',
      'system_settings',
    ];

    for (const table of tables) {
      try {
        const [rows] = await this.connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
        const actual = Number(rows[0].count);
        const expected = this.expectedCounts[table] != null ? this.expectedCounts[table] : 0;
        const matched = actual === expected;

        if (!matched) {
          this.results.countsMatched = false;
        }

        this.results.tableCounts[table] = {
          expected,
          actual,
          matched,
        };

        const statusTag = matched ? '[MATCH]' : '[MISMATCH]';
        Logger.info(`  ${statusTag} ${table.padEnd(28)} : Actual = ${String(actual).padStart(3)}, Expected = ${String(expected).padStart(3)}`);
      } catch (err) {
        Logger.error(`Failed to query count for table ${table}: ${err.message}`);
        this.results.countsMatched = false;
      }
    }
  }

  async verifyReferentialIntegrity() {
    Logger.info('Verifying foreign key referential integrity (checking for orphan records)...');

    const integrityChecks = [
      {
        name: 'placement_drives -> companies',
        query: `SELECT COUNT(*) AS orphans FROM placement_drives pd LEFT JOIN companies c ON pd.company_id = c.id WHERE c.id IS NULL`,
      },
      {
        name: 'drive_allowed_branches -> placement_drives',
        query: `SELECT COUNT(*) AS orphans FROM drive_allowed_branches dab LEFT JOIN placement_drives pd ON dab.drive_id = pd.id WHERE pd.id IS NULL`,
      },
      {
        name: 'drive_rounds -> placement_drives',
        query: `SELECT COUNT(*) AS orphans FROM drive_rounds dr LEFT JOIN placement_drives pd ON dr.drive_id = pd.id WHERE pd.id IS NULL`,
      },
      {
        name: 'drive_required_skills -> placement_drives',
        query: `SELECT COUNT(*) AS orphans FROM drive_required_skills drs LEFT JOIN placement_drives pd ON drs.drive_id = pd.id WHERE pd.id IS NULL`,
      },
      {
        name: 'applications -> placement_drives',
        query: `SELECT COUNT(*) AS orphans FROM applications a LEFT JOIN placement_drives pd ON a.drive_id = pd.id WHERE pd.id IS NULL`,
      },
      {
        name: 'applications -> users',
        query: `SELECT COUNT(*) AS orphans FROM applications a LEFT JOIN users u ON a.student_id = u.id WHERE u.id IS NULL`,
      },
      {
        name: 'application_status_history -> applications',
        query: `SELECT COUNT(*) AS orphans FROM application_status_history ash LEFT JOIN applications a ON ash.application_id = a.id WHERE a.id IS NULL`,
      },
      {
        name: 'student_skills -> users',
        query: `SELECT COUNT(*) AS orphans FROM student_skills ss LEFT JOIN users u ON ss.student_id = u.id WHERE u.id IS NULL`,
      },
      {
        name: 'student_projects -> users',
        query: `SELECT COUNT(*) AS orphans FROM student_projects sp LEFT JOIN users u ON sp.student_id = u.id WHERE u.id IS NULL`,
      },
      {
        name: 'student_project_tech_stacks -> student_projects',
        query: `SELECT COUNT(*) AS orphans FROM student_project_tech_stacks spts LEFT JOIN student_projects sp ON spts.project_id = sp.id WHERE sp.id IS NULL`,
      },
      {
        name: 'student_certifications -> users',
        query: `SELECT COUNT(*) AS orphans FROM student_certifications sc LEFT JOIN users u ON sc.student_id = u.id WHERE u.id IS NULL`,
      },
      {
        name: 'notifications -> users',
        query: `SELECT COUNT(*) AS orphans FROM notifications n LEFT JOIN users u ON n.recipient_id = u.id WHERE u.id IS NULL`,
      },
    ];

    for (const check of integrityChecks) {
      try {
        const [rows] = await this.connection.query(check.query);
        const orphanCount = Number(rows[0].orphans);
        const passed = orphanCount === 0;

        if (!passed) {
          this.results.orphansFound += orphanCount;
        }

        this.results.referentialIntegrityChecks.push({
          check: check.name,
          orphans: orphanCount,
          passed,
        });

        const statusTag = passed ? '[CLEAN]' : '[ORPHANS DETECTED]';
        Logger.info(`  ${statusTag} ${check.name.padEnd(45)} : ${orphanCount} orphans`);
      } catch (err) {
        Logger.error(`Integrity check "${check.name}" failed to execute: ${err.message}`);
      }
    }
  }
}

module.exports = Reconciler;
