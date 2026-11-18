/**
 * config.js
 * Central configuration loader for the MongoDB-to-MySQL migration runner.
 * Reads environment variables and CLI arguments with secure defaults.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root or server folder if available
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: true, // Safe default
    execute: false,
    confirmWrite: false,
    verifyOnly: false,
    targetDb: null,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      flags.dryRun = true;
      flags.execute = false;
    } else if (arg === '--execute') {
      flags.execute = true;
      flags.dryRun = false;
    } else if (arg === '--confirm-write') {
      flags.confirmWrite = true;
    } else if (arg === '--verify-only') {
      flags.verifyOnly = true;
      flags.dryRun = false;
      flags.execute = false;
    } else if (arg.startsWith('--target-db=')) {
      flags.targetDb = arg.split('=')[1].trim();
    }
  }

  return flags;
}

const flags = parseArgs();

// MongoDB Configuration
const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_portal',
  options: {
    serverSelectionTimeoutMS: 5000,
  },
};

// Target MySQL Database Safety Rule:
// Default safely to test database `placement_portal_java_test`.
// To target development `placement_portal_java`, it must be explicitly configured.
const targetDbName =
  flags.targetDb ||
  process.env.MYSQL_DATABASE ||
  'placement_portal_java_test';

const allowedDatabases = ['placement_portal_java_test', 'placement_portal_java'];
if (!allowedDatabases.includes(targetDbName)) {
  throw new Error(
    `[SECURITY CHECK FAILED] Target database "${targetDbName}" is not permitted. Only "placement_portal_java_test" or "placement_portal_java" are allowed.`
  );
}

// MySQL Configuration
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'placement_app',
  password: process.env.PLACEMENT_APP_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: targetDbName,
  charset: 'utf8mb4',
  dateStrings: true, // Preserves DATETIME string precision
  multipleStatements: false,
};

// Execution write permission check:
// Explicit opt-in setting required before ANY write-capable execution can be attempted.
const optInEnv = process.env.CONFIRM_MIGRATION_WRITE === 'true';
const isWriteCapable = flags.execute && (flags.confirmWrite || optInEnv);

// If user requested --execute but did not provide explicit opt-in confirmation:
if (flags.execute && !isWriteCapable) {
  throw new Error(
    `[SAFETY INTERLOCK ACTIVE] Write execution requested (--execute), but explicit opt-in confirmation is missing.\n` +
    `To execute writes, you must provide BOTH --execute and --confirm-write, OR set environment variable CONFIRM_MIGRATION_WRITE=true.\n` +
    `Aborting execution safely.`
  );
}

module.exports = {
  flags: {
    isDryRun: !flags.execute && !flags.verifyOnly,
    isExecute: isWriteCapable,
    isVerifyOnly: flags.verifyOnly,
    targetDb: targetDbName,
  },
  mongo: mongoConfig,
  mysql: mysqlConfig,
  getSanitizedConfig() {
    return {
      mode: flags.verifyOnly ? 'VERIFY_ONLY' : isWriteCapable ? 'LIVE_EXECUTION' : 'DRY_RUN (SIMULATION)',
      sourceMongoDatabase: 'placement_portal (host: 127.0.0.1:27017)',
      targetMySQLDatabase: `${mysqlConfig.database} (host: ${mysqlConfig.host}:${mysqlConfig.port}, user: ${mysqlConfig.user})`,
      writeSafetyInterlock: isWriteCapable ? 'DISENGAGED (WRITES ENABLED)' : 'ENGAGED (WRITES BLOCKED)',
    };
  },
};
