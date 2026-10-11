/**
 * ai_controller_skills.test.js
 * Regression test suite for defensive student-skill comparison in aiController.js:
 * 1. Normal arrays of skills
 * 2. Comma-separated string skills
 * 3. Null, undefined, non-string, and empty entries in arrays
 * 4. Missing skills (undefined, null, empty string, non-array objects)
 * 5. Trimming and case-insensitive comparison
 * 6. Arrays containing comma-separated strings
 * 7. Defensive handling of dirty extractedSkills
 * 8. Controller response structure & status code contract
 * 9. Real PDF resume parsing and extraction
 */

const path = require('path');
const {
  normalizeStudentSkills,
  findNewSkills,
} = require(path.join(__dirname, '../../server/controllers/aiController'));

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

function runTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: DEFENSIVE SKILL HANDLING (aiController.js)');
  console.log('===============================================================\n');

  // --- Scenario 1: Normal arrays of skills ---
  console.log('--- Scenario 1: Normal Arrays ---');
  {
    const profile = ['JavaScript', 'React', 'Node.js'];
    const normalized = normalizeStudentSkills(profile);
    assert(
      Array.isArray(normalized) && normalized.length === 3,
      'Normal array returns array of same length'
    );
    assert(
      normalized[0] === 'JavaScript' && normalized[1] === 'React' && normalized[2] === 'Node.js',
      'Normal array preserves skill values'
    );

    const extracted = ['JavaScript', 'React', 'Python', 'AWS'];
    const newSkills = findNewSkills(extracted, profile);
    assert(
      newSkills.length === 2 && newSkills.includes('Python') && newSkills.includes('AWS'),
      'Filters out existing skills and returns only new skills'
    );
    assert(
      !newSkills.includes('JavaScript') && !newSkills.includes('React'),
      'Does not include existing profile skills in newSkills'
    );
  }

  // --- Scenario 2: Comma-separated string skills ---
  console.log('\n--- Scenario 2: Comma-Separated Strings ---');
  {
    const profile = 'JavaScript, React, Node.js, Express';
    const normalized = normalizeStudentSkills(profile);
    assert(
      Array.isArray(normalized) && normalized.length === 4,
      'Parses comma-separated string into 4 distinct skills'
    );
    assert(
      normalized[0] === 'JavaScript' && normalized[1] === 'React' && normalized[2] === 'Node.js' && normalized[3] === 'Express',
      'Trims whitespace around comma-separated entries'
    );

    const extracted = ['React', 'Python', 'Docker'];
    const newSkills = findNewSkills(extracted, profile);
    assert(
      newSkills.length === 2 && newSkills.includes('Python') && newSkills.includes('Docker'),
      'Skill comparison works seamlessly when profile skills is a comma-separated string'
    );
  }

  // --- Scenario 3: Null, undefined, non-string, and empty entries in arrays ---
  console.log('\n--- Scenario 3: Null, Undefined, Non-string, & Empty Entries ---');
  {
    const dirtyProfile = ['JavaScript', null, undefined, '', '   ', 42, { name: 'React' }, 'Node.js'];
    let normalized = [];
    let threw = false;
    try {
      normalized = normalizeStudentSkills(dirtyProfile);
    } catch {
      threw = true;
    }
    assert(threw === false, 'Does not throw when profile array contains null, undefined, numbers, or objects');
    assert(
      normalized.length === 2 && normalized.includes('JavaScript') && normalized.includes('Node.js'),
      'Filters out null, undefined, numbers, booleans, and empty/whitespace strings'
    );

    let findNewThrew = false;
    let newSkills = [];
    try {
      newSkills = findNewSkills(['JavaScript', 'Python', 'Docker'], dirtyProfile);
    } catch {
      findNewThrew = true;
    }
    assert(findNewThrew === false, 'findNewSkills does not throw when profile array contains null/non-string items');
    assert(
      newSkills.length === 2 && newSkills.includes('Python') && newSkills.includes('Docker') && !newSkills.includes('JavaScript'),
      'Accurately identifies new skills despite dirty entries in profile'
    );
  }

  // --- Scenario 4: Missing skills (undefined, null, empty string, non-array objects) ---
  console.log('\n--- Scenario 4: Missing Skills ---');
  {
    assert(Array.isArray(normalizeStudentSkills(undefined)) && normalizeStudentSkills(undefined).length === 0, 'normalizeStudentSkills(undefined) safely returns empty array');
    assert(Array.isArray(normalizeStudentSkills(null)) && normalizeStudentSkills(null).length === 0, 'normalizeStudentSkills(null) safely returns empty array');
    assert(Array.isArray(normalizeStudentSkills(12345)) && normalizeStudentSkills(12345).length === 0, 'normalizeStudentSkills(number) safely returns empty array');
    assert(Array.isArray(normalizeStudentSkills({})) && normalizeStudentSkills({}).length === 0, 'normalizeStudentSkills(object) safely returns empty array');

    const extracted = ['React', 'Node.js'];
    const newFromUndef = findNewSkills(extracted, undefined);
    assert(newFromUndef.length === 2, 'When profile skills is undefined, all extracted skills are classified as new');

    const newFromNull = findNewSkills(extracted, null);
    assert(newFromNull.length === 2, 'When profile skills is null, all extracted skills are classified as new');
  }

  // --- Scenario 5: Trimming and case-insensitive comparison ---
  console.log('\n--- Scenario 5: Trimming & Case Normalization ---');
  {
    const profile = ['  javascript  ', 'REACT', 'Node.js '];
    const extracted = ['JavaScript', 'react', 'node.js', 'Python'];
    const newSkills = findNewSkills(extracted, profile);
    assert(
      newSkills.length === 1 && newSkills[0] === 'Python',
      'Case and whitespace differences between profile and extracted skills match cleanly'
    );
  }

  // --- Scenario 6: Arrays containing comma-separated strings ---
  console.log('\n--- Scenario 6: Array Containing Comma-Separated Strings ---');
  {
    const nestedProfile = ['React, Node.js', 'Express', 'MongoDB, AWS'];
    const normalized = normalizeStudentSkills(nestedProfile);
    assert(
      normalized.length === 5 &&
        normalized.includes('React') &&
        normalized.includes('Node.js') &&
        normalized.includes('Express') &&
        normalized.includes('MongoDB') &&
        normalized.includes('AWS'),
      'Expands comma-separated items inside array elements into individual trimmed skills'
    );
  }

  // --- Scenario 7: Defensive handling of dirty extractedSkills ---
  console.log('\n--- Scenario 7: Dirty extractedSkills Handling ---');
  {
    const dirtyExtracted = ['Python', null, undefined, '', 100, 'AWS', '   '];
    const profile = ['Python'];
    const newSkills = findNewSkills(dirtyExtracted, profile);
    assert(
      newSkills.length === 1 && newSkills[0] === 'AWS',
      'Safely ignores null, non-string, or empty items in extractedSkills array'
    );
  }

  // --- Scenario 8: Reproduction of Previous Vulnerability vs Defensive Solution ---
  console.log('\n--- Scenario 8: Root Cause Reproduction (Un-normalized vs Defensive) ---');
  {
    const stringSkills = 'React, Node.js, Python';

    // The naive code that caused HTTP 500 error:
    let naiveThrew = false;
    try {
      stringSkills.map((s) => s.toLowerCase());
    } catch (err) {
      naiveThrew = err instanceof TypeError;
    }
    assert(
      naiveThrew === true,
      'Reproduced root cause: calling .map() on comma-separated string throws TypeError (causes HTTP 500)'
    );

    // The defensive controller behavior:
    let defensiveThrew = false;
    let normalized = [];
    try {
      normalized = normalizeStudentSkills(stringSkills);
    } catch {
      defensiveThrew = true;
    }
    assert(
      defensiveThrew === false && normalized.length === 3,
      'Defensive controller prevents TypeError and normalizes comma-separated string cleanly'
    );

    const nullItemProfile = ['React', null, 'Python'];
    let naiveNullThrew = false;
    try {
      nullItemProfile.map((s) => s.toLowerCase());
    } catch (err) {
      naiveNullThrew = err instanceof TypeError;
    }
    assert(
      naiveNullThrew === true,
      'Reproduced root cause: calling s.toLowerCase() on null item throws TypeError'
    );

    let defensiveNullThrew = false;
    let defensiveSkills = [];
    try {
      defensiveSkills = findNewSkills(['React', 'Java'], nullItemProfile);
    } catch {
      defensiveNullThrew = true;
    }
    assert(
      defensiveNullThrew === false && defensiveSkills.includes('Java'),
      'Defensive controller prevents TypeError on null array entries and correctly matches skills'
    );
  }

  // --- Scenario 9: Real PDF Resume Text Parsing & Skill Extraction ---
  console.log('\n--- Scenario 9: Real PDF Resume Text Parsing (parseResume) ---');
  {
    const { parseResume } = require(path.join(__dirname, '../../server/services/resumeParser'));
    // Using Rahul's stored resume
    const parsePromise = parseResume({
      storedFilename: 'resume-6ac0e6edec34c6d148de5d60-1791165313680-543557642.pdf',
    });

    parsePromise
      .then((result) => {
        assert(result.success === true, 'Successfully parsed real stored PDF resume');
        assert(result.fileType === 'PDF', 'Identifies fileType as PDF');
        assert(result.wordCount > 100, `Word count is extracted (> 100 words, got ${result.wordCount})`);
        assert(result.characterCount > 1000, `Character count is extracted (> 1000 chars, got ${result.characterCount})`);
        assert(Array.isArray(result.extractedSkills) && result.extractedSkills.length > 5, 'Extracts technical skills list');
        assert(result.extractedSkills.includes('Java'), 'Extracts Java from resume');
        assert(result.extractedSkills.includes('JavaScript'), 'Extracts JavaScript from resume');
        assert(result.contactInfo && result.contactInfo.email, 'Extracts contact email');
        printSummary();
      })
      .catch((err) => {
        assert(false, `Failed to parse PDF resume: ${err.message}`);
        printSummary();
      });
    return; // asynchronous printSummary handled in promise
  }
}

function printSummary() {
  console.log('\n===============================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    console.error('Test Failures:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('ALL DEFENSIVE RESUME ANALYSIS & SKILL MATCHING TESTS PASSED.');
  }
}

runTests();
