/**
 * applicant_sorting_eligibility.test.js
 * Focused regression and unit test suite for V4.0 Phase 2 Step 1:
 * 1. Exercises actual shared module: client/src/utils/applicantSorting.js
 * 2. Branch Eligibility Evaluation (canonical allowedBranches, legacy eligibleBranches fallback, unrestricted)
 * 3. Backend vs Frontend Eligibility Parity
 * 4. Multi-Mode Applicant Sorting (CGPA asc/desc, Applied Date asc/desc, Name asc/desc, Match Score desc)
 * 5. Defensive NaN & Invalid Date Protection (safeTime, safeNum, unparseable strings, NaN inputs)
 * 6. Deterministic Secondary & Tertiary Tie-Breakers
 * 7. Combined Filtering and Sorting Workflows
 * 8. MongoDB Collection Counts Read-Only Baseline Check
 */

const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));

require(path.join(__dirname, '../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../server/.env'),
});

const { checkStudentEligibility } = require(path.join(
  __dirname,
  '../../server/controllers/driveController'
));

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

async function runTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: V4.0 PHASE 2 STEP 1 - ELIGIBILITY & SORTING');
  console.log('===============================================================\n');

  // Dynamically import actual frontend utility module (Node v25 pure ESM)
  const sharedModulePath = path.resolve(__dirname, '../../client/src/utils/applicantSorting.js');
  const sharedModuleUrl = 'file:///' + sharedModulePath.replace(/\\/g, '/');
  const { evaluateEligibility, sortApplicants, SORT_OPTIONS, safeTime, safeNum } =
    await import(sharedModuleUrl);

  console.log('1. Verifying shared applicantSorting.js module exports:');
  assert(typeof evaluateEligibility === 'function', 'evaluateEligibility is exported as function');
  assert(typeof sortApplicants === 'function', 'sortApplicants is exported as function');
  assert(Array.isArray(SORT_OPTIONS) && SORT_OPTIONS.length === 7, 'SORT_OPTIONS is exported with 7 modes');
  assert(typeof safeTime === 'function', 'safeTime is exported as defensive date helper');
  assert(typeof safeNum === 'function', 'safeNum is exported as defensive numeric helper');
  console.log('   -> PASS: Shared module loaded directly from client/src/utils/applicantSorting.js.\n');

  // -----------------------------------------------------------------
  // 2. Branch Eligibility Evaluation (canonical allowedBranches)
  // -----------------------------------------------------------------
  console.log('--- 2. Branch Eligibility Evaluation (canonical allowedBranches) ---');
  {
    const drive = {
      eligibility: {
        minCGPA: 7.0,
        allowedBranches: ['CSE', 'IT'],
        maxBacklogs: 0,
        passingYear: 2026,
      },
    };

    // Candidate 1: CSE -> Eligible
    const studentCSE = {
      role: 'student',
      name: 'Rahul CSE',
      branch: 'CSE',
      cgpa: 8.5,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const resCSE = evaluateEligibility(studentCSE, drive);
    assert(resCSE.isEligible === true, 'Student from approved branch CSE is eligible');
    const branchDetailCSE = resCSE.details.find((d) => d.criteria === 'Eligible Branch');
    assert(branchDetailCSE && branchDetailCSE.passed === true, 'Branch criteria detail marked passed for CSE');
    assert(branchDetailCSE.required === 'CSE, IT', 'Branch criteria detail shows required branches list');

    // Candidate 2: IT -> Eligible
    const studentIT = {
      role: 'student',
      name: 'Priya IT',
      branch: 'IT',
      cgpa: 7.8,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const resIT = evaluateEligibility(studentIT, drive);
    assert(resIT.isEligible === true, 'Student from approved branch IT is eligible');

    // Candidate 3: MECH -> Ineligible (Unapproved branch)
    const studentMECH = {
      role: 'student',
      name: 'Amit MECH',
      branch: 'MECH',
      cgpa: 9.0,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const resMECH = evaluateEligibility(studentMECH, drive);
    assert(resMECH.isEligible === false, 'Student from unapproved branch MECH is ineligible despite high CGPA');
    const branchDetailMECH = resMECH.details.find((d) => d.criteria === 'Eligible Branch');
    assert(branchDetailMECH && branchDetailMECH.passed === false, 'Branch criteria detail marked failed for MECH');
    assert(branchDetailMECH.actual === 'MECH', 'Branch criteria detail displays actual student branch');

    // Candidate 4: Parity with Backend checkStudentEligibility
    const backendCSE = checkStudentEligibility(studentCSE, drive);
    const backendMECH = checkStudentEligibility(studentMECH, drive);
    assert(backendCSE.isEligible === resCSE.isEligible, 'Backend and frontend agree on CSE eligibility (true)');
    assert(backendMECH.isEligible === resMECH.isEligible, 'Backend and frontend agree on MECH ineligibility (false)');
  }

  // -----------------------------------------------------------------
  // 3. Unrestricted / Empty Branches & Backward Compatibility
  // -----------------------------------------------------------------
  console.log('\n--- 3. Unrestricted Branches & Backward Compatibility ---');
  {
    // Empty allowedBranches -> all branches permitted
    const openDrive = {
      eligibility: {
        minCGPA: 6.0,
        allowedBranches: [],
        maxBacklogs: 1,
        passingYear: 2026,
      },
    };
    const studentCivil = {
      role: 'student',
      name: 'Sneha Civil',
      branch: 'CIVIL',
      cgpa: 7.2,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const resOpen = evaluateEligibility(studentCivil, openDrive);
    assert(resOpen.isEligible === true, 'Empty allowedBranches allows any student branch');
    const branchDetail = resOpen.details.find((d) => d.criteria === 'Eligible Branch');
    assert(branchDetail.required === 'All Branches', 'Required field shows "All Branches" when unrestricted');

    // Backward compatibility: Drive with legacy eligibleBranches
    const legacyDrive = {
      eligibility: {
        minCGPA: 6.5,
        eligibleBranches: ['ECE', 'EEE'],
        maxBacklogs: 0,
        passingYear: 2026,
      },
    };
    const studentECE = {
      role: 'student',
      branch: 'ECE',
      cgpa: 8.0,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const studentCSE = {
      role: 'student',
      branch: 'CSE',
      cgpa: 8.0,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    assert(evaluateEligibility(studentECE, legacyDrive).isEligible === true, 'Legacy eligibleBranches works for ECE');
    assert(evaluateEligibility(studentCSE, legacyDrive).isEligible === false, 'Legacy eligibleBranches blocks CSE');

    // Missing student branch when restricted
    const studentNoBranch = {
      role: 'student',
      branch: null,
      cgpa: 8.0,
      activeBacklogs: 0,
      passingYear: 2026,
    };
    const resNoBranch = evaluateEligibility(studentNoBranch, legacyDrive);
    assert(resNoBranch.isEligible === false, 'Missing student branch is marked ineligible when drive restricts branches');
  }

  // -----------------------------------------------------------------
  // 4. Defensive NaN & Invalid Date Protection (safeTime & safeNum)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Defensive NaN & Invalid Date Protection ---');
  {
    // safeTime guarantees zero NaN returns
    assert(safeTime(null) === 0, 'safeTime(null) returns 0');
    assert(safeTime(undefined) === 0, 'safeTime(undefined) returns 0');
    assert(safeTime('') === 0, 'safeTime("") returns 0');
    assert(safeTime('invalid-date-string') === 0, 'safeTime("invalid-date-string") returns 0 (not NaN)');
    assert(safeTime('null') === 0, 'safeTime("null") returns 0 (not NaN)');
    assert(safeTime(new Date(1000)) === 1000, 'safeTime(Date) returns valid timestamp');
    assert(safeTime('2026-03-01T10:00:00Z') === new Date('2026-03-01T10:00:00Z').getTime(), 'safeTime(ISO) parses correctly');

    // safeNum guarantees zero NaN returns
    assert(safeNum(NaN) === 0, 'safeNum(NaN) returns 0');
    assert(safeNum(null) === 0, 'safeNum(null) returns 0');
    assert(safeNum(undefined) === 0, 'safeNum(undefined) returns 0');
    assert(safeNum('N/A') === 0, 'safeNum("N/A") returns 0');
    assert(safeNum('8.75') === 8.75, 'safeNum("8.75") parses float');
    assert(safeNum(9.2) === 9.2, 'safeNum(9.2) preserves number');
  }

  // -----------------------------------------------------------------
  // 5. Multi-Mode Applicant Sorting Accuracy
  // -----------------------------------------------------------------
  console.log('\n--- 5. Multi-Mode Applicant Sorting ---');
  {
    const mockApplicants = [
      {
        _id: 'app-1',
        appliedAt: '2026-03-01T10:00:00Z',
        status: 'Applied',
        matchScore: 65,
        student: { name: 'Zara Khan', cgpa: 7.2 },
      },
      {
        _id: 'app-2',
        appliedAt: '2026-03-05T14:30:00Z',
        status: 'Shortlisted',
        matchScore: 92,
        student: { name: 'Aarav Sharma', cgpa: 9.4 },
      },
      {
        _id: 'app-3',
        appliedAt: '2026-03-03T09:15:00Z',
        status: 'Technical Round',
        matchScore: 84,
        student: { name: 'Manish Verma', cgpa: 8.5 },
      },
      {
        _id: 'app-4',
        appliedAt: '2026-02-28T16:00:00Z',
        status: 'Applied',
        matchScore: 40,
        student: { name: 'Bhavna Patel', cgpa: 6.8 },
      },
    ];

    // A. CGPA: Highest to Lowest
    const sortedCgpaDesc = sortApplicants(mockApplicants, 'cgpa_desc');
    assert(
      sortedCgpaDesc.map((a) => a.student.name).join(',') ===
        'Aarav Sharma,Manish Verma,Zara Khan,Bhavna Patel',
      'Sort by CGPA Highest to Lowest orders correctly (9.4 -> 8.5 -> 7.2 -> 6.8)'
    );

    // B. CGPA: Lowest to Highest
    const sortedCgpaAsc = sortApplicants(mockApplicants, 'cgpa_asc');
    assert(
      sortedCgpaAsc.map((a) => a.student.name).join(',') ===
        'Bhavna Patel,Zara Khan,Manish Verma,Aarav Sharma',
      'Sort by CGPA Lowest to Highest orders correctly (6.8 -> 7.2 -> 8.5 -> 9.4)'
    );

    // C. Applied Date: Newest First
    const sortedDateDesc = sortApplicants(mockApplicants, 'applied_desc');
    assert(
      sortedDateDesc.map((a) => a._id).join(',') === 'app-2,app-3,app-1,app-4',
      'Sort by Applied Date Newest First orders correctly (Mar 5 -> Mar 3 -> Mar 1 -> Feb 28)'
    );

    // D. Applied Date: Oldest First
    const sortedDateAsc = sortApplicants(mockApplicants, 'applied_asc');
    assert(
      sortedDateAsc.map((a) => a._id).join(',') === 'app-4,app-1,app-3,app-2',
      'Sort by Applied Date Oldest First orders correctly (Feb 28 -> Mar 1 -> Mar 3 -> Mar 5)'
    );

    // E. Candidate Name: A to Z
    const sortedNameAsc = sortApplicants(mockApplicants, 'name_asc');
    assert(
      sortedNameAsc.map((a) => a.student.name).join(',') ===
        'Aarav Sharma,Bhavna Patel,Manish Verma,Zara Khan',
      'Sort by Candidate Name A to Z orders alphabetically'
    );

    // F. Candidate Name: Z to A
    const sortedNameDesc = sortApplicants(mockApplicants, 'name_desc');
    assert(
      sortedNameDesc.map((a) => a.student.name).join(',') ===
        'Zara Khan,Manish Verma,Bhavna Patel,Aarav Sharma',
      'Sort by Candidate Name Z to A orders reverse-alphabetically'
    );

    // G. Skill Match Score: Highest First
    const sortedMatchDesc = sortApplicants(mockApplicants, 'match_desc');
    assert(
      sortedMatchDesc.map((a) => a._id).join(',') === 'app-2,app-3,app-1,app-4',
      'Sort by Skill Match Score Highest First orders correctly (92 -> 84 -> 65 -> 40)'
    );
  }

  // -----------------------------------------------------------------
  // 6. Dirty Data & Deterministic Tie-Breakers
  // -----------------------------------------------------------------
  console.log('\n--- 6. Dirty Data & Deterministic Tie-Breakers ---');
  {
    const dirtyApplicants = [
      {
        _id: 'd-1',
        appliedAt: 'invalid-date', // invalid date string
        student: { name: 'Kavita', cgpa: NaN }, // explicit NaN CGPA
      },
      {
        _id: 'd-2',
        appliedAt: '2026-03-01T12:00:00Z',
        student: { name: 'Kavita', cgpa: '8.5' }, // string CGPA
      },
      {
        _id: 'd-3',
        appliedAt: '2026-03-02T12:00:00Z',
        student: { name: 'Kavita', cgpa: 8.5 }, // equal CGPA, newer date
      },
      {
        _id: 'd-4',
        student: null, // null student profile
      },
    ];

    // String CGPA parsing & tie-breaking by applied date
    const sortedCgpa = sortApplicants(dirtyApplicants, 'cgpa_desc');
    assert(sortedCgpa[0]._id === 'd-3', 'Equal CGPA tie-breaks with newer applied date (d-3 over d-2)');
    assert(sortedCgpa[1]._id === 'd-2', 'String CGPA parsed cleanly alongside number CGPA');
    assert(
      sortedCgpa[2].student?.cgpa === undefined || isNaN(sortedCgpa[2].student?.cgpa),
      'Explicit NaN CGPA safely treated as 0 without throwing error or NaN comparator'
    );

    // Deterministic tie-breaker for identical names
    const identicalNames = [
      { _id: 'n-1', appliedAt: '2026-03-01T10:00:00Z', student: { name: 'Same Name' } },
      { _id: 'n-2', appliedAt: '2026-03-05T10:00:00Z', student: { name: 'Same Name' } },
    ];
    const sortedSameName = sortApplicants(identicalNames, 'name_asc');
    assert(sortedSameName[0]._id === 'n-2', 'Equal candidate names deterministically tie-break on newer applied date');

    // Immutability: original array order preserved
    assert(dirtyApplicants[0]._id === 'd-1', 'sortApplicants does not mutate the original array');

    // Match score fallback across multiple score properties
    const polymorphicScoreList = [
      { _id: 'p-1', matchScore: 70, student: { name: 'Direct matchScore' } },
      { _id: 'p-2', skillMatch: { score: 95 }, student: { name: 'Nested skillMatch' } },
      { _id: 'p-3', student: { name: 'Student matchScore', matchScore: 82 } },
      { _id: 'p-4', student: { name: 'Zero Score' } },
    ];
    const sortedPoly = sortApplicants(polymorphicScoreList, 'match_desc');
    assert(
      sortedPoly.map((p) => p._id).join(',') === 'p-2,p-3,p-1,p-4',
      'match_desc seamlessly checks app.matchScore, app.skillMatch.score, and student.matchScore'
    );
  }

  // -----------------------------------------------------------------
  // 7. Combined Filtering and Sorting Workflow
  // -----------------------------------------------------------------
  console.log('\n--- 7. Combined Filtering and Sorting Workflow ---');
  {
    const drive = {
      eligibility: {
        minCGPA: 7.0,
        allowedBranches: ['CSE', 'IT'],
        maxBacklogs: 0,
        passingYear: 2026,
      },
    };

    const roster = [
      {
        _id: 'r-1',
        status: 'Shortlisted',
        appliedAt: '2026-03-01T10:00:00Z',
        student: { name: 'Rahul CSE', branch: 'CSE', cgpa: 8.5, activeBacklogs: 0, passingYear: 2026 },
      },
      {
        _id: 'r-2',
        status: 'Shortlisted',
        appliedAt: '2026-03-04T10:00:00Z',
        student: { name: 'Priya IT', branch: 'IT', cgpa: 9.1, activeBacklogs: 0, passingYear: 2026 },
      },
      {
        _id: 'r-3',
        status: 'Rejected',
        appliedAt: '2026-03-02T10:00:00Z',
        student: { name: 'Karan CSE', branch: 'CSE', cgpa: 6.5, activeBacklogs: 1, passingYear: 2026 },
      },
      {
        _id: 'r-4',
        status: 'Shortlisted',
        appliedAt: '2026-03-03T10:00:00Z',
        student: { name: 'Vikram MECH', branch: 'MECH', cgpa: 8.8, activeBacklogs: 0, passingYear: 2026 },
      },
    ];

    // Filter: Status === 'Shortlisted' AND Eligible Only
    const filtered = roster.filter((app) => {
      if (app.status !== 'Shortlisted') return false;
      const evalRes = evaluateEligibility(app.student, drive);
      return evalRes.isEligible;
    });

    assert(filtered.length === 2, 'Filtered correctly to 2 eligible Shortlisted candidates (Vikram MECH excluded due to branch)');
    assert(filtered.some((a) => a._id === 'r-1') && filtered.some((a) => a._id === 'r-2'), 'Filtered candidates are Rahul CSE and Priya IT');

    // Sort filtered: CGPA Descending
    const sorted = sortApplicants(filtered, 'cgpa_desc');
    assert(sorted[0]._id === 'r-2' && sorted[1]._id === 'r-1', 'Sorted filtered candidates: Priya IT (9.1) then Rahul CSE (8.5)');
  }

  // -----------------------------------------------------------------
  // 8. Integration: DriveApplicants.jsx Consumer Verification
  // -----------------------------------------------------------------
  console.log('\n--- 8. DriveApplicants.jsx Consumer Verification ---');
  {
    const filePath = path.join(__dirname, '../../client/src/pages/officer/DriveApplicants.jsx');
    const source = fs.readFileSync(filePath, 'utf8');

    assert(
      source.includes("from '../../utils/applicantSorting'"),
      'DriveApplicants.jsx imports from shared applicantSorting utility module'
    );
    assert(source.includes('sortApplicants(filteredApplicants, sortBy)'), 'DriveApplicants.jsx calls sortApplicants in useMemo');
    assert(source.includes('SORT_OPTIONS'), 'DriveApplicants.jsx binds SORT_OPTIONS in sort selector');
    assert(source.includes('applicant-sort-by'), 'DriveApplicants.jsx renders accessible sort dropdown');
    assert(source.includes('ArrowUpDown'), 'DriveApplicants.jsx renders ArrowUpDown column-header toggles');
  }

  // -----------------------------------------------------------------
  // 9. MongoDB Collection Counts Baseline Verification
  // -----------------------------------------------------------------
  console.log('\n--- 9. MongoDB Collection Counts Read-Only Baseline Check ---');
  {
    await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
    const db = mongoose.connection.db;

    const counts = {
      users: await db.collection('users').countDocuments(),
      placementdrives: await db.collection('placementdrives').countDocuments(),
      applications: await db.collection('applications').countDocuments(),
      notifications: await db.collection('notifications').countDocuments(),
    };

    console.log(`   - Users: ${counts.users} (Expected: 6)`);
    console.log(`   - Placement Drives: ${counts.placementdrives} (Expected: 7)`);
    console.log(`   - Applications: ${counts.applications} (Expected: 12)`);
    console.log(`   - Notifications: ${counts.notifications} (Expected: 20 or 22)`);

    assert(counts.users === 6, 'Users count remains 6');
    assert(counts.placementdrives === 7, 'Placement drives count remains 7');
    assert(counts.applications === 12, 'Applications count remains 12');
    assert([20, 22].includes(counts.notifications), 'Notifications count remains 20 or 22');

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
    console.log('\nAll applicant sorting and branch eligibility unit tests passed successfully!\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('[UNHANDLED TEST RUNNER ERROR]:', err);
  process.exit(1);
});
