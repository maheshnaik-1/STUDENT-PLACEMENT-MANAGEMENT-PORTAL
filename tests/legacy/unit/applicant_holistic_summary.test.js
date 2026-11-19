/**
 * Automated Test Suite: Officer-Facing Holistic Applicant Assessment Card
 * File: tests/unit/applicant_holistic_summary.test.js
 *
 * Verifies:
 * 1. [BEHAVIORAL] Ineligible candidate with high technical match (Gateway separation)
 * 2. [BEHAVIORAL] Eligible candidate with low technical match
 * 3. [BEHAVIORAL] No-skill-requirement baseline drive (Baseline Evaluation)
 * 4. [BEHAVIORAL] High and low CGPA observations (Strengths & Attention Points)
 * 5. [BEHAVIORAL] Active backlogs and missing required skills detection
 * 6. [BEHAVIORAL] Missing resume, projects, or certifications handling
 * 7. [BEHAVIORAL] Defensive resilience: null, undefined, dirty data, zero NaN
 * 8. [BEHAVIORAL] Strict separation of academic eligibility from skill matching
 * 9. [BEHAVIORAL] Explicit advisory wording and absence of automated status mutations
 * 10. [STATIC AUDIT] Component contract in DriveApplicants.jsx & HolisticApplicantSummaryCard.jsx
 * 11. [DATABASE INTEGRITY] MongoDB read-only baseline counts preservation
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  TEST SUITE: OFFICER HOLISTIC APPLICANT ASSESSMENT CARD');
  console.log('===============================================================\n');

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
  // Load Modules
  // -----------------------------------------------------------------
  let summaryModule;
  try {
    const summaryPath = path.resolve(__dirname, '../../client/src/utils/applicantSummary.js');
    summaryModule = await import(`file://${summaryPath.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error('Failed to import applicantSummary.js:', err);
    process.exit(1);
  }

  const {
    generateApplicantSummary,
    ADVISORY_DISCLAIMER,
    ADVISORY_NOTE,
  } = summaryModule;

  test('Module exports generateApplicantSummary, ADVISORY_DISCLAIMER, and ADVISORY_NOTE', () => {
    assert.strictEqual(typeof generateApplicantSummary, 'function');
    assert.strictEqual(typeof ADVISORY_DISCLAIMER, 'string');
    assert.strictEqual(typeof ADVISORY_NOTE, 'string');
    assert.ok(ADVISORY_DISCLAIMER.includes('Advisory assessment only'));
    assert.ok(ADVISORY_DISCLAIMER.includes('The placement officer makes all selection decisions'));
  });

  // -----------------------------------------------------------------
  // 1. Ineligible candidate with high technical match
  // -----------------------------------------------------------------
  console.log('\n--- 1. Academically Ineligible Candidate with High Technical Match ---');
  {
    const student = {
      name: 'Arjun Verma',
      branch: 'MECH',
      cgpa: 6.2,
      activeBacklogs: 2,
      skills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript'],
      projects: [{ title: 'Fullstack App' }],
      resumeFile: { filename: 'resume.pdf', mimeType: 'application/pdf' },
    };

    const drive = {
      title: 'Senior Web Developer',
      requiredSkills: ['React', 'Node.js', 'MongoDB'],
      eligibility: {
        minCGPA: 7.5,
        allowedBranches: ['CSE', 'IT'],
        maxBacklogs: 0,
      },
    };

    const eligibility = {
      isEligible: false,
      details: [
        { criteria: 'Minimum CGPA', required: '≥ 7.50', actual: '6.20', passed: false },
        { criteria: 'Max Backlogs', required: '≤ 0', actual: '2', passed: false },
        { criteria: 'Eligible Branch', required: 'CSE, IT', actual: 'MECH', passed: false },
      ],
    };

    const matchScore = {
      score: 100,
      matchedSkills: ['React', 'Node.js', 'MongoDB'],
      missingSkills: [],
      totalRequired: 3,
      totalMatched: 3,
      explanation: 'All required skills matched perfectly',
      isBaseline: false,
    };

    const summary = generateApplicantSummary({ student, drive, eligibility, matchScore });

    test('Gateway 1: Ineligible status is strictly preserved despite 100% skill match', () => {
      assert.strictEqual(summary.academicGateway.isEligible, false);
      assert.strictEqual(summary.academicGateway.statusLabel, 'INELIGIBLE');
      assert.ok(summary.academicGateway.unmetCriteria.length === 3);
    });

    test('Gateway 2: Technical match score is accurately reflected at 100%', () => {
      assert.strictEqual(summary.technicalAlignment.hasScore, true);
      assert.strictEqual(summary.technicalAlignment.score, 100);
      assert.strictEqual(summary.technicalAlignment.alignmentTier, 'Strong Alignment');
      assert.strictEqual(summary.technicalAlignment.matchedCount, 3);
    });

    test('Attention points highlight academic ineligibility and backlogs', () => {
      const hasIneligibility = summary.attentionPoints.some((p) => p.includes('Academic Ineligibility'));
      const hasBacklogs = summary.attentionPoints.some((p) => p.includes('Active Backlogs'));
      assert.ok(hasIneligibility, 'Should flag academic ineligibility in attention points');
      assert.ok(hasBacklogs, 'Should flag active backlogs in attention points');
    });

    test('High skill match does not promote or auto-approve ineligible candidate', () => {
      assert.strictEqual(summary.academicGateway.isEligible, false);
      assert.ok(!JSON.stringify(summary).includes('Recommended for Selection'));
      assert.ok(!JSON.stringify(summary).includes('Automatic Selection'));
    });
  }

  // -----------------------------------------------------------------
  // 2. Eligible candidate with low technical match
  // -----------------------------------------------------------------
  console.log('\n--- 2. Eligible Candidate with Low Technical Match ---');
  {
    const student = {
      name: 'Priya Sharma',
      branch: 'CSE',
      cgpa: 8.8,
      activeBacklogs: 0,
      skills: ['HTML', 'CSS'],
      projects: [{ title: 'Portfolio Website' }],
      resumeFile: { filename: 'priya_cv.pdf' },
    };

    const drive = {
      title: 'DevOps Engineer',
      requiredSkills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'Python'],
    };

    const eligibility = {
      isEligible: true,
      details: [
        { criteria: 'Minimum CGPA', required: '≥ 7.00', actual: '8.80', passed: true },
        { criteria: 'Max Backlogs', required: '≤ 0', actual: '0', passed: true },
        { criteria: 'Eligible Branch', required: 'All Branches', actual: 'CSE', passed: true },
      ],
    };

    const matchScore = {
      score: 0,
      matchedSkills: [],
      missingSkills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'Python'],
      totalRequired: 5,
      totalMatched: 0,
      explanation: 'No required skills matched',
      isBaseline: false,
    };

    const summary = generateApplicantSummary({ student, drive, eligibility, matchScore });

    test('Gateway 1: Candidate is confirmed ELIGIBLE', () => {
      assert.strictEqual(summary.academicGateway.isEligible, true);
      assert.strictEqual(summary.academicGateway.statusLabel, 'ELIGIBLE');
      assert.strictEqual(summary.academicGateway.unmetCriteria.length, 0);
    });

    test('Gateway 2: Technical match indicates Low Alignment / Skill Gap (0%)', () => {
      assert.strictEqual(summary.technicalAlignment.hasScore, true);
      assert.strictEqual(summary.technicalAlignment.score, 0);
      assert.strictEqual(summary.technicalAlignment.alignmentTier, 'Low Alignment / Skill Gap');
      assert.strictEqual(summary.technicalAlignment.missingCount, 5);
    });

    test('Observations contrast high academic standing with technical skill gap', () => {
      const hasCgpaStrength = summary.standoutStrengths.some((s) => s.includes('High Academic Standing'));
      const hasSkillGap = summary.attentionPoints.some((p) => p.includes('Missing Required Skills') || p.includes('Significant Skill Gap'));
      assert.ok(hasCgpaStrength, 'Should note high CGPA as strength');
      assert.ok(hasSkillGap, 'Should note missing required skills in attention points');
    });
  }

  // -----------------------------------------------------------------
  // 3. No-skill-requirement baseline drive
  // -----------------------------------------------------------------
  console.log('\n--- 3. Baseline Drive with No Skill Requirements ---');
  {
    const student = {
      name: 'Rohan Gupta',
      branch: 'IT',
      cgpa: 7.8,
      activeBacklogs: 0,
      skills: ['Java', 'SQL'],
    };

    const drive = {
      title: 'Graduate Trainee - General Pool',
      requiredSkills: [], // No required skills
    };

    const eligibility = {
      isEligible: true,
      details: [{ criteria: 'Minimum CGPA', required: '≥ 6.00', actual: '7.80', passed: true }],
    };

    const matchScore = {
      score: 100,
      matchedSkills: [],
      missingSkills: [],
      totalRequired: 0,
      totalMatched: 0,
      explanation: 'No specific skill requirements listed for this drive',
      isBaseline: true,
    };

    const summary = generateApplicantSummary({ student, drive, eligibility, matchScore });

    test('Technical alignment flags baseline evaluation correctly', () => {
      assert.strictEqual(summary.technicalAlignment.isBaseline, true);
      assert.strictEqual(summary.technicalAlignment.alignmentTier, 'Baseline Evaluation');
    });

    test('Summary text explicitly explains baseline nature without false suitability claims', () => {
      assert.ok(
        summary.technicalAlignment.summaryText.includes('no mandatory technical skills') ||
          summary.technicalAlignment.summaryText.includes('baseline evaluation')
      );
      assert.ok(!summary.technicalAlignment.summaryText.includes('Strong technical alignment for this role'));
    });
  }

  // -----------------------------------------------------------------
  // 4. High and Low CGPA Cases
  // -----------------------------------------------------------------
  console.log('\n--- 4. High and Low CGPA Observations ---');
  {
    // High CGPA
    const studentHigh = { cgpa: 9.45, activeBacklogs: 0, branch: 'CSE' };
    const summaryHigh = generateApplicantSummary({ student: studentHigh });
    test('High CGPA (≥ 8.5) generates High Academic Standing strength', () => {
      const hasHighCgpa = summaryHigh.standoutStrengths.some((s) => s.includes('CGPA 9.45 (≥ 8.5)'));
      assert.ok(hasHighCgpa, 'Expected high CGPA strength');
    });

    // Low CGPA
    const studentLow = { cgpa: 5.85, activeBacklogs: 0, branch: 'ECE' };
    const summaryLow = generateApplicantSummary({ student: studentLow });
    test('Low CGPA (< 6.5) generates Academic Warning attention point', () => {
      const hasLowCgpa = summaryLow.attentionPoints.some((p) => p.includes('CGPA 5.85 is in the lower tier (< 6.5)'));
      assert.ok(hasLowCgpa, 'Expected low CGPA warning');
    });
  }

  // -----------------------------------------------------------------
  // 5. Active Backlogs and Missing Required Skills
  // -----------------------------------------------------------------
  console.log('\n--- 5. Active Backlogs & Missing Required Skills Detection ---');
  {
    const student = {
      cgpa: 7.2,
      activeBacklogs: 3,
      skills: ['C++'],
    };

    const drive = {
      requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch'],
    };

    const matchScore = {
      score: 0,
      matchedSkills: [],
      missingSkills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch'],
      totalRequired: 4,
      totalMatched: 0,
      isBaseline: false,
    };

    const summary = generateApplicantSummary({ student, drive, matchScore });

    test('Flags active backlogs count accurately', () => {
      const backlogFlag = summary.attentionPoints.some((p) => p.includes('3 active backlogs on record'));
      assert.ok(backlogFlag, 'Should flag 3 active backlogs');
    });

    test('Lists missing drive skills preview in attention points', () => {
      const skillFlag = summary.attentionPoints.some((p) => p.includes('Missing Required Skills: Python, Machine Learning, TensorFlow (+1 more)'));
      assert.ok(skillFlag, 'Should list missing required skills preview with overflow count');
    });
  }

  // -----------------------------------------------------------------
  // 6. Missing Resume, Projects, or Certifications
  // -----------------------------------------------------------------
  console.log('\n--- 6. Missing Resume, Projects, or Certifications ---');
  {
    const studentEmpty = {
      name: 'Incomplete Candidate',
      cgpa: 7.0,
      activeBacklogs: 0,
      resumeFile: null,
      resumeUrl: '',
      projects: [],
      certifications: [],
    };

    const completeness = { percentage: 30 };
    const summary = generateApplicantSummary({ student: studentEmpty, completeness });

    test('Identifies missing resume in profileReadiness and attentionPoints', () => {
      assert.strictEqual(summary.profileReadiness.hasResume, false);
      assert.strictEqual(summary.profileReadiness.resumeType, 'None Available');
      const hasResumeFlag = summary.attentionPoints.some((p) => p.includes('Resume Missing'));
      assert.ok(hasResumeFlag, 'Should flag missing resume in attention points');
    });

    test('Identifies zero projects in profileReadiness and attentionPoints', () => {
      assert.strictEqual(summary.profileReadiness.projectCount, 0);
      const hasProjectFlag = summary.attentionPoints.some((p) => p.includes('No technical or coursework projects'));
      assert.ok(hasProjectFlag, 'Should flag lack of projects in attention points');
    });

    test('Identifies incomplete profile percentage (< 50%)', () => {
      assert.strictEqual(summary.profileReadiness.percentage, 30);
      const hasCompletenessFlag = summary.attentionPoints.some((p) => p.includes('Incomplete Profile: 30%'));
      assert.ok(hasCompletenessFlag, 'Should flag incomplete profile');
    });
  }

  // -----------------------------------------------------------------
  // 7. Defensive Resilience: null, undefined, dirty data, zero NaN
  // -----------------------------------------------------------------
  console.log('\n--- 7. Defensive Resilience: Dirty & Missing Data ---');
  {
    test('Handles empty object without throwing', () => {
      const s1 = generateApplicantSummary({});
      assert.ok(s1 && typeof s1 === 'object');
      assert.strictEqual(s1.academicGateway.isEligible, true);
      assert.strictEqual(s1.technicalAlignment.hasScore, false);
      assert.strictEqual(s1.technicalAlignment.scoreDisplay, 'Unavailable');
      assert.strictEqual(s1.profileReadiness.percentage, 0);
      assert.ok(!JSON.stringify(s1).includes('NaN'));
    });

    test('Handles null and undefined arguments safely', () => {
      const s2 = generateApplicantSummary(undefined);
      assert.ok(s2 && typeof s2 === 'object');
      assert.ok(!JSON.stringify(s2).includes('NaN'));
      assert.ok(!JSON.stringify(s2).includes('null%'));
    });

    test('Handles malformed non-numeric CGPA and backlogs safely', () => {
      const dirtyStudent = {
        cgpa: 'INVALID_CGPA',
        activeBacklogs: 'TWO_BACKLOGS',
        projects: 'NOT_AN_ARRAY',
        certifications: null,
      };
      const s3 = generateApplicantSummary({ student: dirtyStudent });
      assert.strictEqual(s3.profileReadiness.projectCount, 0);
      assert.strictEqual(s3.profileReadiness.certificationCount, 0);
      assert.ok(!JSON.stringify(s3).includes('NaN'));
    });

    test('Handles malformed matchScore object gracefully', () => {
      const malformedMatch = {
        score: 'NOT_A_NUMBER',
        matchedSkills: 'HTML,CSS',
        totalRequired: 'TEN',
      };
      const s4 = generateApplicantSummary({ matchScore: malformedMatch });
      assert.strictEqual(s4.technicalAlignment.hasScore, false);
      assert.strictEqual(s4.technicalAlignment.scoreDisplay, 'Unavailable');
      assert.ok(!JSON.stringify(s4).includes('NaN'));
    });
  }

  // -----------------------------------------------------------------
  // 8. Strict Separation of Academic Eligibility from Skill Matching
  // -----------------------------------------------------------------
  console.log('\n--- 8. Strict Separation of Gateway & Alignment ---');
  {
    const baseStudent = { name: 'Separation Test', cgpa: 6.0, activeBacklogs: 1 };
    const baseDrive = { requiredSkills: ['React'] };

    const eligPass = { isEligible: true, details: [] };
    const eligFail = { isEligible: false, details: [{ criteria: 'Backlogs', actual: '1', required: '≤ 0', passed: false }] };

    const matchLow = { score: 10, matchedSkills: [], missingSkills: ['React'], totalRequired: 1, isBaseline: false };
    const matchHigh = { score: 95, matchedSkills: ['React'], missingSkills: [], totalRequired: 1, isBaseline: false };

    // Case A: Eligibility does NOT mutate skill match
    const summaryA1 = generateApplicantSummary({ student: baseStudent, drive: baseDrive, eligibility: eligPass, matchScore: matchHigh });
    const summaryA2 = generateApplicantSummary({ student: baseStudent, drive: baseDrive, eligibility: eligFail, matchScore: matchHigh });

    test('Skill match score (95%) remains identical regardless of eligibility status', () => {
      assert.strictEqual(summaryA1.technicalAlignment.score, 95);
      assert.strictEqual(summaryA2.technicalAlignment.score, 95);
      assert.strictEqual(summaryA1.academicGateway.isEligible, true);
      assert.strictEqual(summaryA2.academicGateway.isEligible, false);
    });

    // Case B: Skill match does NOT mutate academic eligibility
    const summaryB1 = generateApplicantSummary({ student: baseStudent, drive: baseDrive, eligibility: eligPass, matchScore: matchLow });
    const summaryB2 = generateApplicantSummary({ student: baseStudent, drive: baseDrive, eligibility: eligPass, matchScore: matchHigh });

    test('Academic eligibility (ELIGIBLE) remains identical regardless of skill match score', () => {
      assert.strictEqual(summaryB1.academicGateway.isEligible, true);
      assert.strictEqual(summaryB2.academicGateway.isEligible, true);
      assert.strictEqual(summaryB1.technicalAlignment.score, 10);
      assert.strictEqual(summaryB2.technicalAlignment.score, 95);
    });

    test('Explicit separation note is present in academicGateway', () => {
      assert.ok(
        summaryA1.academicGateway.separationNote.includes(
          'Academic eligibility is evaluated independently from technical skill matching'
        )
      );
    });
  }

  // -----------------------------------------------------------------
  // 9. Explicit Advisory Wording and Absence of Automated Status Changes
  // -----------------------------------------------------------------
  console.log('\n--- 9. Explicit Advisory Wording & Non-Automating Design ---');
  {
    const summary = generateApplicantSummary({});

    test('Advisory disclaimer matches required user string verbatim', () => {
      assert.strictEqual(
        summary.disclaimer,
        'Advisory assessment only. The placement officer makes all selection decisions.'
      );
    });

    test('Advisory note confirms lack of automated status changes', () => {
      assert.ok(
        summary.advisoryNote.includes(
          'It does not automate selection, rejection, or application status updates'
        )
      );
    });

    test('Contains no automated hiring decision labels', () => {
      const serialized = JSON.stringify(summary);
      assert.ok(!serialized.includes('"Recommended for Selection"'));
      assert.ok(!serialized.includes('"Recommended for Rejection"'));
      assert.ok(!serialized.includes('"Auto-Select"'));
      assert.ok(!serialized.includes('"Auto-Reject"'));
    });
  }

  // -----------------------------------------------------------------
  // 10. Static UI Component Contract
  // -----------------------------------------------------------------
  console.log('\n--- 10. Static UI Component Contract Verification ---');
  {
    const driveApplicantsPath = path.resolve(
      __dirname,
      '../../client/src/pages/officer/DriveApplicants.jsx'
    );
    const summaryCardPath = path.resolve(
      __dirname,
      '../../client/src/components/officer/HolisticApplicantSummaryCard.jsx'
    );

    test('DriveApplicants.jsx exists and imports HolisticApplicantSummaryCard', () => {
      const src = fs.readFileSync(driveApplicantsPath, 'utf8');
      assert.ok(
        src.includes("import HolisticApplicantSummaryCard from '../../components/officer/HolisticApplicantSummaryCard';"),
        'DriveApplicants.jsx must import HolisticApplicantSummaryCard'
      );
      assert.ok(
        src.includes('<HolisticApplicantSummaryCard'),
        'DriveApplicants.jsx must render <HolisticApplicantSummaryCard'
      );
      assert.ok(
        src.includes('generateApplicantSummary'),
        'DriveApplicants.jsx must export generateApplicantSummary'
      );
    });

    test('HolisticApplicantSummaryCard.jsx exists and renders advisory disclaimer', () => {
      const src = fs.readFileSync(summaryCardPath, 'utf8');
      assert.ok(
        src.includes('ADVISORY_DISCLAIMER'),
        'HolisticApplicantSummaryCard.jsx must import or reference ADVISORY_DISCLAIMER'
      );
      assert.ok(
        src.includes('Academic Gateway'),
        'HolisticApplicantSummaryCard.jsx must render Academic Gateway pillar'
      );
      assert.ok(
        src.includes('Technical Alignment'),
        'HolisticApplicantSummaryCard.jsx must render Technical Alignment pillar'
      );
      assert.ok(
        src.includes('Profile Readiness'),
        'HolisticApplicantSummaryCard.jsx must render Profile Readiness pillar'
      );
    });
  }

  // -----------------------------------------------------------------
  // 11. MongoDB Read-Only Baseline Integrity Check
  // -----------------------------------------------------------------
  console.log('\n--- 11. MongoDB Read-Only Baseline Check ---');
  try {
    const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));
    await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
    const db = mongoose.connection;

    const users = await db.collection('users').countDocuments();
    const drives = await db.collection('placementdrives').countDocuments();
    const apps = await db.collection('applications').countDocuments();
    const notifs = await db.collection('notifications').countDocuments();

    console.log(`   - Users: ${users} (Expected: 6)`);
    console.log(`   - Placement Drives: ${drives} (Expected: 7)`);
    console.log(`   - Applications: ${apps} (Expected: 12)`);
    console.log(`   - Notifications: ${notifs} (Expected: 22)`);

    test('Users count preserved strictly at 6', () => {
      assert.strictEqual(users, 6);
    });

    test('Placement drives count preserved strictly at 7', () => {
      assert.strictEqual(drives, 7);
    });

    test('Applications count preserved strictly at 12', () => {
      assert.strictEqual(apps, 12);
    });

    test('Notifications count preserved strictly at 22', () => {
      assert.strictEqual(notifs, 22);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Database connection error in test suite:', err.message);
    failed++;
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
