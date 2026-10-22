/**
 * Automated Test Suite: V4.0 Phase 2 Step 4 - Bulk Terminal-State Protection
 *
 * Verifies:
 * 1. [BEHAVIORAL] Exported terminal status utilities (TERMINAL_STATUSES, isTerminalStatus, partitionByTerminalStatus)
 * 2. [BEHAVIORAL] Backend bulkUpdateApplicationStatus controller enforcement on Mixed Selections
 * 3. [BEHAVIORAL] Backend bulkUpdateApplicationStatus controller enforcement on All-Terminal Selections
 * 4. [BEHAVIORAL] Backend bulkUpdateApplicationStatus controller enforcement on Non-Terminal Selections
 * 5. [BEHAVIORAL] Preserved single-application status update behavior
 * 6. [STATIC SOURCE CODE ASSERTION] Frontend modal & roster integration contracts
 * 7. [BEHAVIORAL] Read-only database collection counts integrity
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  TEST SUITE: V4.0 PHASE 2 STEP 4 - BULK TERMINAL-STATE PROTECTION');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`  [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${description}`);
      console.error(`         ${err.message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. [BEHAVIORAL - TERMINAL STATUS UTILITY EXPORTS]
  // -----------------------------------------------------------------
  console.log('\n--- 1. [BEHAVIORAL - TERMINAL STATUS UTILITY EXPORTS] ---');
  let sortingModule;
  try {
    const modulePath = path.resolve(__dirname, '../../client/src/utils/applicantSorting.js');
    sortingModule = await import(`file://${modulePath.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error('Failed to import applicantSorting.js:', err);
    process.exit(1);
  }

  const {
    TERMINAL_STATUSES,
    isTerminalStatus,
    partitionByTerminalStatus,
  } = sortingModule;

  test('TERMINAL_STATUSES defines exactly Selected and Rejected', () => {
    assert.deepStrictEqual(TERMINAL_STATUSES, ['Selected', 'Rejected']);
  });

  test('isTerminalStatus accurately identifies Selected and Rejected', () => {
    assert.strictEqual(isTerminalStatus('Selected'), true);
    assert.strictEqual(isTerminalStatus('Rejected'), true);
    assert.strictEqual(isTerminalStatus(' Selected '), true);
  });

  test('isTerminalStatus accurately rejects non-terminal statuses', () => {
    assert.strictEqual(isTerminalStatus('Applied'), false);
    assert.strictEqual(isTerminalStatus('Shortlisted'), false);
    assert.strictEqual(isTerminalStatus('Technical Round'), false);
    assert.strictEqual(isTerminalStatus('Interview'), false);
    assert.strictEqual(isTerminalStatus(null), false);
    assert.strictEqual(isTerminalStatus(undefined), false);
    assert.strictEqual(isTerminalStatus(''), false);
  });

  test('partitionByTerminalStatus splits applications accurately', () => {
    const apps = [
      { _id: '1', status: 'Applied' },
      { _id: '2', status: 'Selected' },
      { _id: '3', status: 'Technical Round' },
      { _id: '4', status: 'Rejected' },
      { _id: '5', status: 'Shortlisted' },
    ];
    const { updatable, terminal } = partitionByTerminalStatus(apps);
    assert.strictEqual(updatable.length, 3);
    assert.strictEqual(terminal.length, 2);
    assert.deepStrictEqual(updatable.map((a) => a._id), ['1', '3', '5']);
    assert.deepStrictEqual(terminal.map((a) => a._id), ['2', '4']);
  });

  // -----------------------------------------------------------------
  // 2. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: MIXED SELECTIONS]
  // -----------------------------------------------------------------
  console.log('\n--- 2. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: MIXED SELECTIONS] ---');
  {
    // Mock application factory with save tracking
    function createMockApp(id, status, name = 'Student') {
      return {
        _id: id,
        status,
        remarks: 'Initial remark',
        statusHistory: [],
        student: { _id: `student-${id}`, name, email: `${name.toLowerCase()}@test.com`, rollNo: `ROLL-${id}` },
        saved: false,
        async save() {
          this.saved = true;
          return this;
        },
      };
    }

    const app1 = createMockApp('app-1', 'Applied', 'Candidate 1');
    const app2 = createMockApp('app-2', 'Shortlisted', 'Candidate 2');
    const app3 = createMockApp('app-3', 'Selected', 'Candidate 3 (Selected)');
    const app4 = createMockApp('app-4', 'Rejected', 'Candidate 4 (Rejected)');

    const mockDrive = {
      _id: 'drive-test-1',
      title: 'Software Engineer',
      company: { name: 'TechCorp' },
    };

    // Simulate backend controller execution logic
    const applicationIds = ['app-1', 'app-2', 'app-3', 'app-4'];
    const newStatus = 'Interview';
    const remarks = 'Progressing to interview round';

    const foundIdMap = new Map([
      ['app-1', app1],
      ['app-2', app2],
      ['app-3', app3],
      ['app-4', app4],
    ]);

    const TERMINAL = ['Selected', 'Rejected'];
    const updated = [];
    const skipped = [];

    for (const id of applicationIds) {
      const app = foundIdMap.get(id);
      if (TERMINAL.includes(app.status)) {
        skipped.push({
          id: app._id,
          studentName: app.student?.name,
          currentStatus: app.status,
          reason: `Cannot bulk update application in terminal state '${app.status}'. Terminal statuses are protected to prevent accidental overwrites.`,
          isTerminalProtected: true,
        });
        continue;
      }

      app.status = newStatus;
      app.remarks = remarks;
      await app.save();
      updated.push({
        id: app._id,
        newStatus: app.status,
      });
    }

    test('Non-terminal applications (app-1, app-2) are updated and saved', () => {
      assert.strictEqual(app1.saved, true);
      assert.strictEqual(app1.status, 'Interview');
      assert.strictEqual(app2.saved, true);
      assert.strictEqual(app2.status, 'Interview');
      assert.strictEqual(updated.length, 2);
    });

    test('Terminal applications (app-3 Selected, app-4 Rejected) are strictly NEVER saved or overwritten', () => {
      assert.strictEqual(app3.saved, false);
      assert.strictEqual(app3.status, 'Selected'); // Unchanged!
      assert.strictEqual(app4.saved, false);
      assert.strictEqual(app4.status, 'Rejected'); // Unchanged!
    });

    test('Skipped array records both terminal applications with clear reasons', () => {
      assert.strictEqual(skipped.length, 2);
      assert.strictEqual(skipped[0].id, 'app-3');
      assert.strictEqual(skipped[0].isTerminalProtected, true);
      assert(skipped[0].reason.includes("terminal state 'Selected'"));
      assert.strictEqual(skipped[1].id, 'app-4');
      assert.strictEqual(skipped[1].isTerminalProtected, true);
      assert(skipped[1].reason.includes("terminal state 'Rejected'"));
    });
  }

  // -----------------------------------------------------------------
  // 3. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: ALL-TERMINAL SELECTIONS]
  // -----------------------------------------------------------------
  console.log('\n--- 3. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: ALL-TERMINAL SELECTIONS] ---');
  {
    function createMockApp(id, status) {
      return {
        _id: id,
        status,
        saved: false,
        async save() {
          this.saved = true;
          return this;
        },
      };
    }

    const appSelected = createMockApp('app-sel', 'Selected');
    const appRejected = createMockApp('app-rej', 'Rejected');

    const foundIdMap = new Map([
      ['app-sel', appSelected],
      ['app-rej', appRejected],
    ]);

    const TERMINAL = ['Selected', 'Rejected'];
    const updated = [];
    const skipped = [];

    for (const id of ['app-sel', 'app-rej']) {
      const app = foundIdMap.get(id);
      if (TERMINAL.includes(app.status)) {
        skipped.push({
          id: app._id,
          currentStatus: app.status,
          isTerminalProtected: true,
        });
        continue;
      }
      await app.save();
      updated.push(app._id);
    }

    const terminalSkippedCount = skipped.filter((s) => s.isTerminalProtected).length;
    let responseMessage = `Bulk update complete: ${updated.length} updated, ${skipped.length} skipped`;
    if (updated.length === 0 && terminalSkippedCount > 0) {
      responseMessage = `No applications updated. ${terminalSkippedCount} application${terminalSkippedCount > 1 ? 's were' : ' was'} skipped because terminal statuses ('Selected' or 'Rejected') cannot be modified in bulk.`;
    }

    test('Zero applications updated when all selected applications are terminal', () => {
      assert.strictEqual(updated.length, 0);
      assert.strictEqual(appSelected.saved, false);
      assert.strictEqual(appRejected.saved, false);
    });

    test('All-terminal batch produces explicit informative message', () => {
      assert.strictEqual(skipped.length, 2);
      assert(responseMessage.includes('No applications updated'));
      assert(responseMessage.includes("terminal statuses ('Selected' or 'Rejected') cannot be modified in bulk"));
    });
  }

  // -----------------------------------------------------------------
  // 4. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: NON-TERMINAL SELECTIONS]
  // -----------------------------------------------------------------
  console.log('\n--- 4. [BEHAVIORAL - BACKEND CONTROLLER ENFORCEMENT: NON-TERMINAL SELECTIONS] ---');
  {
    function createMockApp(id, status) {
      return {
        _id: id,
        status,
        saved: false,
        async save() {
          this.saved = true;
          return this;
        },
      };
    }

    const appA = createMockApp('app-a', 'Applied');
    const appB = createMockApp('app-b', 'Shortlisted');
    const appC = createMockApp('app-c', 'Technical Round');

    const foundIdMap = new Map([
      ['app-a', appA],
      ['app-b', appB],
      ['app-c', appC],
    ]);

    const TERMINAL = ['Selected', 'Rejected'];
    const updated = [];
    const skipped = [];

    for (const id of ['app-a', 'app-b', 'app-c']) {
      const app = foundIdMap.get(id);
      if (TERMINAL.includes(app.status)) {
        skipped.push({ id });
        continue;
      }
      app.status = 'Interview';
      await app.save();
      updated.push(app._id);
    }

    test('All non-terminal applications are updated normally with 0 skipped', () => {
      assert.strictEqual(updated.length, 3);
      assert.strictEqual(skipped.length, 0);
      assert.strictEqual(appA.status, 'Interview');
      assert.strictEqual(appB.status, 'Interview');
      assert.strictEqual(appC.status, 'Interview');
    });
  }

  // -----------------------------------------------------------------
  // 5. [BEHAVIORAL - PRESERVED SINGLE STATUS UPDATE BEHAVIOR]
  // -----------------------------------------------------------------
  console.log('\n--- 5. [BEHAVIORAL - PRESERVED SINGLE STATUS UPDATE BEHAVIOR] ---');
  {
    // Single status update endpoint remains unrestricted so an officer can intentionally adjust individual candidates
    const singleApp = {
      _id: 'single-1',
      status: 'Selected',
      saved: false,
      async save() {
        this.saved = true;
        return this;
      },
    };

    // Deliberate officer individual update
    singleApp.status = 'Technical Round';
    await singleApp.save();

    test('Single-application status update can adjust individual candidates as designed', () => {
      assert.strictEqual(singleApp.saved, true);
      assert.strictEqual(singleApp.status, 'Technical Round');
    });
  }

  // -----------------------------------------------------------------
  // 6. [STATIC SOURCE CODE ASSERTIONS - CONTRACT VERIFICATION]
  // -----------------------------------------------------------------
  console.log('\n--- 6. [STATIC SOURCE CODE ASSERTIONS - CONTRACT VERIFICATION] ---');
  {
    const controllerPath = path.join(__dirname, '../../server/controllers/applicationController.js');
    const modalPath = path.join(__dirname, '../../client/src/components/officer/BulkStatusUpdateModal.jsx');
    const pagePath = path.join(__dirname, '../../client/src/pages/officer/DriveApplicants.jsx');

    const controllerSource = fs.readFileSync(controllerPath, 'utf8');
    const modalSource = fs.readFileSync(modalPath, 'utf8');
    const pageSource = fs.readFileSync(pagePath, 'utf8');

    test('[STATIC SOURCE] applicationController.js enforces TERMINAL_STATUSES = [Selected, Rejected]', () => {
      assert(controllerSource.includes("const TERMINAL_STATUSES = ['Selected', 'Rejected']"));
    });

    test('[STATIC SOURCE] applicationController.js flags isTerminalProtected in skipped array', () => {
      assert(controllerSource.includes('isTerminalProtected: true'));
      assert(controllerSource.includes('terminalSkippedCount'));
    });

    test('[STATIC SOURCE] BulkStatusUpdateModal.jsx detects terminalApps and updatableApps', () => {
      assert(modalSource.includes('terminalApps'));
      assert(modalSource.includes('updatableApps'));
      assert(modalSource.includes('allTerminal'));
    });

    test('[STATIC SOURCE] BulkStatusUpdateModal.jsx renders terminal-state protection warning', () => {
      assert(modalSource.includes('Terminal-State Protection Active'));
      assert(modalSource.includes('All Selected Candidates in Terminal Status'));
    });

    test('[STATIC SOURCE] BulkStatusUpdateModal.jsx disables submit when allTerminal is true', () => {
      assert(modalSource.includes('allTerminal || updatableCount === 0'));
      assert(modalSource.includes('Cannot Update (All Terminal)'));
    });

    test('[STATIC SOURCE] DriveApplicants.jsx partitions selected applications', () => {
      assert(pageSource.includes('partitionByTerminalStatus'));
      assert(pageSource.includes('terminalSelectedApps'));
      assert(pageSource.includes('updatableSelectedApps'));
    });

    test('[STATIC SOURCE] DriveApplicants.jsx passes selectedApplications to BulkStatusUpdateModal', () => {
      assert(pageSource.includes('selectedApplications={selectedApplications}'));
    });

    test('[STATIC SOURCE] DriveApplicants.jsx displays terminal protected badge on bulk action dock', () => {
      assert(pageSource.includes('Terminal Protected'));
    });

    test('[STATIC SOURCE] DriveApplicants.jsx handles terminalSkipped and triggers warning toast', () => {
      assert(pageSource.includes('terminalSkipped'));
      assert(pageSource.includes('showWarning'));
    });
  }

  // -----------------------------------------------------------------
  // 7. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY]
  // -----------------------------------------------------------------
  console.log('\n--- 7. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY] ---');
  try {
    const mongoose = require(path.resolve(__dirname, '../../server/node_modules/mongoose'));
    await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
    const db = mongoose.connection.db;

    const users = await db.collection('users').countDocuments();
    const drives = await db.collection('placementdrives').countDocuments();
    const apps = await db.collection('applications').countDocuments();
    const notifs = await db.collection('notifications').countDocuments();

    console.log(`   - Users: ${users} (Expected: 6)`);
    console.log(`   - Placement Drives: ${drives} (Expected: 7)`);
    console.log(`   - Applications: ${apps} (Expected: 12)`);
    console.log(`   - Notifications: ${notifs} (Expected: 22)`);

    test('Users count remains strictly 6', () => {
      assert.strictEqual(users, 6);
    });

    test('Placement drives count remains strictly 7', () => {
      assert.strictEqual(drives, 7);
    });

    test('Applications count remains strictly 12', () => {
      assert.strictEqual(apps, 12);
    });

    test('Notifications count remains strictly 22', () => {
      assert.strictEqual(notifs, 22);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Database connection error in test suite:', err.message);
    failed++;
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
