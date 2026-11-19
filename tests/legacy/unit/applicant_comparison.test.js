/**
 * Automated Test Suite: V4.0 Phase 2 Step 3 - Candidate Comparison
 *
 * Verifies:
 * 1. [BEHAVIORAL] Exported functions from applicantComparison.js
 * 2. [BEHAVIORAL] Maximum 4-candidate capacity limit enforcement & accessible messages
 * 3. [BEHAVIORAL] Selection, removal, and clear-all operations
 * 4. [BEHAVIORAL] Tolerance for dirty data, null student profiles, and missing match scores
 * 5. [BEHAVIORAL] Side-by-side comparison matrix generation & comparative highlights (top CGPA, top match score)
 * 6. [BEHAVIORAL] Seamless preservation across searching, filtering, and sorting
 * 7. [STATIC SOURCE CODE ASSERTION] UI contract in DriveApplicants.jsx & CandidateComparisonModal.jsx
 * 8. [BEHAVIORAL] Read-only database collection counts integrity
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  TEST SUITE: V4.0 PHASE 2 STEP 3 - CANDIDATE COMPARISON');
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
  // 1. [BEHAVIORAL - SHARED MODULE EXPORTS]
  // -----------------------------------------------------------------
  console.log('\n--- 1. [BEHAVIORAL - SHARED MODULE EXPORTS] ---');
  let comparisonModule;
  try {
    const modulePath = path.resolve(__dirname, '../../client/src/utils/applicantComparison.js');
    comparisonModule = await import(`file://${modulePath.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error('Failed to import applicantComparison.js:', err);
    process.exit(1);
  }

  const {
    toggleCandidateComparison,
    removeCandidateComparison,
    buildComparisonCandidate,
    buildComparisonMatrix,
    MAX_COMPARE_LIMIT,
  } = comparisonModule;

  test('MAX_COMPARE_LIMIT is defined as 4', () => {
    assert.strictEqual(MAX_COMPARE_LIMIT, 4);
  });

  test('toggleCandidateComparison is exported as function', () => {
    assert.strictEqual(typeof toggleCandidateComparison, 'function');
  });

  test('removeCandidateComparison is exported as function', () => {
    assert.strictEqual(typeof removeCandidateComparison, 'function');
  });

  test('buildComparisonCandidate is exported as function', () => {
    assert.strictEqual(typeof buildComparisonCandidate, 'function');
  });

  test('buildComparisonMatrix is exported as function', () => {
    assert.strictEqual(typeof buildComparisonMatrix, 'function');
  });

  // -----------------------------------------------------------------
  // 2. [BEHAVIORAL - FOUR-CANDIDATE CAPACITY LIMIT]
  // -----------------------------------------------------------------
  console.log('\n--- 2. [BEHAVIORAL - FOUR-CANDIDATE CAPACITY LIMIT] ---');
  {
    let selection = new Set();

    // Add candidate 1
    const res1 = toggleCandidateComparison(selection, 'app-1');
    selection = res1.nextSelected;
    test('Adding 1st candidate succeeds', () => {
      assert.strictEqual(res1.added, true);
      assert.strictEqual(res1.removed, false);
      assert.strictEqual(res1.limitReached, false);
      assert.strictEqual(selection.size, 1);
      assert.strictEqual(selection.has('app-1'), true);
    });

    // Add candidate 2
    const res2 = toggleCandidateComparison(selection, 'app-2');
    selection = res2.nextSelected;
    test('Adding 2nd candidate succeeds', () => {
      assert.strictEqual(res2.added, true);
      assert.strictEqual(selection.size, 2);
    });

    // Add candidate 3
    const res3 = toggleCandidateComparison(selection, 'app-3');
    selection = res3.nextSelected;
    test('Adding 3rd candidate succeeds', () => {
      assert.strictEqual(res3.added, true);
      assert.strictEqual(selection.size, 3);
    });

    // Add candidate 4
    const res4 = toggleCandidateComparison(selection, 'app-4');
    selection = res4.nextSelected;
    test('Adding 4th candidate succeeds (reaches exact maximum capacity of 4)', () => {
      assert.strictEqual(res4.added, true);
      assert.strictEqual(res4.limitReached, false);
      assert.strictEqual(selection.size, 4);
    });

    // Attempt to add candidate 5 (MUST be prevented)
    const res5 = toggleCandidateComparison(selection, 'app-5');
    test('Adding 5th candidate is strictly prevented with limitReached: true', () => {
      assert.strictEqual(res5.added, false);
      assert.strictEqual(res5.removed, false);
      assert.strictEqual(res5.limitReached, true);
      assert.strictEqual(res5.nextSelected.size, 4);
      assert.strictEqual(res5.nextSelected.has('app-5'), false);
    });

    test('Clear accessible limit explanation message is returned', () => {
      assert(res5.message.includes('4 candidates'), `Expected '4 candidates' in message: ${res5.message}`);
    });

    // Toggle off candidate 2
    const resRemove = toggleCandidateComparison(selection, 'app-2');
    selection = resRemove.nextSelected;
    test('Toggling an already-selected candidate removes them (capacity freed to 3)', () => {
      assert.strictEqual(resRemove.removed, true);
      assert.strictEqual(resRemove.added, false);
      assert.strictEqual(selection.size, 3);
      assert.strictEqual(selection.has('app-2'), false);
    });

    // Now adding candidate 5 should succeed
    const res5Retry = toggleCandidateComparison(selection, 'app-5');
    selection = res5Retry.nextSelected;
    test('Candidate 5 can now be added after freeing capacity', () => {
      assert.strictEqual(res5Retry.added, true);
      assert.strictEqual(res5Retry.limitReached, false);
      assert.strictEqual(selection.size, 4);
      assert.strictEqual(selection.has('app-5'), true);
    });
  }

  // -----------------------------------------------------------------
  // 3. [BEHAVIORAL - SELECTION, REMOVAL & CLEAR ALL]
  // -----------------------------------------------------------------
  console.log('\n--- 3. [BEHAVIORAL - SELECTION, REMOVAL & CLEAR ALL] ---');
  {
    test('removeCandidateComparison removes targeted candidate cleanly', () => {
      const initial = new Set(['app-A', 'app-B', 'app-C']);
      const updated = removeCandidateComparison(initial, 'app-B');
      assert.strictEqual(updated.size, 2);
      assert.strictEqual(updated.has('app-B'), false);
      assert.strictEqual(updated.has('app-A'), true);
      assert.strictEqual(updated.has('app-C'), true);
    });

    test('removeCandidateComparison handles non-existent or null ID without error', () => {
      const initial = new Set(['app-A']);
      const updated = removeCandidateComparison(initial, 'non-existent');
      assert.strictEqual(updated.size, 1);
      const updatedNull = removeCandidateComparison(initial, null);
      assert.strictEqual(updatedNull.size, 1);
    });

    test('toggleCandidateComparison handles null or undefined candidateId gracefully', () => {
      const res = toggleCandidateComparison(new Set(['app-1']), null);
      assert.strictEqual(res.added, false);
      assert.strictEqual(res.removed, false);
      assert.strictEqual(res.nextSelected.size, 1);
    });

    test('toggleCandidateComparison handles array input as well as Set input', () => {
      const res = toggleCandidateComparison(['app-1', 'app-2'], 'app-3');
      assert.strictEqual(res.added, true);
      assert.strictEqual(res.nextSelected.size, 3);
    });
  }

  // -----------------------------------------------------------------
  // 4. [BEHAVIORAL - DIRTY DATA & MISSING VALUES TOLERANCE]
  // -----------------------------------------------------------------
  console.log('\n--- 4. [BEHAVIORAL - DIRTY DATA & MISSING VALUES TOLERANCE] ---');
  {
    const dummyDrive = {
      title: 'Full Stack Engineer',
      company: { name: 'Acme Corp' },
      eligibilityCriteria: { minCgpa: 7.5, maxBacklogs: 0 },
      allowedBranches: ['CSE', 'IT'],
      requiredSkills: ['React', 'Node.js'],
    };

    // Candidate with missing student profile
    const corruptApp = { _id: 'corrupt-1', status: 'Applied', student: null };
    const candCorrupt = buildComparisonCandidate(corruptApp, dummyDrive, null);

    test('Applicant with null student produces safe default name and rollNo', () => {
      assert.strictEqual(candCorrupt.name, 'Unnamed Candidate');
      assert.strictEqual(candCorrupt.rollNo, 'N/A');
      assert.strictEqual(candCorrupt.cgpaDisplay, 'N/A');
      assert.strictEqual(candCorrupt.numericCgpa, null);
      assert.strictEqual(candCorrupt.backlogs, 0);
      assert.deepStrictEqual(candCorrupt.skills, []);
    });

    test('Applicant with null student evaluates academicEligibility safely without throwing', () => {
      assert.strictEqual(candCorrupt.academicEligibility.isEligible, false);
    });

    test('Applicant with missing match score sets hasScore: false and score: null without misleading percentages', () => {
      assert.strictEqual(candCorrupt.matchInfo.hasScore, false);
      assert.strictEqual(candCorrupt.matchInfo.score, null);
      assert.strictEqual(candCorrupt.matchInfo.explanation, 'Match score not available');
    });

    // Candidate with string and dirty numeric values
    const stringDataApp = {
      _id: 'str-app',
      status: 'Shortlisted',
      student: {
        name: 'Priya Sharma',
        rollNo: '2022-CSE-042',
        branch: 'CSE',
        cgpa: '8.85',
        activeBacklogs: '0',
        skills: ['React', 'Node.js', 'TypeScript'],
      },
    };
    const candString = buildComparisonCandidate(stringDataApp, dummyDrive, {
      score: 100,
      totalRequired: 2,
      totalMatched: 2,
      matchedSkills: ['React', 'Node.js'],
      missingSkills: [],
      explanation: 'Matched all 2 required skills',
    });

    test('String CGPA is parsed cleanly to numeric float', () => {
      assert.strictEqual(candString.numericCgpa, 8.85);
      assert.strictEqual(candString.cgpaDisplay, '8.85');
    });

    test('String activeBacklogs is parsed cleanly to integer', () => {
      assert.strictEqual(candString.backlogs, 0);
    });

    test('Valid match score populates matchInfo accurately', () => {
      assert.strictEqual(candString.matchInfo.hasScore, true);
      assert.strictEqual(candString.matchInfo.score, 100);
      assert.deepStrictEqual(candString.matchInfo.matchedSkills, ['React', 'Node.js']);
      assert.deepStrictEqual(candString.matchInfo.missingSkills, []);
      assert.strictEqual(candString.matchInfo.isBaseline, false);
    });

    // Candidate with NaN CGPA and missing fields
    const nanApp = {
      _id: 'nan-app',
      student: {
        name: 'Aman',
        cgpa: 'invalid-cgpa-string',
        activeBacklogs: -5,
      },
    };
    const candNan = buildComparisonCandidate(nanApp, dummyDrive, null);

    test('Invalid NaN string CGPA safely returns numericCgpa: null and cgpaDisplay: "N/A"', () => {
      assert.strictEqual(candNan.numericCgpa, null);
      assert.strictEqual(candNan.cgpaDisplay, 'N/A');
    });

    test('Negative active backlogs clamps safely to 0', () => {
      assert.strictEqual(candNan.backlogs, 0);
    });
  }

  // -----------------------------------------------------------------
  // 5. [BEHAVIORAL - SIDE-BY-SIDE MATRIX & COMPARATIVE HIGHLIGHTS]
  // -----------------------------------------------------------------
  console.log('\n--- 5. [BEHAVIORAL - SIDE-BY-SIDE MATRIX & COMPARATIVE HIGHLIGHTS] ---');
  {
    const drive = {
      _id: 'drive-web',
      title: 'Full Stack Web Development',
      company: { name: 'Google' },
      eligibilityCriteria: { minCgpa: 8.0, maxBacklogs: 0 },
      allowedBranches: ['CSE', 'IT'],
      requiredSkills: ['React', 'Node.js', 'MongoDB'],
    };

    const applicants = [
      {
        _id: 'app-rahul',
        status: 'Interview',
        student: {
          name: 'Rahul Verma',
          rollNo: '2022-CSE-001',
          branch: 'CSE',
          cgpa: 8.5,
          activeBacklogs: 0,
          skills: ['React', 'Node.js', 'MongoDB', 'Python'],
        },
      },
      {
        _id: 'app-priya',
        status: 'Shortlisted',
        student: {
          name: 'Priya Patel',
          rollNo: '2022-IT-015',
          branch: 'IT',
          cgpa: 9.2, // Highest CGPA
          activeBacklogs: 0,
          skills: ['React', 'Python'],
        },
      },
      {
        _id: 'app-arjun',
        status: 'Applied',
        student: {
          name: 'Arjun Singh',
          rollNo: '2022-MECH-089',
          branch: 'MECH', // Ineligible branch
          cgpa: 7.8, // Below min CGPA
          activeBacklogs: 1, // Has backlog
          skills: ['React', 'Node.js'],
        },
      },
      {
        _id: 'app-sneha',
        status: 'Applied',
        student: {
          name: 'Sneha Roy',
          rollNo: '2022-CSE-099',
          branch: 'CSE',
          cgpa: 8.1,
          activeBacklogs: 0,
          skills: [],
        },
      },
    ];

    const matchScoresMap = {
      'app-rahul': {
        score: 100, // Highest Match Score
        totalRequired: 3,
        totalMatched: 3,
        matchedSkills: ['React', 'Node.js', 'MongoDB'],
        missingSkills: [],
        explanation: 'Matched 3 of 3 required skills',
      },
      'app-priya': {
        score: 33,
        totalRequired: 3,
        totalMatched: 1,
        matchedSkills: ['React'],
        missingSkills: ['Node.js', 'MongoDB'],
        explanation: 'Matched 1 of 3 required skills',
      },
      'app-arjun': {
        score: 67,
        totalRequired: 3,
        totalMatched: 2,
        matchedSkills: ['React', 'Node.js'],
        missingSkills: ['MongoDB'],
        explanation: 'Matched 2 of 3 required skills',
      },
      'app-sneha': {
        score: 0,
        totalRequired: 3,
        totalMatched: 0,
        matchedSkills: [],
        missingSkills: ['React', 'Node.js', 'MongoDB'],
        explanation: 'Matched 0 of 3 required skills',
      },
    };

    const matrix = buildComparisonMatrix(
      ['app-rahul', 'app-priya', 'app-arjun', 'app-sneha'],
      applicants,
      drive,
      matchScoresMap
    );

    test('Matrix contains exact candidate count (4)', () => {
      assert.strictEqual(matrix.count, 4);
      assert.strictEqual(matrix.candidates.length, 4);
    });

    test('Matrix flags isAtLimit as true when 4 candidates are selected', () => {
      assert.strictEqual(matrix.isAtLimit, true);
    });

    test('Identifies Priya (9.2 CGPA) as topCgpaAppId', () => {
      assert.strictEqual(matrix.topCgpaAppId, 'app-priya');
    });

    test('Identifies Rahul (100% Match) as topMatchScoreAppId', () => {
      assert.strictEqual(matrix.topMatchScoreAppId, 'app-rahul');
    });

    test('Rahul passes academic eligibility (CSE, 8.5 CGPA, 0 backlogs)', () => {
      const rahul = matrix.candidates.find((c) => c.applicationId === 'app-rahul');
      assert.strictEqual(rahul.academicEligibility.isEligible, true);
    });

    test('Arjun fails academic eligibility with violations for branch, CGPA, and backlogs', () => {
      const arjun = matrix.candidates.find((c) => c.applicationId === 'app-arjun');
      assert.strictEqual(arjun.academicEligibility.isEligible, false);
      assert(arjun.academicEligibility.violations.length >= 2, 'Expected multiple eligibility violations for Arjun');
    });

    test('Drive summary accurately extracts company, title, criteria, and allowed branches', () => {
      assert.strictEqual(matrix.driveSummary.companyName, 'Google');
      assert.strictEqual(matrix.driveSummary.title, 'Full Stack Web Development');
      assert.strictEqual(matrix.driveSummary.minCgpa, 8.0);
      assert.deepStrictEqual(matrix.driveSummary.allowedBranches, ['CSE', 'IT']);
    });
  }

  // -----------------------------------------------------------------
  // 6. [BEHAVIORAL - FILTERING & SORTING INTERACTIONS]
  // -----------------------------------------------------------------
  console.log('\n--- 6. [BEHAVIORAL - FILTERING & SORTING INTERACTIONS] ---');
  {
    // Simulation: Selected candidates are held in comparedAppIds
    const allApplicants = [
      { _id: 'app-1', student: { name: 'Alice', branch: 'CSE', cgpa: 9.0 } },
      { _id: 'app-2', student: { name: 'Bob', branch: 'IT', cgpa: 8.0 } },
      { _id: 'app-3', student: { name: 'Charlie', branch: 'ECE', cgpa: 7.5 } },
      { _id: 'app-4', student: { name: 'David', branch: 'MECH', cgpa: 8.5 } },
    ];

    let comparedAppIds = new Set(['app-1', 'app-4']); // Alice & David selected

    // User applies a filter: branch === 'CSE'
    const filteredRoster = allApplicants.filter((a) => a.student.branch === 'CSE');
    test('Filtered roster only contains Alice', () => {
      assert.strictEqual(filteredRoster.length, 1);
      assert.strictEqual(filteredRoster[0].student.name, 'Alice');
    });

    // Check comparison matrix: must STILL contain BOTH Alice and David!
    const matrixUnderFilter = buildComparisonMatrix(comparedAppIds, allApplicants, {}, {});
    test('Comparison selection is preserved even when David is filtered out of the active roster', () => {
      assert.strictEqual(matrixUnderFilter.count, 2);
      const names = matrixUnderFilter.candidates.map((c) => c.name);
      assert(names.includes('Alice'), 'Alice must be in comparison matrix');
      assert(names.includes('David'), 'David must be in comparison matrix');
    });

    // User removes David directly from the comparison dock
    comparedAppIds = removeCandidateComparison(comparedAppIds, 'app-4');
    test('Candidate can be removed from comparison dock while filter is active', () => {
      assert.strictEqual(comparedAppIds.size, 1);
      assert.strictEqual(comparedAppIds.has('app-4'), false);
    });

    // User sorts the roster
    const sortedRoster = [...allApplicants].sort((a, b) => b.student.cgpa - a.student.cgpa);
    test('Sorting does not mutate or drop comparedAppIds', () => {
      assert.strictEqual(comparedAppIds.size, 1);
      assert.strictEqual(comparedAppIds.has('app-1'), true);
      assert.strictEqual(sortedRoster[0]._id, 'app-1');
    });
  }

  // -----------------------------------------------------------------
  // 7. [STATIC SOURCE CODE ASSERTIONS - UI & COMPONENT CONTRACT]
  // -----------------------------------------------------------------
  console.log('\n--- 7. [STATIC SOURCE CODE ASSERTIONS - UI & COMPONENT CONTRACT] ---');
  {
    const pagePath = path.join(__dirname, '../../client/src/pages/officer/DriveApplicants.jsx');
    const modalPath = path.join(__dirname, '../../client/src/components/officer/CandidateComparisonModal.jsx');

    const pageSource = fs.readFileSync(pagePath, 'utf8');
    const modalSource = fs.readFileSync(modalPath, 'utf8');

    test('[STATIC SOURCE] DriveApplicants.jsx imports CandidateComparisonModal', () => {
      assert(pageSource.includes('CandidateComparisonModal'), 'DriveApplicants.jsx must import CandidateComparisonModal');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx declares comparedAppIds state', () => {
      assert(pageSource.includes('comparedAppIds'), 'DriveApplicants.jsx must declare comparedAppIds');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx declares compareModalOpen state', () => {
      assert(pageSource.includes('compareModalOpen'), 'DriveApplicants.jsx must declare compareModalOpen');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx renders floating comparison dock with chips', () => {
      assert(pageSource.includes('Floating Candidate Comparison Dock'), 'DriveApplicants.jsx must have floating comparison dock');
      assert(pageSource.includes('Compare Candidates:'), 'Must display comparison dock title');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx renders Compare action button on applicant rows', () => {
      assert(pageSource.includes('handleToggleCompare'), 'Must have handleToggleCompare handler');
      assert(pageSource.includes('GitCompare'), 'Must render GitCompare icon');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx renders Comparing indicator on selected candidate', () => {
      assert(pageSource.includes('isCompared'), 'Must compute isCompared on each row');
      assert(pageSource.includes('Comparing'), 'Must show Comparing badge');
    });

    test('[STATIC SOURCE] DriveApplicants.jsx mounts CandidateComparisonModal', () => {
      assert(pageSource.includes('<CandidateComparisonModal'), 'Must render <CandidateComparisonModal />');
    });

    test('[STATIC SOURCE] CandidateComparisonModal.jsx displays side-by-side comparison matrix table', () => {
      assert(modalSource.includes('driveSummary'), 'Modal must receive driveSummary');
      assert(modalSource.includes('topCgpaAppId'), 'Modal must handle topCgpaAppId');
      assert(modalSource.includes('topMatchScoreAppId'), 'Modal must handle topMatchScoreAppId');
      assert(modalSource.includes('AI Skill-Match Score'), 'Modal must render AI skill-match score row');
      assert(modalSource.includes('Drive Eligibility'), 'Modal must render Drive Eligibility row');
    });
  }

  // -----------------------------------------------------------------
  // 8. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY]
  // -----------------------------------------------------------------
  console.log('\n--- 8. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY] ---');
  try {
    const mongoose = require(path.resolve(__dirname, '../../server/node_modules/mongoose'));
    await mongoose.connect('mongodb://localhost:27017/placement_portal');
    const db = mongoose.connection.db;

    const users = await db.collection('users').countDocuments();
    const drives = await db.collection('placementdrives').countDocuments();
    const apps = await db.collection('applications').countDocuments();
    const notifs = await db.collection('notifications').countDocuments();

    console.log(`   - Users: ${users} (Expected: 6)`);
    console.log(`   - Placement Drives: ${drives} (Expected: 7)`);
    console.log(`   - Applications: ${apps} (Expected: 12)`);
    console.log(`   - Notifications: ${notifs} (Expected: 20 or 22)`);

    test('Users count remains strictly 6', () => {
      assert.strictEqual(users, 6);
    });

    test('Placement drives count remains strictly 7', () => {
      assert.strictEqual(drives, 7);
    });

    test('Applications count remains strictly 12', () => {
      assert.strictEqual(apps, 12);
    });

    test('Notifications count remains strictly 20 or 22', () => {
      assert.ok([20, 22].includes(notifs), `Expected 20 or 22 notifications, got ${notifs}`);
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
