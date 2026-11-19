/**
 * Automated Test Suite: v2.5 Closure — Career Profile & Applicant Evaluation
 *
 * Verifies:
 * 1. [BEHAVIORAL] Exported utility contracts & dimensions from profileCompleteness.js
 * 2. [BEHAVIORAL] Empty profile and dirty/null/boundary handling (0% score, safe defaults)
 * 3. [BEHAVIORAL] All seven completeness dimensions in isolation & their exact weights (100% total)
 * 4. [BEHAVIORAL] Partial profile progression across readiness tiers
 * 5. [BEHAVIORAL] 100% complete profile verification & zero missing checklist items
 * 6. [BEHAVIORAL] Dual-signature contract preservation (StudentProfile vs populated Student)
 * 7. [BEHAVIORAL] Officer evaluation modal integration & candidate field resilience
 * 8. [BEHAVIORAL] Profile completeness does NOT determine drive eligibility (informational only)
 * 9. [BEHAVIORAL & SECURITY] Cross-student resume access strictly denied with HTTP 403 Forbidden
 * 10. [BEHAVIORAL] Read-only database collection counts remain 100% untouched
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  TEST SUITE: v2.5 CLOSURE — CAREER PROFILE & EVALUATION');
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
  // 1. [BEHAVIORAL - SHARED MODULE EXPORTS & CONSTANTS]
  // -----------------------------------------------------------------
  console.log('\n--- 1. [BEHAVIORAL - SHARED MODULE EXPORTS & CONSTANTS] ---');
  let completenessModule;
  try {
    const modulePath = path.resolve(__dirname, '../../client/src/utils/profileCompleteness.js');
    completenessModule = await import(`file://${modulePath.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error('Failed to import profileCompleteness.js:', err);
    process.exit(1);
  }

  const {
    calculateCompleteness,
    getCompletenessTier,
    COMPLETENESS_WEIGHTS,
  } = completenessModule;

  test('calculateCompleteness is exported as a function', () => {
    assert.strictEqual(typeof calculateCompleteness, 'function');
  });

  test('getCompletenessTier is exported as a function', () => {
    assert.strictEqual(typeof getCompletenessTier, 'function');
  });

  test('COMPLETENESS_WEIGHTS contains all seven dimensions summing to 100%', () => {
    assert.ok(COMPLETENESS_WEIGHTS, 'COMPLETENESS_WEIGHTS should be defined');
    assert.strictEqual(COMPLETENESS_WEIGHTS.BASIC_CONTACT, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.CORE_ACADEMIC, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.EXTENDED_ACADEMIC, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.SKILLS, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.RESUME, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.PROJECTS, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.LINKS_CERTS, 10);

    assert.strictEqual(COMPLETENESS_WEIGHTS.basicAndContact, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.coreAcademic, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.extendedAcademic, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.skills, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.resume, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.projects, 15);
    assert.strictEqual(COMPLETENESS_WEIGHTS.linksAndCertifications, 10);

    const sevenKeys = [
      'BASIC_CONTACT',
      'CORE_ACADEMIC',
      'EXTENDED_ACADEMIC',
      'SKILLS',
      'RESUME',
      'PROJECTS',
      'LINKS_CERTS',
    ];
    const totalWeight = sevenKeys.reduce((acc, k) => acc + COMPLETENESS_WEIGHTS[k], 0);
    assert.strictEqual(totalWeight, 100);
  });

  test('getCompletenessTier maps percentage boundaries to correct readiness labels', () => {
    assert.strictEqual(getCompletenessTier(100).label, 'Placement Ready');
    assert.strictEqual(getCompletenessTier(70).label, 'Good Profile Readiness');
    assert.strictEqual(getCompletenessTier(69).label, 'Profile In Progress');
    assert.strictEqual(getCompletenessTier(0).label, 'Profile In Progress');
  });

  // -----------------------------------------------------------------
  // 2. [BEHAVIORAL - EMPTY PROFILE & DIRTY/BOUNDARY DATA]
  // -----------------------------------------------------------------
  console.log('\n--- 2. [BEHAVIORAL - EMPTY PROFILE & BOUNDARY CASES] ---');

  test('Empty profile object yields 0% completeness and isComplete false', () => {
    const res = calculateCompleteness({});
    assert.strictEqual(res.percentage, 0);
    assert.strictEqual(res.isComplete, false);
    assert.strictEqual(res.missing.length, 7);
    assert.strictEqual(res.missingDetails.length, 7);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Profile In Progress');
  });

  test('null input yields 0% completeness safely', () => {
    const res = calculateCompleteness(null);
    assert.strictEqual(res.percentage, 0);
    assert.strictEqual(res.isComplete, false);
    assert.strictEqual(res.missing.length, 7);
  });

  test('undefined input yields 0% completeness safely', () => {
    const res = calculateCompleteness(undefined);
    assert.strictEqual(res.percentage, 0);
    assert.strictEqual(res.isComplete, false);
    assert.strictEqual(res.missing.length, 7);
  });

  test('Whitespace-only strings are treated as empty', () => {
    const res = calculateCompleteness({
      name: '   ',
      email: '\t',
      rollNo: ' ',
      branch: '',
      phone: '   ',
      skills: '   ',
    });
    assert.strictEqual(res.percentage, 0);
    assert.strictEqual(res.breakdown['Basic & Contact Information'], 0);
    assert.strictEqual(res.breakdown['Technical Skills'], 0);
  });

  test('Phone number with fewer than 7 digits does not complete Basic & Contact', () => {
    const res = calculateCompleteness({
      name: 'John Doe',
      email: 'john@example.com',
      rollNo: '2022CS01',
      branch: 'CSE',
      phone: '12345', // < 7 digits
    });
    assert.strictEqual(res.breakdown['Basic & Contact Information'], 0);
  });

  test('Empty arrays for skills, projects, and certifications yield 0%', () => {
    const res = calculateCompleteness({
      skills: [],
      projects: [],
      certifications: [],
    });
    assert.strictEqual(res.percentage, 0);
    assert.strictEqual(res.breakdown['Technical Skills'], 0);
    assert.strictEqual(res.breakdown['Projects Portfolio'], 0);
    assert.strictEqual(res.breakdown['Professional Links & Certifications'], 0);
  });

  test('Zero backlogs with valid positive CGPA awards Core Academic', () => {
    const res = calculateCompleteness({
      cgpa: 8.5,
      activeBacklogs: 0,
      passingYear: 2026,
    });
    assert.strictEqual(res.breakdown['Core Academic Credentials'], 15);
  });

  // -----------------------------------------------------------------
  // 3. [BEHAVIORAL - SEVEN DIMENSIONS AND WEIGHTS IN ISOLATION]
  // -----------------------------------------------------------------
  console.log('\n--- 3. [BEHAVIORAL - ALL SEVEN DIMENSIONS IN ISOLATION] ---');

  test('Dimension 1: Basic & Contact alone awards exactly 15%', () => {
    const res = calculateCompleteness({
      name: 'John Doe',
      email: 'john@example.com',
      rollNo: '2022CS01',
      branch: 'CSE',
      phone: '9876543210',
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Basic & Contact Information'], 15);
    assert.strictEqual(res.breakdown['Core Academic Credentials'], 0);
  });

  test('Dimension 1: Incomplete Basic (missing branch) awards 0%', () => {
    const res = calculateCompleteness({
      name: 'John Doe',
      email: 'john@example.com',
      rollNo: '2022CS01',
      phone: '9876543210',
    });
    assert.strictEqual(res.breakdown['Basic & Contact Information'], 0);
  });

  test('Dimension 2: Core Academic alone awards exactly 15%', () => {
    const res = calculateCompleteness({
      cgpa: 8.5,
      activeBacklogs: 0,
      passingYear: 2026,
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Core Academic Credentials'], 15);
  });

  test('Dimension 3: Extended Academic with 10th, 12th, and current semester awards exactly 15%', () => {
    const res = calculateCompleteness({
      tenthPercentage: 92,
      twelfthPercentage: 88,
      currentSemester: 7,
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Extended Academic Details'], 15);
  });

  test('Dimension 3: Extended Academic with 10th, Diploma, and current semester awards exactly 15%', () => {
    const res = calculateCompleteness({
      tenthPercentage: 85,
      diplomaPercentage: 89,
      currentSemester: 7,
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Extended Academic Details'], 15);
  });

  test('Dimension 3: Extended Academic missing semester awards 0%', () => {
    const res = calculateCompleteness({
      tenthPercentage: 85,
      twelfthPercentage: 80,
    });
    assert.strictEqual(res.breakdown['Extended Academic Details'], 0);
  });

  test('Dimension 4: Skills alone (array) awards exactly 15%', () => {
    const res = calculateCompleteness({
      skills: ['React', 'Node.js'],
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Technical Skills'], 15);
  });

  test('Dimension 4: Skills alone (comma string) awards exactly 15%', () => {
    const res = calculateCompleteness({
      skills: 'React, Node.js, Python',
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Technical Skills'], 15);
  });

  test('Dimension 5: Resume alone (resumeFile.filename) awards exactly 15%', () => {
    const res = calculateCompleteness({
      resumeFile: { filename: 'resume-123.pdf', originalName: 'MyResume.pdf' },
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Resume Document'], 15);
  });

  test('Dimension 5: Resume alone (resumeUrl) awards exactly 15%', () => {
    const res = calculateCompleteness({
      resumeUrl: 'https://storage.example.com/resumes/my-resume.pdf',
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Resume Document'], 15);
  });

  test('Dimension 6: Projects alone awards exactly 15%', () => {
    const res = calculateCompleteness({
      projects: [{ title: 'Placement Portal', techStack: 'MERN' }],
    });
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(res.breakdown['Projects Portfolio'], 15);
  });

  test('Dimension 7: Professional Links & Certifications alone awards exactly 10%', () => {
    const resGithub = calculateCompleteness({ github: 'https://github.com/developer' });
    assert.strictEqual(resGithub.percentage, 10);
    assert.strictEqual(resGithub.breakdown['Professional Links & Certifications'], 10);

    const resCert = calculateCompleteness({
      certifications: [{ name: 'AWS Cloud Practitioner', issuer: 'Amazon' }],
    });
    assert.strictEqual(resCert.percentage, 10);
    assert.strictEqual(resCert.breakdown['Professional Links & Certifications'], 10);
  });

  // -----------------------------------------------------------------
  // 4. [BEHAVIORAL - PARTIAL PROFILE PROGRESSION & TIERS]
  // -----------------------------------------------------------------
  console.log('\n--- 4. [BEHAVIORAL - PARTIAL PROFILE PROGRESSION & TIERS] ---');

  const baseStudent = {
    name: 'Aarav Patel',
    email: 'aarav@college.edu',
    rollNo: '2022CS55',
    branch: 'CSE',
    phone: '9876543210',
  };

  test('Progression Step 1: Basic only -> 15% (Profile In Progress)', () => {
    const res = calculateCompleteness(baseStudent);
    assert.strictEqual(res.percentage, 15);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Profile In Progress');
  });

  test('Progression Step 2: Basic + Core -> 30% (Profile In Progress)', () => {
    const res = calculateCompleteness({
      ...baseStudent,
      cgpa: 8.2,
      activeBacklogs: 0,
      passingYear: 2026,
    });
    assert.strictEqual(res.percentage, 30);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Profile In Progress');
  });

  test('Progression Step 3: Basic + Core + Extended -> 45% (Profile In Progress)', () => {
    const res = calculateCompleteness({
      ...baseStudent,
      cgpa: 8.2,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 90,
      twelfthPercentage: 86,
      currentSemester: 7,
    });
    assert.strictEqual(res.percentage, 45);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Profile In Progress');
  });

  test('Progression Step 4: Adding Skills reaches 60% (Profile In Progress)', () => {
    const res = calculateCompleteness({
      ...baseStudent,
      cgpa: 8.2,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 90,
      twelfthPercentage: 86,
      currentSemester: 7,
      skills: ['Python', 'Django', 'PostgreSQL'],
    });
    assert.strictEqual(res.percentage, 60);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Profile In Progress');
  });

  test('Progression Step 5: Adding Resume reaches 75% (Good Profile Readiness)', () => {
    const res = calculateCompleteness({
      ...baseStudent,
      cgpa: 8.2,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 90,
      twelfthPercentage: 86,
      currentSemester: 7,
      skills: ['Python', 'Django', 'PostgreSQL'],
      resumeFile: { filename: 'aarav-resume.pdf' },
    });
    assert.strictEqual(res.percentage, 75);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Good Profile Readiness');
  });

  test('Progression Step 6: Adding Projects reaches 90% (Good Profile Readiness)', () => {
    const res = calculateCompleteness({
      ...baseStudent,
      cgpa: 8.2,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 90,
      twelfthPercentage: 86,
      currentSemester: 7,
      skills: ['Python', 'Django', 'PostgreSQL'],
      resumeFile: { filename: 'aarav-resume.pdf' },
      projects: [{ title: 'Autonomous Drone', techStack: 'Python' }],
    });
    assert.strictEqual(res.percentage, 90);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Good Profile Readiness');
    assert.strictEqual(res.isComplete, false);
    assert.strictEqual(res.missing.length, 1);
  });

  // -----------------------------------------------------------------
  // 5. [BEHAVIORAL - COMPLETE PROFILE (100%)]
  // -----------------------------------------------------------------
  console.log('\n--- 5. [BEHAVIORAL - COMPLETE PROFILE (100%)] ---');

  test('All seven dimensions present yields exact 100% completeness and isComplete: true', () => {
    const completeProfile = {
      name: 'Priya Sharma',
      email: 'priya.it@college.edu',
      rollNo: '2022IT05',
      branch: 'IT',
      phone: '9876543210',
      cgpa: 9.2,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 94,
      twelfthPercentage: 91,
      currentSemester: 7,
      skills: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
      resumeFile: {
        filename: 'priya-resume.pdf',
        originalName: 'Priya_Resume.pdf',
      },
      projects: [
        { title: 'Placement Portal', techStack: 'React, Node.js' },
      ],
      github: 'https://github.com/priyasharma',
      certifications: [
        { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon' },
      ],
    };

    const res = calculateCompleteness(completeProfile);
    assert.strictEqual(res.percentage, 100);
    assert.strictEqual(res.isComplete, true);
    assert.strictEqual(res.missing.length, 0);
    assert.strictEqual(res.missingDetails.length, 0);
    assert.strictEqual(getCompletenessTier(res.percentage).label, 'Placement Ready');
  });

  // -----------------------------------------------------------------
  // 6. [BEHAVIORAL - DUAL-SIGNATURE & CONTRACT PRESERVATION]
  // -----------------------------------------------------------------
  console.log('\n--- 6. [BEHAVIORAL - DUAL-SIGNATURE CONTRACT PRESERVATION] ---');

  test('Signature A (4 arguments) produces identical result to Signature B (single populated object)', () => {
    const formData = {
      name: 'Rahul Verma',
      email: 'rahul.cse@college.edu',
      rollNo: '2022CS01',
      branch: 'CSE',
      phone: '9876543210',
      cgpa: 8.5,
      activeBacklogs: 0,
      passingYear: 2026,
      tenthPercentage: 92,
      twelfthPercentage: 88,
      currentSemester: 7,
      skills: 'React, Node.js, Express',
      github: 'https://github.com/rahulverma',
    };
    const resumeFile = { filename: 'rahul-resume.pdf' };
    const projects = [{ title: 'Code Search' }];
    const certifications = [{ name: 'Fullstack Dev' }];

    // Signature A (StudentProfile form):
    const resA = calculateCompleteness(formData, resumeFile, projects, certifications);

    // Signature B (MongoDB populated candidate):
    const candidateObj = {
      name: formData.name,
      email: formData.email,
      rollNo: formData.rollNo,
      branch: formData.branch,
      phone: formData.phone,
      cgpa: formData.cgpa,
      activeBacklogs: formData.activeBacklogs,
      passingYear: formData.passingYear,
      academicDetails: {
        tenthPercentage: formData.tenthPercentage,
        twelfthPercentage: formData.twelfthPercentage,
        currentSemester: formData.currentSemester,
      },
      skills: ['React', 'Node.js', 'Express'],
      resumeFile,
      projects,
      certifications,
      links: {
        github: formData.github,
      },
    };
    const resB = calculateCompleteness(candidateObj);

    assert.strictEqual(resA.percentage, resB.percentage);
    assert.strictEqual(resA.isComplete, resB.isComplete);
    assert.deepStrictEqual(resA.breakdown, resB.breakdown);
    assert.strictEqual(resA.percentage, 100);
  });

  test('StudentProfile.jsx re-exports calculateCompleteness and getCompletenessTier', () => {
    const studentProfilePath = path.resolve(__dirname, '../../client/src/pages/student/StudentProfile.jsx');
    const content = fs.readFileSync(studentProfilePath, 'utf8');
    assert.ok(
      content.includes("from '../../utils/profileCompleteness'"),
      'StudentProfile.jsx must import from shared utility'
    );
    assert.ok(
      content.includes('export { calculateCompleteness, getCompletenessTier };'),
      'StudentProfile.jsx must re-export completeness functions for backwards compatibility'
    );
  });

  test('DriveApplicants.jsx re-exports calculateCompleteness and getCompletenessTier', () => {
    const driveApplicantsPath = path.resolve(__dirname, '../../client/src/pages/officer/DriveApplicants.jsx');
    const content = fs.readFileSync(driveApplicantsPath, 'utf8');
    assert.ok(
      content.includes("from '../../utils/profileCompleteness'"),
      'DriveApplicants.jsx must import shared completeness utility'
    );
    assert.ok(
      content.includes('calculateCompleteness,') && content.includes('getCompletenessTier,'),
      'DriveApplicants.jsx must export calculateCompleteness and getCompletenessTier'
    );
  });

  // -----------------------------------------------------------------
  // 7. [BEHAVIORAL - OFFICER EVALUATION MODAL INTEGRATION]
  // -----------------------------------------------------------------
  console.log('\n--- 7. [BEHAVIORAL - OFFICER EVALUATION MODAL INTEGRATION] ---');

  test('Populated student record from getDriveApplicants API calculates valid completeness & tier', () => {
    const apiStudentCandidate = {
      _id: 'user-001',
      name: 'Arjun Kumar',
      email: 'arjun.ece@college.edu',
      rollNo: '2022EC12',
      branch: 'ECE',
      phone: '9123456789',
      cgpa: 6.8,
      activeBacklogs: 1,
      passingYear: 2026,
      academicDetails: {
        tenthPercentage: 82,
        twelfthPercentage: 78,
        diplomaPercentage: null,
        currentSemester: 7,
        gapYears: 0,
      },
      skills: ['C++', 'Embedded Systems'],
      resumeFile: {
        filename: 'arjun-resume.pdf',
        originalName: 'Arjun_Resume.pdf',
      },
      projects: [{ title: 'IoT Weather Station', techStack: 'Arduino, C++' }],
      certifications: [],
      links: {
        github: '',
        linkedin: 'https://linkedin.com/in/arjunkumar',
        portfolio: '',
      },
    };

    const completeness = calculateCompleteness(apiStudentCandidate);
    const tier = getCompletenessTier(completeness.percentage);

    assert.strictEqual(completeness.percentage, 100);
    assert.strictEqual(tier.label, 'Placement Ready');
    assert.strictEqual(completeness.isComplete, true);
  });

  test('Corrupted or partially populated candidate student object evaluates safely', () => {
    const corruptedCandidate = {
      _id: 'user-002',
      name: 'Incomplete Candidate',
      academicDetails: null,
      skills: null,
      projects: null,
      certifications: null,
      links: null,
    };

    const completeness = calculateCompleteness(corruptedCandidate);
    assert.strictEqual(typeof completeness.percentage, 'number');
    assert.strictEqual(completeness.percentage, 0);
    assert.strictEqual(completeness.isComplete, false);

    const tier = getCompletenessTier(completeness.percentage);
    assert.strictEqual(tier.label, 'Profile In Progress');
  });

  // -----------------------------------------------------------------
  // 8. [BEHAVIORAL - COMPLETENESS DOES NOT BLOCK ELIGIBILITY]
  // -----------------------------------------------------------------
  console.log('\n--- 8. [BEHAVIORAL - COMPLETENESS DOES NOT AFFECT ELIGIBILITY] ---');

  let sortingModule;
  try {
    const modulePath = path.resolve(__dirname, '../../client/src/utils/applicantSorting.js');
    sortingModule = await import(`file://${modulePath.replace(/\\/g, '/')}`);
  } catch (err) {
    console.error('Failed to import applicantSorting.js:', err);
    process.exit(1);
  }

  const { evaluateEligibility } = sortingModule;

  test('Student with 0% profile completeness is ELIGIBLE if drive criteria are met', () => {
    const zeroCompletenessStudent = {
      name: 'Fresh Student',
      email: 'fresh@college.edu',
      branch: 'CSE',
      cgpa: 8.5,
      activeBacklogs: 0,
      // No projects, no resume, no links, no certs, no extended academic
    };

    const drive = {
      eligibility: {
        allowedBranches: ['CSE', 'IT'],
        minCGPA: 7.0,
        maxBacklogs: 0,
      },
    };

    const completeness = calculateCompleteness(zeroCompletenessStudent);
    assert.strictEqual(completeness.percentage, 0); // 0% completeness

    const eligibility = evaluateEligibility(zeroCompletenessStudent, drive);
    assert.strictEqual(eligibility.isEligible, true, 'Zero completeness student MUST remain eligible');
  });

  test('Student with 100% profile completeness is INELIGIBLE if backlog or CGPA criteria fail', () => {
    const completeIneligibleStudent = {
      name: 'Full Profile Ineligible',
      email: 'full@college.edu',
      rollNo: '2022CS99',
      branch: 'CSE',
      phone: '9876543210',
      cgpa: 6.2, // Drive requires 7.5
      activeBacklogs: 2, // Drive allows 0
      passingYear: 2026,
      tenthPercentage: 90,
      twelfthPercentage: 90,
      currentSemester: 7,
      skills: ['React', 'Node.js'],
      resumeFile: { filename: 'res.pdf' },
      projects: [{ title: 'App' }],
      github: 'https://github.com/app',
    };

    const drive = {
      eligibility: {
        allowedBranches: ['CSE'],
        minCGPA: 7.5,
        maxBacklogs: 0,
      },
    };

    const completeness = calculateCompleteness(completeIneligibleStudent);
    assert.strictEqual(completeness.percentage, 100); // 100% completeness

    const eligibility = evaluateEligibility(completeIneligibleStudent, drive);
    assert.strictEqual(eligibility.isEligible, false, '100% completeness must not bypass eligibility checks');
    assert.ok(eligibility.details.some(d => !d.passed && d.criteria.includes('CGPA')));
    assert.ok(eligibility.details.some(d => !d.passed && d.criteria.includes('Backlog')));
  });

  // -----------------------------------------------------------------
  // 9. [BEHAVIORAL & SECURITY - CROSS-STUDENT RESUME ACCESS & DB INTEGRITY]
  // -----------------------------------------------------------------
  console.log('\n--- 9. [BEHAVIORAL & SECURITY - CROSS-STUDENT RESUME ACCESS] ---');

  await asyncTest('Backend returns 403 Forbidden when Student A requests Student B resume file', async () => {
    const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));
    const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));
    require(path.join(__dirname, '../../server/node_modules/dotenv')).config({
      path: path.join(__dirname, '../../server/.env'),
    });

    await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
    const db = mongoose.connection.db;

    const students = await db
      .collection('users')
      .find({ role: 'student' }, { projection: { _id: 1, name: 1, role: 1 } })
      .toArray();

    assert.ok(students.length >= 2, 'Need at least 2 students to test cross-student authorization');

    const studentA = students[0];
    const studentB = students[1];

    // Sign a token for Student A
    const tokenStudentA = jwt.sign(
      { id: studentA._id.toString(), role: studentA.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Sign a token for Officer
    const officer = await db
      .collection('users')
      .findOne({ role: 'officer' }, { projection: { _id: 1, role: 1 } });

    let tokenOfficer = null;
    if (officer) {
      tokenOfficer = jwt.sign(
        { id: officer._id.toString(), role: officer.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    // 1. Cross-student resume download attempt: Student A attempts to download Student B's resume
    const resForbidden = await fetch(`http://localhost:5000/api/auth/resume-download/${studentB._id.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenStudentA}`,
      },
    });

    assert.strictEqual(
      resForbidden.status,
      403,
      'Student A accessing Student B resume MUST be rejected with HTTP 403 Forbidden'
    );

    const forbiddenJson = await resForbidden.json();
    assert.strictEqual(forbiddenJson.success, false);
    assert.strictEqual(forbiddenJson.message, 'You are not authorized to access this resume');

    // 2. Unauthenticated request MUST be rejected with 401 Unauthorized
    const resUnauth = await fetch(`http://localhost:5000/api/auth/resume-download/${studentB._id.toString()}`, {
      method: 'GET',
    });
    assert.strictEqual(
      resUnauth.status,
      401,
      'Unauthenticated resume request MUST return 401 Unauthorized'
    );

    // 3. Officer accessing student resume is NOT blocked by authorization (not 403)
    if (tokenOfficer) {
      const resOfficer = await fetch(`http://localhost:5000/api/auth/resume-download/${studentA._id.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenOfficer}`,
        },
      });
      assert.notStrictEqual(
        resOfficer.status,
        403,
        'Officer accessing student resume must NOT be rejected with 403 Forbidden'
      );
    }

    // Check counts while connected
    console.log('\n--- 10. [BEHAVIORAL - DATABASE READ-ONLY INTEGRITY] ---');
    const usersCount = await db.collection('users').countDocuments();
    const drivesCount = await db.collection('placementdrives').countDocuments();
    const appsCount = await db.collection('applications').countDocuments();
    const notifsCount = await db.collection('notifications').countDocuments();

    console.log(`   - Users: ${usersCount} (Expected: 6)`);
    console.log(`   - Placement Drives: ${drivesCount} (Expected: 7)`);
    console.log(`   - Applications: ${appsCount} (Expected: 12)`);
    console.log(`   - Notifications: ${notifsCount} (Expected: 22)`);

    assert.strictEqual(usersCount, 6, 'users collection count must remain 6');
    assert.strictEqual(drivesCount, 7, 'placementdrives collection count must remain 7');
    assert.strictEqual(appsCount, 12, 'applications collection count must remain 12');
    assert.strictEqual(notifsCount, 22, 'notifications collection count must remain 22');

    await mongoose.disconnect();
  });

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exitCode = 1;
});
