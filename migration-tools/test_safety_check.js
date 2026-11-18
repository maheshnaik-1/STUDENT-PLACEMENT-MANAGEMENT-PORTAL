/**
 * test_safety_check.js
 * Offline automated unit tests for pre-write emptiness check and safety interlocks.
 * Executes purely in-memory using mock connections; performs zero database writes.
 */

const assert = require('assert');
const Migrator = require('./migrator');
const { POPULATED_TARGET_TABLES, EXCLUDED_ARCHITECTURAL_TABLES } = require('./mappings');

const FLYWAY_V1_ALL_18_TABLES = [
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

async function runTests() {
  console.log('\n======================================================');
  console.log('  RUNNING MIGRATION RUNNER PRE-WRITE SAFETY TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Full 18-Table Coverage & Documentation
  test('Test 1: All 18 Flyway V1 tables accounted for in populated + excluded sets', () => {
    const excludedNames = EXCLUDED_ARCHITECTURAL_TABLES.map(t => t.table);
    const combined = [...POPULATED_TARGET_TABLES, ...excludedNames];

    assert.strictEqual(POPULATED_TARGET_TABLES.length, 13, 'Expected exactly 13 populated tables');
    assert.strictEqual(EXCLUDED_ARCHITECTURAL_TABLES.length, 5, 'Expected exactly 5 excluded architectural tables');
    assert.strictEqual(combined.length, 18, 'Expected 18 total Flyway V1 tables');

    // Verify all 18 tables match Flyway V1 schema exactly
    for (const table of FLYWAY_V1_ALL_18_TABLES) {
      assert(combined.includes(table), `Table ${table} from Flyway V1 is missing from mappings`);
    }

    // Verify all 5 excluded tables have documented reasons
    for (const item of EXCLUDED_ARCHITECTURAL_TABLES) {
      assert(item.table, 'Excluded table missing table name');
      assert(item.reason && item.reason.length > 10, `Excluded table ${item.table} missing clear reason`);
    }
  });

  // Helper to create a mock MySQL connection
  function createMockConnection(tableRowCounts = {}) {
    const queriedTables = [];
    return {
      queriedTables,
      async query(sql) {
        // Match: SELECT COUNT(*) AS count FROM `table_name`
        const match = sql.match(/FROM\s+`([^`]+)`/i);
        if (match) {
          const table = match[1];
          queriedTables.push(table);
          const count = tableRowCounts[table] != null ? tableRowCounts[table] : 0;
          return [[{ count }]];
        }
        return [[{ count: 0 }]];
      },
      async beginTransaction() {
        throw new Error('beginTransaction should not be called when pre-check fails!');
      },
    };
  }

  const dummyConfig = {
    flags: { isDryRun: false, isExecute: true },
    mysql: { database: 'placement_portal_java_test', host: 'localhost', port: 3306 },
    mongo: { uri: 'mongodb://127.0.0.1:27017/placement_portal' },
  };

  // Test 2: Clean target tables (all count = 0) succeeds
  await asyncTest('Test 2: All 13 populated tables empty (0 rows) passes pre-check', async () => {
    const migrator = new Migrator(dummyConfig);
    const mockConn = createMockConnection({}); // all return 0

    await migrator.checkTargetTablesEmpty(mockConn);

    assert.strictEqual(mockConn.queriedTables.length, 13, 'Expected all 13 tables to be queried');
    for (const table of POPULATED_TARGET_TABLES) {
      assert(mockConn.queriedTables.includes(table), `Table ${table} was not queried`);
    }
  });

  // Test 3: Populated child tables each cause an immediate abort
  const childTablesToTest = [
    { table: 'student_skills', count: 5 },
    { table: 'student_projects', count: 1 },
    { table: 'student_project_tech_stacks', count: 4 },
    { table: 'student_certifications', count: 1 },
    { table: 'drive_allowed_branches', count: 27 },
    { table: 'drive_rounds', count: 24 },
    { table: 'drive_required_skills', count: 18 },
    { table: 'application_status_history', count: 2 },
  ];

  for (const { table, count } of childTablesToTest) {
    await asyncTest(`Test 3: Populated child table "${table}" (${count} rows) causes abort before transaction`, async () => {
      const migrator = new Migrator(dummyConfig);
      const mockConn = createMockConnection({ [table]: count });

      let errorThrown = null;
      try {
        await migrator.checkTargetTablesEmpty(mockConn);
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown != null, `Expected abort error for populated table "${table}", but none was thrown!`);
      assert(
        errorThrown.message.includes(`Target table "${table}" already contains ${count} rows`),
        `Unexpected error message: ${errorThrown.message}`
      );
      assert(
        errorThrown.message.includes('Aborting before write transaction'),
        `Error message must indicate abort before write transaction: ${errorThrown.message}`
      );
    });
  }

  // Test 4: Root tables (users, companies, drives, applications, notifications) still cause abort
  const rootTablesToTest = [
    { table: 'users', count: 6 },
    { table: 'companies', count: 6 },
    { table: 'placement_drives', count: 7 },
    { table: 'applications', count: 12 },
    { table: 'notifications', count: 22 },
  ];

  for (const { table, count } of rootTablesToTest) {
    await asyncTest(`Test 4: Populated root table "${table}" (${count} rows) causes abort before transaction`, async () => {
      const migrator = new Migrator(dummyConfig);
      const mockConn = createMockConnection({ [table]: count });

      let errorThrown = null;
      try {
        await migrator.checkTargetTablesEmpty(mockConn);
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown != null, `Expected abort error for populated table "${table}", but none was thrown!`);
      assert(
        errorThrown.message.includes(`Target table "${table}" already contains ${count} rows`),
        `Unexpected error message: ${errorThrown.message}`
      );
    });
  }

  // Helper to create a stateful transactional mock connection
  function createTransactionalMockConnection(options = {}) {
    const {
      preCheckCounts = {},
      inTransactionCounts = null,
      orphanCounts = {},
      failOnExecute = null,
      failOnCommit = null,
      failOnRollback = null,
    } = options;

    let transactionStarted = false;
    let committed = false;
    let rolledBack = false;
    const executedStatements = [];
    const queriedTables = [];

    return {
      get transactionStarted() { return transactionStarted; },
      get committed() { return committed; },
      get rolledBack() { return rolledBack; },
      executedStatements,
      queriedTables,

      async query(sql) {
        // Table count query: SELECT COUNT(*) AS count FROM `table_name`
        const tableMatch = sql.match(/FROM\s+`([^`]+)`/i);
        if (tableMatch) {
          const table = tableMatch[1];
          queriedTables.push(table);
          if (transactionStarted && inTransactionCounts) {
            const count = inTransactionCounts[table] != null ? inTransactionCounts[table] : 0;
            return [[{ count }]];
          }
          const count = preCheckCounts[table] != null ? preCheckCounts[table] : 0;
          return [[{ count }]];
        }

        // Referential integrity query: SELECT COUNT(*) AS orphans FROM ...
        if (sql.includes('AS orphans')) {
          for (const [pattern, count] of Object.entries(orphanCounts)) {
            if (sql.includes(pattern)) {
              return [[{ orphans: count }]];
            }
          }
          return [[{ orphans: 0 }]];
        }

        return [[{ count: 0 }]];
      },

      async beginTransaction() {
        transactionStarted = true;
      },

      async execute(sql, values) {
        if (failOnExecute) {
          throw failOnExecute;
        }
        executedStatements.push({ sql, values });
      },

      async commit() {
        if (failOnCommit) {
          throw failOnCommit;
        }
        committed = true;
      },

      async rollback() {
        if (failOnRollback) {
          throw failOnRollback;
        }
        rolledBack = true;
      },

      async end() {
        // Connection closed cleanly
      },
    };
  }

  // Test 5: In-transaction reconciliation passes -> commit succeeds, rollback is not called
  await asyncTest('Test 5: In-transaction reconciliation passes -> commit succeeds and rollback is not called', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
    const expectedCounts = migrator.getExpectedCounts();

    const mockConn = createTransactionalMockConnection({
      inTransactionCounts: expectedCounts,
      orphanCounts: {},
    });

    const result = await migrator.executeLiveMigration(mockConn);

    assert(mockConn.transactionStarted, 'Transaction was not started');
    assert.strictEqual(mockConn.executedStatements.length, 1, 'Expected 1 insert execution');
    assert(mockConn.committed, 'Transaction was not committed');
    assert(!mockConn.rolledBack, 'Rollback should NOT have been called on clean pass');
    assert(result.countsMatched, 'Reconciliation countsMatched should be true');
    assert.strictEqual(result.orphansFound, 0, 'No orphans should be found');
  });

  // Test 6: In-transaction reconciliation fails on count mismatch -> triggers rollback, commit NEVER called
  await asyncTest('Test 6: In-transaction reconciliation count mismatch triggers rollback before commit', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];

    // Return actual = 0 for users (expected = 1) -> Mismatch!
    const mockConn = createTransactionalMockConnection({
      inTransactionCounts: { users: 0 },
    });

    let errorThrown = null;
    try {
      await migrator.executeLiveMigration(mockConn);
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown != null, 'Expected reconciliation failure error, but none was thrown');
    assert(errorThrown.message.includes('[PRE-COMMIT RECONCILIATION FAILED]'), `Unexpected error: ${errorThrown.message}`);
    assert(errorThrown.message.includes('Count mismatches'), 'Error should specify count mismatch');
    assert(mockConn.transactionStarted, 'Transaction should have started');
    assert(!mockConn.committed, 'CRITICAL: commit() must NEVER be called when reconciliation fails!');
    assert(mockConn.rolledBack, 'CRITICAL: rollback() must be called when reconciliation fails!');
  });

  // Test 7: In-transaction reconciliation fails on foreign-key orphans -> triggers rollback before commit
  await asyncTest('Test 7: In-transaction reconciliation orphan detection triggers rollback before commit', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
    const expectedCounts = migrator.getExpectedCounts();

    // Return 3 orphans specifically for applications -> users check
    const mockConn = createTransactionalMockConnection({
      inTransactionCounts: expectedCounts,
      orphanCounts: { 'a.student_id = u.id': 3 },
    });

    let errorThrown = null;
    try {
      await migrator.executeLiveMigration(mockConn);
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown != null, 'Expected reconciliation failure error, but none was thrown');
    assert(errorThrown.message.includes('[PRE-COMMIT RECONCILIATION FAILED]'), `Unexpected error: ${errorThrown.message}`);
    assert(errorThrown.message.includes('3 orphan foreign-key references found'), 'Error should specify orphan count');
    assert(mockConn.transactionStarted, 'Transaction should have started');
    assert(!mockConn.committed, 'CRITICAL: commit() must NEVER be called when orphans are found!');
    assert(mockConn.rolledBack, 'CRITICAL: rollback() must be called when orphans are found!');
  });

  // Test 8: SQL insert failure triggers rollback before commit
  await asyncTest('Test 8: SQL insert failure triggers rollback before commit', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];

    const mockConn = createTransactionalMockConnection({
      failOnExecute: new Error('Duplicate entry "alice@example.com" for key users.email'),
    });

    let errorThrown = null;
    try {
      await migrator.executeLiveMigration(mockConn);
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown != null, 'Expected insert failure error');
    assert(errorThrown.message.includes('Duplicate entry'), `Unexpected error: ${errorThrown.message}`);
    assert(mockConn.transactionStarted, 'Transaction should have started');
    assert(!mockConn.committed, 'commit() must not be called after insert failure');
    assert(mockConn.rolledBack, 'rollback() must be called after insert failure');
  });

  // Test 9: Commit failure accurately captured
  await asyncTest('Test 9: Commit failure is handled without calling post-commit logic', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
    const expectedCounts = migrator.getExpectedCounts();

    const mockConn = createTransactionalMockConnection({
      inTransactionCounts: expectedCounts,
      failOnCommit: new Error('Network timeout during commit'),
    });

    let errorThrown = null;
    try {
      await migrator.executeLiveMigration(mockConn);
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown != null, 'Expected commit failure error');
    assert(errorThrown.message.includes('Network timeout during commit'), `Unexpected error: ${errorThrown.message}`);
    assert(!mockConn.committed, 'Transaction was not successfully committed');
  });

  // Test 10: Secondary rollback failure does not trigger unhandled rejection
  await asyncTest('Test 10: Secondary rollback failure during insert abort is handled gracefully', async () => {
    const migrator = new Migrator(dummyConfig);
    migrator.transformedRows.users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];

    const mockConn = createTransactionalMockConnection({
      failOnExecute: new Error('Constraint violation on insert'),
      failOnRollback: new Error('Socket closed during rollback'),
    });

    let errorThrown = null;
    try {
      await migrator.executeLiveMigration(mockConn);
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown != null, 'Expected error to be rethrown');
    assert.strictEqual(errorThrown.message, 'Constraint violation on insert', 'Primary failure cause must be preserved');
  });

  console.log('\n------------------------------------------------------');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
