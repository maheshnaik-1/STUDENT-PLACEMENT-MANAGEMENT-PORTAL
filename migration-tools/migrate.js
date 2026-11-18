#!/usr/bin/env node
/**
 * migrate.js
 * Main CLI entry point for Student Placement Management Portal
 * MongoDB-to-MySQL data migration runner.
 *
 * Usage:
 *   node migrate.js --dry-run                                  # In-memory extraction, validation, and simulation (Default)
 *   node migrate.js --verify-only                              # Run read-only reconciliation queries on MySQL
 *   node migrate.js --execute --confirm-write                 # Execute live transactional migration into target MySQL
 *   node migrate.js --execute --confirm-write --target-db=... # Target specific database (defaults to test)
 */

const Logger = require('./logger');
const config = require('./config');
const Migrator = require('./migrator');

async function main() {
  Logger.banner('Student Placement Management Portal - Data Migration Runner');
  Logger.info('Configuration Summary:');
  const safeConfig = config.getSanitizedConfig();
  console.log(`  Execution Mode      : ${safeConfig.mode}`);
  console.log(`  Source MongoDB      : ${safeConfig.sourceMongoDatabase}`);
  console.log(`  Target MySQL DB     : ${safeConfig.targetMySQLDatabase}`);
  console.log(`  Write Interlock     : ${safeConfig.writeSafetyInterlock}`);

  const migrator = new Migrator(config);
  await migrator.run();
}

main().catch(err => {
  Logger.error(`Migration process aborted: ${err.message}`);
  process.exit(1);
});
