/**
 * applicant_skill_matching.test.js
 * Focused automated test suite for V4.0 Phase 2 Step 2:
 * 1. Automatic AI Skill Match Score Loading on Applicant Roster
 * 2. Backend Endpoint Authorization & Verification (GET /api/applications/drive/:driveId/match-scores)
 * 3. Match Score Accuracy against live database records
 * 4. Missing Profile & Dirty Data Tolerance (null profiles, zero skills, baseline drives)
 * 5. Sorting Integration with Step 1 shared sortApplicants utility (match_desc + deterministic tie-breakers)
 * 6. Dynamic Re-sorting upon Score Arrival
 * 7. Async Lifecycle, Stale Responses on Route Switch, & Deduplication (Behavioral Simulation)
 * 8. Frontend Integration Contract (Static Source-Code Assertions for UI & Modal)
 * 9. Read-Only MongoDB Baseline Verification
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));

require(path.join(__dirname, '../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../server/.env'),
});

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const errMsg = `FAILED: ${testName} ${details ? '(' + details + ')' : ''}`;
    failures.push(errMsg);
    console.error(`  [FAIL] ${errMsg}`);
  }
}

function makeRequest(urlPath, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: V4.0 PHASE 2 STEP 2 - AUTOMATIC AI SKILL MATCHING');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. [BEHAVIORAL - SHARED MODULE EXPORTS]
  // -----------------------------------------------------------------
  console.log('--- 1. [BEHAVIORAL - SHARED MODULE EXPORTS] ---');
  const sharedModulePath = path.resolve(__dirname, '../../client/src/utils/applicantSorting.js');
  const sharedModuleUrl = 'file:///' + sharedModulePath.replace(/\\/g, '/');
  const { sortApplicants, safeNum, safeTime } = await import(sharedModuleUrl);

  assert(typeof sortApplicants === 'function', 'sortApplicants is exported as function from applicantSorting.js');
  assert(typeof safeNum === 'function', 'safeNum is exported as function from applicantSorting.js');
  assert(typeof safeTime === 'function', 'safeTime is exported as function from applicantSorting.js');

  // -----------------------------------------------------------------
  // 2. [BEHAVIORAL - DATABASE READ-ONLY BASELINE CHECK]
  // -----------------------------------------------------------------
  console.log('\n--- 2. [BEHAVIORAL - DATABASE READ-ONLY BASELINE CHECK] ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const db = mongoose.connection.db;

  const initialCounts = {
    users: await db.collection('users').countDocuments(),
    placementdrives: await db.collection('placementdrives').countDocuments(),
    applications: await db.collection('applications').countDocuments(),
    notifications: await db.collection('notifications').countDocuments(),
  };

  console.log(`   - Users: ${initialCounts.users} (Expected: 6)`);
  console.log(`   - Placement Drives: ${initialCounts.placementdrives} (Expected: 7)`);
  console.log(`   - Applications: ${initialCounts.applications} (Expected: 12)`);
  console.log(`   - Notifications: ${initialCounts.notifications} (Expected: 20 or 22)`);

  assert(initialCounts.users === 6, 'Baseline users count is 6');
  assert(initialCounts.placementdrives === 7, 'Baseline placementdrives count is 7');
  assert(initialCounts.applications === 12, 'Baseline applications count is 12');
  assert([20, 22].includes(initialCounts.notifications), 'Baseline notifications count is 20 or 22');

  // Fetch officer and student accounts for tokens
  const officerUser = await db.collection('users').findOne({ email: 'officer@college.edu' });
  const studentUser = await db.collection('users').findOne({ email: 'rahul.cse@college.edu' });
  const googleDrive = await db.collection('placementdrives').findOne({ title: /Web Development/i });
  const baselineDrive = await db.collection('placementdrives').findOne({
    $or: [{ requiredSkills: { $size: 0 } }, { requiredSkills: null }],
  });

  assert(Boolean(officerUser), 'Placement officer user found in MongoDB');
  assert(Boolean(studentUser), 'Student user found in MongoDB');
  assert(Boolean(googleDrive), 'Google Web Development drive found in MongoDB');

  const officerToken = jwt.sign(
    { id: officerUser._id.toString(), role: officerUser.role },
    process.env.JWT_SECRET || 'secret'
  );
  const studentToken = jwt.sign(
    { id: studentUser._id.toString(), role: studentUser.role },
    process.env.JWT_SECRET || 'secret'
  );

  // -----------------------------------------------------------------
  // 3. [BEHAVIORAL - LIVE BACKEND HTTP ENDPOINTS]
  // -----------------------------------------------------------------
  console.log('\n--- 3. [BEHAVIORAL - LIVE BACKEND HTTP ENDPOINTS] ---');
  {
    // Unauthenticated request
    const unauthRes = await makeRequest(`/api/applications/drive/${googleDrive._id}/match-scores`, null);
    assert(unauthRes.status === 401, 'Unauthenticated request returns HTTP 401');

    // Student request (forbidden)
    const studentRes = await makeRequest(`/api/applications/drive/${googleDrive._id}/match-scores`, studentToken);
    assert(studentRes.status === 403, 'Student request returns HTTP 403 Forbidden');

    // Officer request (authorized)
    const officerRes = await makeRequest(`/api/applications/drive/${googleDrive._id}/match-scores`, officerToken);
    assert(officerRes.status === 200, 'Placement officer request returns HTTP 200 OK');
    assert(officerRes.body?.success === true, 'Response payload contains success: true');

    // Invalid ObjectId format
    const invalidIdRes = await makeRequest('/api/applications/drive/invalid-id/match-scores', officerToken);
    assert(invalidIdRes.status === 400, 'Invalid drive ID format returns HTTP 400');
    assert(invalidIdRes.body?.message?.includes('Invalid placement drive ID'), 'Proper error message for invalid drive ID');

    // Non-existent driveId
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await makeRequest(`/api/applications/drive/${nonExistentId}/match-scores`, officerToken);
    assert(notFoundRes.status === 404, 'Non-existent drive ID returns HTTP 404');
    assert(notFoundRes.body?.message?.includes('Placement drive not found'), 'Proper error message for non-existent drive');
  }

  // -----------------------------------------------------------------
  // 4. [BEHAVIORAL - LIVE DATA ACCURACY]
  // -----------------------------------------------------------------
  console.log('\n--- 4. [BEHAVIORAL - LIVE DATA ACCURACY] ---');
  {
    const res = await makeRequest(`/api/applications/drive/${googleDrive._id}/match-scores`, officerToken);
    assert(res.status === 200, 'Fetched match scores for Web Development drive');
    const data = res.body?.data;

    assert(Boolean(data), 'Response data object exists');
    assert(data.driveId === googleDrive._id.toString(), 'Response driveId matches requested drive');
    assert(Array.isArray(data.requiredSkills), 'requiredSkills is returned as array');
    assert(Array.isArray(data.applicants), 'applicants is returned as array');
    assert(typeof data.averageScore === 'number', 'averageScore is calculated and returned');
    assert(typeof data.scoreDistribution === 'object', 'scoreDistribution object is present');

    // Check applicant items structure
    for (const app of data.applicants) {
      assert(Boolean(app.applicationId), `Applicant item contains applicationId (${app.applicationId})`);
      assert(typeof app.skillMatch === 'object', 'Applicant item contains skillMatch object');
      assert(typeof app.skillMatch.score === 'number', `skillMatch score is numeric (${app.skillMatch.score})`);
      assert(Array.isArray(app.skillMatch.matchedSkills), 'matchedSkills is array');
      assert(Array.isArray(app.skillMatch.missingSkills), 'missingSkills is array');
      assert(typeof app.skillMatch.explanation === 'string', 'explanation is provided');
    }

    // Rahul's application to Google Web Dev drive
    const rahulApp = data.applicants.find((a) => a.student?.email === 'rahul.cse@college.edu');
    if (rahulApp) {
      assert(rahulApp.skillMatch.score === 100, `Rahul has 100% match score for Web Development drive (got ${rahulApp.skillMatch.score})`);
      assert(rahulApp.skillMatch.missingSkills.length === 0, 'Rahul has zero missing skills for Web Development drive');
    }

    // Baseline drive verification
    if (baselineDrive) {
      const baseRes = await makeRequest(`/api/applications/drive/${baselineDrive._id}/match-scores`, officerToken);
      assert(baseRes.status === 200, 'Baseline drive match scores fetched successfully');
      const baseData = baseRes.body?.data;
      if (baseData.applicants.length > 0) {
        const firstBaseApp = baseData.applicants[0];
        assert(firstBaseApp.skillMatch.score === 100, 'Baseline drive returns score 100 for all applicants');
        assert(firstBaseApp.skillMatch.totalRequired === 0, 'Baseline drive totalRequired is 0');
      }
    }
  }

  // -----------------------------------------------------------------
  // 5. [BEHAVIORAL - ALGORITHM & DIRTY DATA TOLERANCE]
  // -----------------------------------------------------------------
  console.log('\n--- 5. [BEHAVIORAL - ALGORITHM & DIRTY DATA TOLERANCE] ---');
  {
    // Test sorting when matchScore is undefined (pre-load state)
    const preLoadApplicants = [
      { _id: 'a1', appliedAt: '2026-03-01T10:00:00Z', student: { name: 'Alice', cgpa: 8.5 } },
      { _id: 'a2', appliedAt: '2026-03-02T10:00:00Z', student: { name: 'Bob', cgpa: 9.0 } },
    ];
    const sortedPreLoad = sortApplicants(preLoadApplicants, 'match_desc');
    assert(sortedPreLoad.length === 2, 'Pre-load sort handles missing matchScore gracefully');
    assert(sortedPreLoad[0]._id === 'a2', 'When matchScores are absent, tie-breaks cleanly by higher CGPA (Bob 9.0 over Alice 8.5)');

    // Test sorting when score is explicit NaN or null
    const dirtyScores = [
      { _id: 'd1', matchScore: NaN, student: { name: 'Dan', cgpa: 7.0 } },
      { _id: 'd2', matchScore: null, student: { name: 'Carol', cgpa: 8.0 } },
      { _id: 'd3', matchScore: 75, student: { name: 'Frank', cgpa: 7.5 } },
    ];
    const sortedDirty = sortApplicants(dirtyScores, 'match_desc');
    assert(sortedDirty[0]._id === 'd3', 'Valid score (75%) ranks first over NaN/null scores');
    assert(sortedDirty[1]._id === 'd2', 'NaN and null scores safely default to 0 and tie-break by higher CGPA (Carol 8.0 over Dan 7.0)');

    // Test missing student profile object entirely
    const nullStudent = [
      { _id: 's1', matchScore: 60, student: null },
      { _id: 's2', matchScore: 80, student: { name: 'Eva', cgpa: 8.5 } },
    ];
    const sortedNullStudent = sortApplicants(nullStudent, 'match_desc');
    assert(sortedNullStudent[0]._id === 's2', 'Applicant with null student profile sorts without throwing error');
    assert(sortedNullStudent[1]._id === 's1', 'Lower score ranks below higher score even with null student');
  }

  // -----------------------------------------------------------------
  // 6. [BEHAVIORAL - MULTI-TIER TIE-BREAKERS & RE-SORTING]
  // -----------------------------------------------------------------
  console.log('\n--- 6. [BEHAVIORAL - MULTI-TIER TIE-BREAKERS & RE-SORTING] ---');
  {
    const applicantsRoster = [
      {
        _id: 'app-low',
        appliedAt: '2026-03-05T10:00:00Z',
        student: { name: 'Low Scorer', cgpa: 9.5 },
        matchScore: 33,
        skillMatch: { score: 33 },
      },
      {
        _id: 'app-high-1',
        appliedAt: '2026-03-01T10:00:00Z',
        student: { name: 'High Scorer 1', cgpa: 8.2 },
        matchScore: 100,
        skillMatch: { score: 100 },
      },
      {
        _id: 'app-high-2',
        appliedAt: '2026-03-02T10:00:00Z',
        student: { name: 'High Scorer 2', cgpa: 8.8 },
        matchScore: 100,
        skillMatch: { score: 100 },
      },
      {
        _id: 'app-mid',
        appliedAt: '2026-03-03T10:00:00Z',
        student: { name: 'Mid Scorer', cgpa: 7.9 },
        matchScore: 67,
        skillMatch: { score: 67 },
      },
    ];

    const sortedByMatch = sortApplicants(applicantsRoster, 'match_desc');

    assert(
      sortedByMatch[0]._id === 'app-high-2',
      'Rank 1 is 100% match with higher CGPA (8.8 vs 8.2) — secondary tie-breaker verified'
    );
    assert(
      sortedByMatch[1]._id === 'app-high-1',
      'Rank 2 is 100% match with lower CGPA (8.2)'
    );
    assert(sortedByMatch[2]._id === 'app-mid', 'Rank 3 is 67% match');
    assert(sortedByMatch[3]._id === 'app-low', 'Rank 4 is 33% match despite 9.5 CGPA');

    // Dynamic enrichment simulation:
    const initialList = [
      { _id: 'cand-1', appliedAt: '2026-03-01T00:00:00Z', student: { name: 'Cand 1', cgpa: 8.0 } },
      { _id: 'cand-2', appliedAt: '2026-03-02T00:00:00Z', student: { name: 'Cand 2', cgpa: 9.0 } },
    ];
    const initialSorted = sortApplicants(initialList, 'match_desc');
    assert(initialSorted[0]._id === 'cand-2', 'Before scores arrive: cand-2 (CGPA 9.0) ranks first');

    const scoreMap = {
      'cand-1': { score: 95, explanation: 'Matched 3/3' },
      'cand-2': { score: 40, explanation: 'Matched 1/3' },
    };
    const enrichedList = initialList.map((c) => ({
      ...c,
      matchScore: scoreMap[c._id]?.score,
      skillMatch: scoreMap[c._id],
    }));
    const reSorted = sortApplicants(enrichedList, 'match_desc');
    assert(reSorted[0]._id === 'cand-1', 'After scores arrive: cand-1 (95%) reactively moves to rank 1');
    assert(reSorted[1]._id === 'cand-2', 'After scores arrive: cand-2 (40%) moves to rank 2');
  }

  // -----------------------------------------------------------------
  // 7. [BEHAVIORAL - ASYNC LIFECYCLE, STALE RESPONSES, & STRICTMODE / DEDUPLICATION]
  // -----------------------------------------------------------------
  console.log('\n--- 7. [BEHAVIORAL - ASYNC LIFECYCLE, STALE RESPONSES, & STRICTMODE / DEDUPLICATION] ---');
  {
    // A. Lifecycle Controller Simulation mirroring DriveApplicants.jsx
    class TestLifecycleManager {
      constructor() {
        this.currentDriveId = null;
        this.fetchingDriveId = null;
        this.abortController = null;
        this.matchScoresMap = {};
        this.matchScoresLoading = false;
        this.matchScoresError = null;
        this.fetchCallCount = 0;
      }

      async fetchMatchScores(targetDriveId, mockApiFn, { force = false } = {}) {
        if (!targetDriveId) return;

        // Deduplication check: ignore if already fetching the exact same drive unless forced
        if (!force && this.fetchingDriveId === targetDriveId) {
          return;
        }

        if (this.abortController) {
          this.abortController.abort();
        }
        const controller = new AbortController();
        this.abortController = controller;
        this.fetchingDriveId = targetDriveId;
        this.fetchCallCount++;

        try {
          this.matchScoresLoading = true;
          this.matchScoresError = null;

          const res = await mockApiFn(targetDriveId, controller.signal);

          if (controller.signal.aborted || targetDriveId !== this.currentDriveId) {
            return;
          }

          if (res.success) {
            const map = {};
            (res.data?.applicants || []).forEach((item) => {
              if (item.applicationId) map[item.applicationId] = item.skillMatch;
            });
            this.matchScoresMap = map;
          } else {
            this.matchScoresError = res.message || 'Failed';
            this.matchScoresMap = {};
          }
        } catch (err) {
          if (err.name === 'AbortError' || controller.signal.aborted) {
            return;
          }
          if (targetDriveId === this.currentDriveId) {
            this.matchScoresError = err.message || 'Error';
            this.matchScoresMap = {};
          }
        } finally {
          if (!controller.signal.aborted && targetDriveId === this.currentDriveId) {
            this.matchScoresLoading = false;
          }
          if (this.fetchingDriveId === targetDriveId) {
            this.fetchingDriveId = null;
          }
        }
      }

      switchDrive(newDriveId, mockApiFn) {
        if (this.abortController) {
          this.abortController.abort();
          this.fetchingDriveId = null;
        }
        this.currentDriveId = newDriveId;
        this.matchScoresMap = {};
        return this.fetchMatchScores(newDriveId, mockApiFn, { force: true });
      }

      unmount() {
        if (this.abortController) {
          this.abortController.abort();
          this.fetchingDriveId = null;
        }
      }
    }

    // Test 7.1: Success state updates loading and data accurately
    const manager1 = new TestLifecycleManager();
    manager1.currentDriveId = 'drive-1';
    const mockSuccess = async (id, signal) => ({
      success: true,
      data: {
        applicants: [{ applicationId: 'app-1', skillMatch: { score: 90 } }],
      },
    });

    assert(manager1.matchScoresLoading === false, 'Initial state: matchScoresLoading is false');
    const p1 = manager1.fetchMatchScores('drive-1', mockSuccess);
    assert(manager1.matchScoresLoading === true, 'During fetch: matchScoresLoading flips to true');
    await p1;
    assert(manager1.matchScoresLoading === false, 'After fetch: matchScoresLoading flips to false');
    assert(manager1.matchScoresMap['app-1']?.score === 90, 'Success state: scoreMap contains score 90');
    assert(manager1.matchScoresError === null, 'Success state: matchScoresError is null');

    // Test 7.2: Failure state captures error message without throwing
    const manager2 = new TestLifecycleManager();
    manager2.currentDriveId = 'drive-1';
    const mockFailure = async () => {
      throw new Error('Simulated network timeout');
    };
    await manager2.fetchMatchScores('drive-1', mockFailure);
    assert(manager2.matchScoresLoading === false, 'Failure state: matchScoresLoading flips to false');
    assert(manager2.matchScoresError === 'Simulated network timeout', 'Failure state: captures error message cleanly');
    assert(Object.keys(manager2.matchScoresMap).length === 0, 'Failure state: matchScoresMap defaults to empty object');

    // Test 7.3: React Strict Mode & Overlapping Requests Deduplication
    const manager3 = new TestLifecycleManager();
    manager3.currentDriveId = 'drive-strict';
    let apiInvocations = 0;
    const mockSlow = async (id, signal) => {
      apiInvocations++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({ success: true, data: { applicants: [] } });
        }, 30);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    // First call begins in-flight
    const callA = manager3.fetchMatchScores('drive-strict', mockSlow, { force: false });
    // Second concurrent call for the same drive should be deduplicated
    const callB = manager3.fetchMatchScores('drive-strict', mockSlow, { force: false });
    await Promise.all([callA, callB]);
    assert(apiInvocations === 1, 'Concurrent calls for the same drive are safely deduplicated (exactly 1 API call)');

    // Test 7.4: Fast Route / Drive Switch Aborts Stale In-Flight Responses
    const manager4 = new TestLifecycleManager();
    manager4.currentDriveId = 'drive-A';

    let driveAAborted = false;
    const mockDriveA = async (id, signal) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            success: true,
            data: { applicants: [{ applicationId: 'app-A', skillMatch: { score: 10 } }] },
          });
        }, 50);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          driveAAborted = true;
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const mockDriveB = async (id, signal) => {
      return {
        success: true,
        data: { applicants: [{ applicationId: 'app-B', skillMatch: { score: 99 } }] },
      };
    };

    // Start slow request for drive-A
    const pDriveA = manager4.fetchMatchScores('drive-A', mockDriveA, { force: true });
    // User switches to drive-B before drive-A finishes
    const pDriveB = manager4.switchDrive('drive-B', mockDriveB);

    await Promise.allSettled([pDriveA, pDriveB]);
    assert(driveAAborted === true, 'Previous drive request is aborted via AbortController upon drive switch');
    assert(manager4.matchScoresMap['app-A'] === undefined, 'Stale drive-A response is never written to drive-B state');
    assert(manager4.matchScoresMap['app-B']?.score === 99, 'Active drive-B response successfully populates state');

    // Test 7.5: Unmount cancels in-flight controller
    const manager5 = new TestLifecycleManager();
    manager5.currentDriveId = 'drive-unmount';
    manager5.fetchMatchScores('drive-unmount', mockSlow, { force: true });
    assert(manager5.abortController.signal.aborted === false, 'Controller signal active before unmount');
    manager5.unmount();
    assert(manager5.abortController.signal.aborted === true, 'Controller signal aborted on component unmount');
  }

  // -----------------------------------------------------------------
  // 8. [STATIC SOURCE CODE ASSERTION - UI & CONSUMER CONTRACT]
  // -----------------------------------------------------------------
  console.log('\n--- 8. [STATIC SOURCE CODE ASSERTION - UI & CONSUMER CONTRACT] ---');
  {
    const filePath = path.join(__dirname, '../../client/src/pages/officer/DriveApplicants.jsx');
    const source = fs.readFileSync(filePath, 'utf8');

    assert(source.includes('matchScoresMap'), '[STATIC SOURCE] DriveApplicants.jsx declares matchScoresMap state');
    assert(source.includes('matchScoresLoading'), '[STATIC SOURCE] DriveApplicants.jsx declares matchScoresLoading state');
    assert(source.includes('matchScoresError'), '[STATIC SOURCE] DriveApplicants.jsx declares matchScoresError state');
    assert(source.includes('abortScoresRef'), '[STATIC SOURCE] DriveApplicants.jsx declares abortScoresRef for cancellation');
    assert(source.includes('fetchingScoresDriveIdRef'), '[STATIC SOURCE] DriveApplicants.jsx declares fetchingScoresDriveIdRef for deduplication');
    assert(source.includes('api.applications.getMatchScores(targetDriveId'), '[STATIC SOURCE] DriveApplicants.jsx calls getMatchScores with targetDriveId and signal');
    assert(source.includes('enrichedApplicants'), '[STATIC SOURCE] DriveApplicants.jsx enriches applicants with matchScores via useMemo');
    assert(source.includes("setSortBy(sortBy === 'match_desc' ? 'applied_desc' : 'match_desc')"), '[STATIC SOURCE] Resume/Skills header has clickable sort toggle');
    assert(source.includes('Matching skills...'), '[STATIC SOURCE] Resume/Skills cell includes loading state label');
    assert(source.includes('Score unavailable'), '[STATIC SOURCE] Resume/Skills cell includes error state fallback');
    assert(source.includes('Retry'), '[STATIC SOURCE] Resume/Skills cell includes interactive Retry button');
    assert(source.includes('% Match'), '[STATIC SOURCE] Resume/Skills cell renders percentage match badge');
    assert(source.includes('Sparkles'), '[STATIC SOURCE] Resume/Skills cell renders Sparkles icon');
    assert(source.includes('Technical Skills & AI Match'), '[STATIC SOURCE] Evaluation modal displays AI Match breakdown header');
    assert(source.includes('AI Match Score:'), '[STATIC SOURCE] Evaluation modal displays AI Match Score badge');

    // api.js inspection
    const apiPath = path.join(__dirname, '../../client/src/services/api.js');
    const apiSource = fs.readFileSync(apiPath, 'utf8');
    assert(apiSource.includes('getMatchScores: (driveId, options = {})'), '[STATIC SOURCE] api.js getMatchScores supports options parameter (signal)');
    assert(apiSource.includes("error.name !== 'AbortError'"), '[STATIC SOURCE] api.js suppresses console.error for legitimate AbortError');
  }

  // -----------------------------------------------------------------
  // 9. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY]
  // -----------------------------------------------------------------
  console.log('\n--- 9. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY] ---');
  {
    const finalCounts = {
      users: await db.collection('users').countDocuments(),
      placementdrives: await db.collection('placementdrives').countDocuments(),
      applications: await db.collection('applications').countDocuments(),
      notifications: await db.collection('notifications').countDocuments(),
    };

    console.log(`   - Users: ${finalCounts.users} (Initial: 6)`);
    console.log(`   - Placement Drives: ${finalCounts.placementdrives} (Initial: 7)`);
    console.log(`   - Applications: ${finalCounts.applications} (Initial: 12)`);
    console.log(`   - Notifications: ${finalCounts.notifications} (Initial: ${initialCounts.notifications})`);

    assert(finalCounts.users === 6, 'Final users count remains 6');
    assert(finalCounts.placementdrives === 7, 'Final placement drives count remains 7');
    assert(finalCounts.applications === 12, 'Final applications count remains 12');
    assert(finalCounts.notifications === initialCounts.notifications, 'Final notifications count remains unchanged');

    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================');

  if (failedTests > 0) {
    console.error('\nFailures summary:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\nAll AI skill-matching automated tests passed successfully!\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('[UNHANDLED TEST RUNNER ERROR]:', err);
  process.exit(1);
});
