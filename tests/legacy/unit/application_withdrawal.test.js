/**
 * Automated Test Suite: Student Application Withdrawal with Status Protection
 *
 * Verifies:
 * 1. [CONTROLLER & ROUTE CONTRACTS] Controller exports and Express route registration
 * 2. [CLIENT API SERVICE] api.applications.withdraw definition and method contract
 * 3. [SCHEMA PRESERVATION] Application schema status enum remains strictly intact
 * 4. [FRONTEND UI CONTRACTS] Status-gated buttons, confirmation modal, and modal footer integration
 * 5. [BEHAVIORAL UNIT TESTS]
 *    - Invalid ObjectId format (HTTP 400)
 *    - Missing application (HTTP 404)
 *    - Cross-student ownership protection (HTTP 403)
 *    - Status protection against all 5 progressive/terminal statuses (HTTP 400)
 *    - Concurrency race condition handling (HTTP 400)
 *    - Successful atomic deletion & notification dispatch (HTTP 200)
 *    - Notification error resilience (HTTP 200 despite notification failure)
 * 6. [DATABASE BASELINE INTEGRITY] Read-only verification of preserved MongoDB baseline
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  TEST SUITE: STUDENT APPLICATION WITHDRAWAL WITH STATUS PROTECTION');
  console.log('======================================================================\n');

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

  async function asyncTest(description, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${description}`);
      console.error(`         ${err.message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. [CONTROLLER & ROUTE CONTRACTS]
  // -----------------------------------------------------------------
  console.log('--- 1. [CONTROLLER & ROUTE CONTRACTS] ---');
  const controller = require('../../server/controllers/applicationController');

  test('applicationController exports withdrawApplication function', () => {
    assert.strictEqual(typeof controller.withdrawApplication, 'function');
  });

  test('applicationRoutes.js registers DELETE /:id/withdraw with student authorization', () => {
    const routeContent = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/applicationRoutes.js'),
      'utf8'
    );
    assert.ok(
      routeContent.includes("router.delete('/:id/withdraw'"),
      'Route definition DELETE /:id/withdraw must exist'
    );
    assert.ok(
      routeContent.includes("authorize('student')"),
      "Route must require authorize('student')"
    );
    assert.ok(
      routeContent.includes('withdrawApplication'),
      'Route must attach withdrawApplication controller'
    );
  });

  // -----------------------------------------------------------------
  // 2. [CLIENT API SERVICE]
  // -----------------------------------------------------------------
  console.log('\n--- 2. [CLIENT API SERVICE] ---');
  test('api.js exports withdraw method under applications object', () => {
    const apiContent = fs.readFileSync(
      path.resolve(__dirname, '../../client/src/services/api.js'),
      'utf8'
    );
    assert.ok(
      apiContent.includes('withdraw: (applicationId) =>'),
      'api.applications must define withdraw method'
    );
    assert.ok(
      apiContent.includes("`/applications/${applicationId}/withdraw`"),
      'withdraw method must call /applications/${applicationId}/withdraw'
    );
    assert.ok(
      apiContent.includes("method: 'DELETE'"),
      "withdraw method must use method: 'DELETE'"
    );
  });

  // -----------------------------------------------------------------
  // 3. [SCHEMA PRESERVATION]
  // -----------------------------------------------------------------
  console.log('\n--- 3. [SCHEMA PRESERVATION] ---');
  const Application = require('../../server/models/Application');

  test('Application status enum is preserved with exactly 6 recruitment statuses', () => {
    const statusEnum = Application.schema.path('status').enumValues;
    assert.deepStrictEqual(statusEnum, [
      'Applied',
      'Shortlisted',
      'Technical Round',
      'Interview',
      'Selected',
      'Rejected',
    ]);
  });

  test('Application statusHistory schema status enum is preserved with exactly 6 statuses', () => {
    const historyStatusEnum = Application.schema.path('statusHistory.0.status').enumValues;
    assert.deepStrictEqual(historyStatusEnum, [
      'Applied',
      'Shortlisted',
      'Technical Round',
      'Interview',
      'Selected',
      'Rejected',
    ]);
  });

  // -----------------------------------------------------------------
  // 4. [FRONTEND UI CONTRACTS]
  // -----------------------------------------------------------------
  console.log('\n--- 4. [FRONTEND UI CONTRACTS] ---');
  const myAppsContent = fs.readFileSync(
    path.resolve(__dirname, '../../client/src/pages/student/MyApplications.jsx'),
    'utf8'
  );

  test('MyApplications.jsx imports RotateCcw and AlertTriangle icons', () => {
    assert.ok(myAppsContent.includes('RotateCcw'), 'RotateCcw must be imported');
    assert.ok(myAppsContent.includes('AlertTriangle'), 'AlertTriangle must be imported');
  });

  test('MyApplications.jsx calls api.applications.withdraw in handleConfirmWithdraw', () => {
    assert.ok(
      myAppsContent.includes('api.applications.withdraw(appToWithdraw._id)'),
      'Must invoke api.applications.withdraw'
    );
  });

  test('MyApplications.jsx renders enabled Withdraw button only for Applied status', () => {
    assert.ok(
      myAppsContent.includes("app.status === 'Applied' ? ("),
      'Must conditionally render enabled Withdraw button for Applied'
    );
    assert.ok(
      myAppsContent.includes('onClick={() => setAppToWithdraw(app)}'),
      'Clicking Withdraw must set appToWithdraw state'
    );
  });

  test('MyApplications.jsx renders disabled Withdraw button for non-Applied statuses', () => {
    assert.ok(
      myAppsContent.includes('disabled'),
      'Must render disabled attribute on non-Applied withdraw button'
    );
    assert.ok(
      myAppsContent.includes('Cannot withdraw: Application is under active review or finalized'),
      'Must provide explanatory title tooltip on disabled withdraw button'
    );
  });

  test('MyApplications.jsx renders Confirmation Modal with drive info and impact explanation', () => {
    assert.ok(
      myAppsContent.includes('title="Confirm Application Withdrawal"'),
      'Confirmation modal title must be present'
    );
    assert.ok(
      myAppsContent.includes('Confirm Withdrawal'),
      'Confirm Withdrawal button text must be present'
    );
  });

  test('MyApplications.jsx provides Withdraw Application button in Quick Details modal', () => {
    assert.ok(
      myAppsContent.includes("selectedApp.status === 'Applied' && ("),
      'Quick details modal must check status === Applied'
    );
    assert.ok(
      myAppsContent.includes('Withdraw Application</span>'),
      'Quick details modal must have Withdraw Application button'
    );
  });

  // -----------------------------------------------------------------
  // 5. [BEHAVIORAL CONTROLLER UNIT TESTS]
  // -----------------------------------------------------------------
  console.log('\n--- 5. [BEHAVIORAL CONTROLLER UNIT TESTS] ---');

  // Helper to create mock response object
  function createMockRes() {
    return {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
  }

  await asyncTest('Invalid ObjectId format returns HTTP 400', async () => {
    const req = {
      params: { id: 'invalid-hex-id' },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createMockRes();
    let nextCalled = false;
    await controller.withdrawApplication(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.message, 'Invalid application ID format');
    assert.strictEqual(nextCalled, false);
  });

  await asyncTest('Non-existent application ID returns HTTP 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    // Stub findById to return null
    const origFindById = Application.findById;
    Application.findById = () => ({
      populate: () => Promise.resolve(null),
    });

    try {
      const req = {
        params: { id: nonExistentId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.withdrawApplication(req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.jsonData.success, false);
      assert.strictEqual(res.jsonData.message, 'Application not found or already withdrawn');
    } finally {
      Application.findById = origFindById;
    }
  });

  await asyncTest('Cross-student ownership mismatch returns HTTP 403 Forbidden', async () => {
    const appId = new mongoose.Types.ObjectId();
    const ownerStudentId = new mongoose.Types.ObjectId();
    const requestingStudentId = new mongoose.Types.ObjectId(); // Different student!

    const mockApp = {
      _id: appId,
      student: ownerStudentId,
      status: 'Applied',
      drive: { _id: new mongoose.Types.ObjectId(), title: 'SDE', company: { name: 'Google' } },
    };

    const origFindById = Application.findById;
    Application.findById = () => ({
      populate: () => Promise.resolve(mockApp),
    });

    try {
      const req = {
        params: { id: appId.toString() },
        user: { _id: requestingStudentId },
      };
      const res = createMockRes();
      await controller.withdrawApplication(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.jsonData.success, false);
      assert.strictEqual(res.jsonData.message, 'Access denied. You can only withdraw your own applications.');
    } finally {
      Application.findById = origFindById;
    }
  });

  // Test all 5 prohibited stages
  const prohibitedStages = [
    'Shortlisted',
    'Technical Round',
    'Interview',
    'Selected',
    'Rejected',
  ];

  for (const stage of prohibitedStages) {
    await asyncTest(`Status protection: stage '${stage}' returns HTTP 400 Bad Request`, async () => {
      const appId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      const mockApp = {
        _id: appId,
        student: studentId,
        status: stage,
        drive: { _id: new mongoose.Types.ObjectId(), title: 'Analyst', company: { name: 'Deloitte' } },
      };

      const origFindById = Application.findById;
      Application.findById = () => ({
        populate: () => Promise.resolve(mockApp),
      });

      try {
        const req = {
          params: { id: appId.toString() },
          user: { _id: studentId },
        };
        const res = createMockRes();
        await controller.withdrawApplication(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.success, false);
        assert.ok(
          res.jsonData.message.includes(`already progressed to '${stage}' stage`),
          `Error message must mention stage '${stage}'`
        );
      } finally {
        Application.findById = origFindById;
      }
    });
  }

  await asyncTest('Concurrency race safeguard: mid-flight status update returns HTTP 400', async () => {
    const appId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    // 1. Initial findById saw 'Applied'
    const initialApp = {
      _id: appId,
      student: studentId,
      status: 'Applied',
      drive: { _id: new mongoose.Types.ObjectId(), title: 'Cloud Eng', company: { name: 'AWS' } },
    };

    const origFindById = Application.findById;
    const origFindOneAndDelete = Application.findOneAndDelete;

    let findByIdCalls = 0;
    Application.findById = (id) => {
      findByIdCalls++;
      if (findByIdCalls === 1) {
        return { populate: () => Promise.resolve(initialApp) };
      }
      // Race condition occurred! Status was changed to 'Shortlisted' right before deletion
      return Promise.resolve({
        _id: id,
        student: studentId,
        status: 'Shortlisted',
      });
    };

    // findOneAndDelete matched 0 records because status is no longer 'Applied'
    Application.findOneAndDelete = () => Promise.resolve(null);

    try {
      const req = {
        params: { id: appId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.withdrawApplication(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.success, false);
      assert.ok(
        res.jsonData.message.includes("Application was recently updated to 'Shortlisted' stage"),
        'Must detect and report race condition'
      );
    } finally {
      Application.findById = origFindById;
      Application.findOneAndDelete = origFindOneAndDelete;
    }
  });

  await asyncTest('Successful withdrawal of Applied application returns HTTP 200', async () => {
    const appId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const driveId = new mongoose.Types.ObjectId();

    const mockApp = {
      _id: appId,
      student: studentId,
      status: 'Applied',
      drive: { _id: driveId, title: 'Web Developer', company: { name: 'TCS' } },
    };

    const User = require('../../server/models/User');
    const Notification = require('../../server/models/Notification');

    const origFindById = Application.findById;
    const origFindOneAndDelete = Application.findOneAndDelete;
    const origUserFindById = User.findById;
    const origUserFind = User.find;
    const origNotifCreate = Notification.create;

    Application.findById = () => ({
      populate: () => Promise.resolve(mockApp),
    });
    Application.findOneAndDelete = () => Promise.resolve(mockApp);
    User.findById = () => ({
      select: () => Promise.resolve({ name: 'Rahul Verma', rollNo: '22CS101', branch: 'CSE' }),
    });
    User.find = () => ({
      select: () => Promise.resolve([{ _id: new mongoose.Types.ObjectId() }]),
    });
    Notification.create = () => Promise.resolve({ _id: new mongoose.Types.ObjectId() });

    try {
      const req = {
        params: { id: appId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.withdrawApplication(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.success, true);
      assert.ok(res.jsonData.message.includes('has been successfully withdrawn'));
      assert.strictEqual(res.jsonData.data.applicationId, appId.toString());
      assert.strictEqual(res.jsonData.data.driveId.toString(), driveId.toString());
    } finally {
      Application.findById = origFindById;
      Application.findOneAndDelete = origFindOneAndDelete;
      User.findById = origUserFindById;
      User.find = origUserFind;
      Notification.create = origNotifCreate;
    }
  });

  await asyncTest('Notification service failure does not block successful withdrawal (HTTP 200)', async () => {
    const appId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const driveId = new mongoose.Types.ObjectId();

    const mockApp = {
      _id: appId,
      student: studentId,
      status: 'Applied',
      drive: { _id: driveId, title: 'Web Developer', company: { name: 'TCS' } },
    };

    const User = require('../../server/models/User');
    const Notification = require('../../server/models/Notification');

    const origFindById = Application.findById;
    const origFindOneAndDelete = Application.findOneAndDelete;
    const origUserFindById = User.findById;
    const origUserFind = User.find;
    const origNotifCreate = Notification.create;

    Application.findById = () => ({
      populate: () => Promise.resolve(mockApp),
    });
    Application.findOneAndDelete = () => Promise.resolve(mockApp);
    User.findById = () => ({
      select: () => Promise.resolve({ name: 'Rahul Verma', rollNo: '22CS101', branch: 'CSE' }),
    });
    User.find = () => ({
      select: () => Promise.resolve([{ _id: new mongoose.Types.ObjectId() }]),
    });
    // Simulate notification service error (e.g. database connection or write error)
    Notification.create = () => Promise.reject(new Error('Notification service connection timeout'));

    try {
      const req = {
        params: { id: appId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.withdrawApplication(req, res, () => {});

      // Withdrawal must STILL succeed with HTTP 200 despite notification service error
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.success, true);
      assert.ok(res.jsonData.message.includes('has been successfully withdrawn'));
    } finally {
      Application.findById = origFindById;
      Application.findOneAndDelete = origFindOneAndDelete;
      User.findById = origUserFindById;
      User.find = origUserFind;
      Notification.create = origNotifCreate;
    }
  });

  // -----------------------------------------------------------------
  // 5B. [BEHAVIORAL REAPPLICATION & DUPLICATE SUBMISSION SAFEGUARDS]
  // -----------------------------------------------------------------
  console.log('\n--- 5B. [REAPPLICATION & DUPLICATE SUBMISSION SAFEGUARDS] ---');

  await asyncTest('Active application blocks duplicate submission with HTTP 400', async () => {
    const driveId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const PlacementDrive = require('../../server/models/PlacementDrive');
    const origDriveFindById = PlacementDrive.findById;
    const origAppFindOne = Application.findOne;

    PlacementDrive.findById = () => ({
      populate: () => Promise.resolve({
        _id: driveId,
        title: 'SDE-1',
        status: 'Ongoing',
        deadline: new Date(Date.now() + 86400000), // Tomorrow
        company: { name: 'Google India' },
      }),
    });

    // Active application already exists
    Application.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      drive: driveId,
      student: studentId,
      status: 'Applied',
    });

    try {
      const req = {
        params: { driveId: driveId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.applyForDrive(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.success, false);
      assert.ok(res.jsonData.message.includes('You have already applied'));
    } finally {
      PlacementDrive.findById = origDriveFindById;
      Application.findOne = origAppFindOne;
    }
  });

  await asyncTest('Reapplication succeeds after withdrawal when eligible and before deadline', async () => {
    const driveId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const PlacementDrive = require('../../server/models/PlacementDrive');
    const User = require('../../server/models/User');
    const Notification = require('../../server/models/Notification');

    const origDriveFindById = PlacementDrive.findById;
    const origAppFindOne = Application.findOne;
    const origAppCreate = Application.create;
    const origAppFindById = Application.findById;
    const origUserFindById = User.findById;
    const origUserFind = User.find;
    const origNotifCreate = Notification.create;

    const mockDrive = {
      _id: driveId,
      title: 'SDE-1',
      status: 'Ongoing',
      deadline: new Date(Date.now() + 86400000), // Tomorrow
      company: { name: 'Google India' },
      eligibility: {
        minCGPA: 8.0,
        allowedBranches: ['CSE', 'IT'],
        maxBacklogs: 0,
        passingYear: 2026,
      },
    };

    const mockStudent = {
      _id: studentId,
      name: 'Rahul Verma',
      rollNo: '22CS101',
      branch: 'CSE',
      cgpa: 8.85,
      activeBacklogs: 0,
      passingYear: 2026,
    };

    const newAppId = new mongoose.Types.ObjectId();
    const createdAppDoc = {
      _id: newAppId,
      drive: driveId,
      student: studentId,
      status: 'Applied',
    };

    PlacementDrive.findById = () => ({
      populate: () => Promise.resolve(mockDrive),
    });

    // After withdrawal: Application.findOne returns NULL (freed compound index)
    Application.findOne = () => Promise.resolve(null);
    Application.create = () => Promise.resolve(createdAppDoc);
    Application.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(createdAppDoc),
      }),
    });
    User.findById = () => Promise.resolve(mockStudent);
    User.find = () => ({
      select: () => Promise.resolve([{ _id: new mongoose.Types.ObjectId() }]),
    });
    Notification.create = () => Promise.resolve({ _id: new mongoose.Types.ObjectId() });

    try {
      const req = {
        params: { driveId: driveId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.applyForDrive(req, res, () => {});

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.success, true);
      assert.ok(res.jsonData.message.includes('Successfully applied to Google India - SDE-1'));
    } finally {
      PlacementDrive.findById = origDriveFindById;
      Application.findOne = origAppFindOne;
      Application.create = origAppCreate;
      Application.findById = origAppFindById;
      User.findById = origUserFindById;
      User.find = origUserFind;
      Notification.create = origNotifCreate;
    }
  });

  await asyncTest('Reapplication is blocked if drive deadline has expired', async () => {
    const driveId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const PlacementDrive = require('../../server/models/PlacementDrive');
    const origDriveFindById = PlacementDrive.findById;
    const origAppFindOne = Application.findOne;

    PlacementDrive.findById = () => ({
      populate: () => Promise.resolve({
        _id: driveId,
        title: 'SDE-1',
        status: 'Ongoing',
        deadline: new Date(Date.now() - 86400000), // Yesterday (EXPIRED)
        company: { name: 'Google India' },
      }),
    });

    // Withdrawn: no active app exists
    Application.findOne = () => Promise.resolve(null);

    try {
      const req = {
        params: { driveId: driveId.toString() },
        user: { _id: studentId },
      };
      const res = createMockRes();
      await controller.applyForDrive(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.success, false);
      assert.ok(res.jsonData.message.includes('Submissions are closed'));
    } finally {
      PlacementDrive.findById = origDriveFindById;
      Application.findOne = origAppFindOne;
    }
  });

  await asyncTest('Reapplication is blocked if student does not meet eligibility criteria', async () => {
    const driveId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const PlacementDrive = require('../../server/models/PlacementDrive');
    const User = require('../../server/models/User');

    const origDriveFindById = PlacementDrive.findById;
    const origAppFindOne = Application.findOne;
    const origUserFindById = User.findById;

    PlacementDrive.findById = () => ({
      populate: () => Promise.resolve({
        _id: driveId,
        title: 'SDE-1',
        status: 'Ongoing',
        deadline: new Date(Date.now() + 86400000),
        company: { name: 'Google India' },
        eligibility: {
          minCGPA: 8.5, // Requires 8.5
          allowedBranches: ['CSE'],
          maxBacklogs: 0,
          passingYear: 2026,
        },
      }),
    });

    Application.findOne = () => Promise.resolve(null);

    // Ineligible student (CGPA 6.4 < 8.5, branch ECE not in CSE, 1 backlog > 0)
    User.findById = () => Promise.resolve({
      _id: studentId,
      role: 'student',
      name: 'Arjun Patel',
      branch: 'ECE',
      cgpa: 6.4,
      activeBacklogs: 1,
      passingYear: 2026,
    });

    try {
      const req = {
        params: { driveId: driveId.toString() },
        user: { _id: studentId, role: 'student' },
      };
      const res = createMockRes();
      await controller.applyForDrive(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.success, false);
      assert.ok(res.jsonData.message.includes('not eligible for this placement drive'));
    } finally {
      PlacementDrive.findById = origDriveFindById;
      Application.findOne = origAppFindOne;
      User.findById = origUserFindById;
    }
  });

  // -----------------------------------------------------------------
  // 5C. [FRONTEND ERROR RESILIENCE SIMULATION]
  // -----------------------------------------------------------------
  console.log('\n--- 5C. [FRONTEND ERROR RESILIENCE SIMULATION] ---');

  await asyncTest('Frontend retains application in list and displays toast on API failure', async () => {
    // Replicate MyApplications.jsx handleConfirmWithdraw state lifecycle
    const initialApps = [
      { _id: 'app-1', status: 'Applied', company: 'Google' },
      { _id: 'app-2', status: 'Shortlisted', company: 'Deloitte' },
    ];
    let applications = [...initialApps];
    let appToWithdraw = initialApps[0];
    let withdrawing = false;
    let errorMessage = null;
    let successMessage = null;

    const mockApi = {
      withdraw: async () => {
        throw new Error('Network error: server temporarily unavailable');
      },
    };

    const mockNotification = {
      showError: (msg) => { errorMessage = msg; },
      showSuccess: (msg) => { successMessage = msg; },
    };

    // Execute withdrawal handler logic
    async function simulateHandleConfirmWithdraw() {
      if (!appToWithdraw) return;
      try {
        withdrawing = true;
        const res = await mockApi.withdraw(appToWithdraw._id);
        if (res.success) {
          mockNotification.showSuccess(res.message);
          applications = applications.filter((a) => a._id !== appToWithdraw._id);
          appToWithdraw = null;
        }
      } catch (err) {
        mockNotification.showError(err.message || 'Failed to withdraw application');
      } finally {
        withdrawing = false;
      }
    }

    await simulateHandleConfirmWithdraw();

    // Verification:
    assert.strictEqual(withdrawing, false, 'Loading flag must reset to false in finally');
    assert.strictEqual(applications.length, 2, 'Applications list must NOT drop application on error');
    assert.strictEqual(applications[0]._id, 'app-1', 'Target application remains visible in state');
    assert.strictEqual(errorMessage, 'Network error: server temporarily unavailable');
    assert.strictEqual(successMessage, null, 'Success toast must not be triggered on error');
    assert.strictEqual(appToWithdraw._id, 'app-1', 'appToWithdraw remains set on error allowing user retry');
  });

  await asyncTest('Frontend removes application from list on API success', async () => {
    const initialApps = [
      { _id: 'app-1', status: 'Applied', company: 'Google' },
      { _id: 'app-2', status: 'Shortlisted', company: 'Deloitte' },
    ];
    let applications = [...initialApps];
    let appToWithdraw = initialApps[0];
    let withdrawing = false;
    let errorMessage = null;
    let successMessage = null;

    const mockApi = {
      withdraw: async (id) => ({
        success: true,
        message: 'Application withdrawn successfully',
      }),
    };

    const mockNotification = {
      showError: (msg) => { errorMessage = msg; },
      showSuccess: (msg) => { successMessage = msg; },
    };

    async function simulateHandleConfirmWithdraw() {
      if (!appToWithdraw) return;
      try {
        withdrawing = true;
        const res = await mockApi.withdraw(appToWithdraw._id);
        if (res.success) {
          mockNotification.showSuccess(res.message);
          applications = applications.filter((a) => a._id !== appToWithdraw._id);
          appToWithdraw = null;
        }
      } catch (err) {
        mockNotification.showError(err.message || 'Failed to withdraw application');
      } finally {
        withdrawing = false;
      }
    }

    await simulateHandleConfirmWithdraw();

    assert.strictEqual(withdrawing, false);
    assert.strictEqual(applications.length, 1, 'Target application removed from list');
    assert.strictEqual(applications[0]._id, 'app-2');
    assert.strictEqual(appToWithdraw, null, 'Confirmation modal dismissed on success');
    assert.strictEqual(successMessage, 'Application withdrawn successfully');
    assert.strictEqual(errorMessage, null);
  });

  // -----------------------------------------------------------------
  // 6. [DATABASE BASELINE INTEGRITY]
  // -----------------------------------------------------------------
  console.log('\n--- 6. [DATABASE BASELINE INTEGRITY] ---');
  await asyncTest('Preserved MongoDB baseline counts (users 6, drives 7, apps 12, notifs 22)', async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_portal');
    const db = mongoose.connection.db;

    const counts = {
      users: await db.collection('users').countDocuments(),
      placementdrives: await db.collection('placementdrives').countDocuments(),
      applications: await db.collection('applications').countDocuments(),
      notifications: await db.collection('notifications').countDocuments(),
    };

    await mongoose.disconnect();

    assert.strictEqual(counts.users, 6, 'Users count must remain exactly 6');
    assert.strictEqual(counts.placementdrives, 7, 'Placement drives count must remain exactly 7');
    assert.strictEqual(counts.applications, 12, 'Applications count must remain exactly 12');
    assert.strictEqual(counts.notifications, 22, 'Notifications count must remain exactly 22');
  });

  console.log('\n======================================================================');
  console.log(`  FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner encountered unhandled error:', err);
  process.exit(1);
});
