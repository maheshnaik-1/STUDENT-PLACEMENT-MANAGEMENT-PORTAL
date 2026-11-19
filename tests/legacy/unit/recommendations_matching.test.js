/**
 * recommendations_matching.test.js
 * Focused regression test suite for Placement Recommendations and Skill Matching workflows:
 * 1. Deterministic skill normalization and alias resolution
 * 2. CalculateSkillMatch accuracy: full match, partial match, zero candidate skills, empty drive requirements
 * 3. Recommendation ranking order: academic eligibility precedence, skill score ranking, drive date tie-breaking
 * 4. Academic eligibility separation: CGPA, branch, and backlog checks independent of skills
 * 5. Consistency between student match-score endpoint and officer match-scores endpoint
 * 6. Baseline / No Skill Filter handling for empty requiredSkills
 */

const path = require('path');
const {
  normalizeSkill,
  normalizeSkillList,
  parseRequirementSlot,
  calculateSkillMatch,
} = require(path.join(__dirname, '../../server/services/skillMatcher'));
const {
  checkStudentEligibility,
  getRecommendationRankPriority,
} = require(path.join(__dirname, '../../server/controllers/driveController'));

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
  console.log('  TEST SUITE: RECOMMENDATIONS & SKILL MATCHING WORKFLOWS');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. Skill Normalization & Canonical Aliasing
  // -----------------------------------------------------------------
  console.log('--- 1. Skill Normalization & Canonical Aliasing ---');
  assert(normalizeSkill('js') === 'JavaScript', 'Alias "js" normalizes to "JavaScript"');
  assert(normalizeSkill('react.js') === 'React', 'Alias "react.js" normalizes to "React"');
  assert(normalizeSkill('reactjs') === 'React', 'Alias "reactjs" normalizes to "React"');
  assert(normalizeSkill('cpp') === 'C++', 'Alias "cpp" normalizes to "C++"');
  assert(normalizeSkill('cplusplus') === 'C++', 'Alias "cplusplus" normalizes to "C++"');
  assert(normalizeSkill('dsa') === 'Data Structures & Algorithms', 'Alias "dsa" normalizes to "Data Structures & Algorithms"');
  assert(normalizeSkill('node-js') === 'Node.js', 'Hyphenated "node-js" normalizes to "Node.js"');
  assert(normalizeSkill('   python3   ') === 'Python', 'Trimmed "python3" normalizes to "Python"');

  const list = normalizeSkillList(['react', 'React.js', 'js', 'SQL', '', null, 'Node']);
  assert(list.length === 4 && list.includes('React') && list.includes('JavaScript') && list.includes('SQL') && list.includes('Node.js'),
    'normalizeSkillList eliminates duplicates across aliases and strips null/empty items');

  // -----------------------------------------------------------------
  // 2. Skill Match Engine Calculation (Deterministic Scenarios)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Skill Match Engine Scenarios ---');

  // Scenario A: Exact 100% match
  const match100 = calculateSkillMatch(['React', 'Node.js', 'SQL'], ['React', 'Node.js', 'SQL']);
  assert(match100.score === 100, 'Exact match returns score 100');
  assert(match100.matchedSkills.length === 3, 'All 3 required skills matched');
  assert(match100.missingSkills.length === 0, 'Zero missing skills');

  // Scenario B: Partial Match (2 of 3)
  const match67 = calculateSkillMatch(['React', 'Java', 'Docker'], ['React', 'Java', 'SQL']);
  assert(match67.score === 67, '2 of 3 matched yields rounded 67%');
  assert(match67.matchedSkills.includes('React') && match67.matchedSkills.includes('Java'), 'Matched skills include React and Java');
  assert(match67.missingSkills.includes('SQL'), 'Missing skills include SQL');
  assert(match67.additionalSkills.includes('Docker'), 'Additional skills identified');

  // Scenario C: Zero Match / Candidate has no skills
  const match0 = calculateSkillMatch([], ['Python', 'AWS']);
  assert(match0.score === 0, 'Candidate with no skills gets score 0');
  assert(match0.missingSkills.length === 2, 'All required skills marked missing');

  // Scenario D: Baseline / No Skill Filter (empty requiredSkills)
  const matchBaseline = calculateSkillMatch(['React', 'Python'], []);
  assert(matchBaseline.score === 100, 'Drive with no required skills returns baseline score 100');
  assert(matchBaseline.totalRequired === 0, 'totalRequired is 0');
  assert(matchBaseline.matchedSkills.length === 0, 'matchedSkills is empty for baseline drive');
  assert(matchBaseline.missingSkills.length === 0, 'missingSkills is empty for baseline drive');
  assert(matchBaseline.explanation.includes('baseline 100% match score'), 'Explanation explicitly identifies baseline score disclaimer');

  // -----------------------------------------------------------------
  // 3. Academic Eligibility Separation
  // -----------------------------------------------------------------
  console.log('\n--- 3. Academic Eligibility Separation ---');

  const eligibleStudent = {
    role: 'student',
    branch: 'CSE',
    cgpa: 8.5,
    activeBacklogs: 0,
    passingYear: 2026,
  };

  const ineligibleStudent = {
    role: 'student',
    branch: 'MECH',
    cgpa: 6.2,
    activeBacklogs: 2,
    passingYear: 2026,
  };

  const strictDrive = {
    eligibility: {
      minCGPA: 8.0,
      allowedBranches: ['CSE', 'IT'],
      maxBacklogs: 0,
      passingYear: 2026,
    },
  };

  const resEligible = checkStudentEligibility(eligibleStudent, strictDrive);
  assert(resEligible.isEligible === true && resEligible.reasons.length === 0, 'Eligible student passes all checks');

  const resIneligible = checkStudentEligibility(ineligibleStudent, strictDrive);
  assert(resIneligible.isEligible === false, 'Ineligible student fails check');
  assert(resIneligible.reasons.length === 3, 'All 3 violations captured (CGPA, Branch, Backlogs)');
  assert(resIneligible.reasons.some((r) => r.includes('CGPA requirement not met')), 'CGPA violation reported');
  assert(resIneligible.reasons.some((r) => r.includes('Branch')), 'Branch mismatch reported');
  assert(resIneligible.reasons.some((r) => r.includes('Active backlogs')), 'Active backlog violation reported');

  // Officer check (Officers bypass student restrictions)
  const officerUser = { role: 'officer' };
  const resOfficer = checkStudentEligibility(officerUser, strictDrive);
  assert(resOfficer.isEligible === true, 'Officers are unrestricted');

  // -----------------------------------------------------------------
  // 4. Recommendation Ranking Priority Order
  // -----------------------------------------------------------------
  console.log('\n--- 4. Recommendation Ranking Order Contract ---');

  // A. Priority Function Tests
  const pGenuine100 = getRecommendationRankPriority({
    academicEligibility: { isEligible: true },
    skillMatch: { totalRequired: 3, score: 100 },
  });
  assert(pGenuine100 === 1, 'Genuine 100% technical match receives Priority 1');

  const pGenuine67 = getRecommendationRankPriority({
    academicEligibility: { isEligible: true },
    skillMatch: { totalRequired: 3, score: 67 },
  });
  assert(pGenuine67 === 1, 'Genuine partial (67%) technical match receives Priority 1');

  const pBaseline = getRecommendationRankPriority({
    academicEligibility: { isEligible: true },
    skillMatch: { totalRequired: 0, score: 100 },
  });
  assert(pBaseline === 2, 'No Skill Filter baseline drive receives Priority 2');

  const pZeroMatch = getRecommendationRankPriority({
    academicEligibility: { isEligible: true },
    skillMatch: { totalRequired: 4, score: 0 },
  });
  assert(pZeroMatch === 3, 'Zero technical match (0%) receives Priority 3');

  const pIneligible = getRecommendationRankPriority({
    academicEligibility: { isEligible: false },
    skillMatch: { totalRequired: 4, score: 100 },
  });
  assert(pIneligible === 4, 'Academically ineligible drive receives Priority 4 regardless of 100% skill score');

  // B. Full Comparator Sorting Test
  const mockDrives = [
    {
      id: 'D1_INELIGIBLE_100_MATCH',
      academicEligibility: { isEligible: false },
      skillMatch: { totalRequired: 4, score: 100 },
      driveDate: new Date('2026-10-10'),
    },
    {
      id: 'D2_ELIGIBLE_67_MATCH',
      academicEligibility: { isEligible: true },
      skillMatch: { totalRequired: 3, score: 67 },
      driveDate: new Date('2026-10-15'),
    },
    {
      id: 'D3_ELIGIBLE_BASELINE',
      academicEligibility: { isEligible: true },
      skillMatch: { totalRequired: 0, score: 100 },
      driveDate: new Date('2026-10-20'),
    },
    {
      id: 'D4_ELIGIBLE_0_MATCH',
      academicEligibility: { isEligible: true },
      skillMatch: { totalRequired: 4, score: 0 },
      driveDate: new Date('2026-10-08'),
    },
    {
      id: 'D5_ELIGIBLE_100_MATCH',
      academicEligibility: { isEligible: true },
      skillMatch: { totalRequired: 3, score: 100 },
      driveDate: new Date('2026-10-12'),
    },
  ];

  // Exact comparator from driveController.js
  mockDrives.sort((a, b) => {
    const priorityA = getRecommendationRankPriority(a);
    const priorityB = getRecommendationRankPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    if (b.skillMatch.score !== a.skillMatch.score) {
      return b.skillMatch.score - a.skillMatch.score;
    }
    return new Date(a.driveDate) - new Date(b.driveDate);
  });

  assert(mockDrives[0].id === 'D5_ELIGIBLE_100_MATCH', 'Rank 1: Eligible 100% technical match');
  assert(mockDrives[1].id === 'D2_ELIGIBLE_67_MATCH', 'Rank 2: Eligible 67% technical match ranks above Baseline');
  assert(mockDrives[2].id === 'D3_ELIGIBLE_BASELINE', 'Rank 3: Eligible Baseline / No Skill Filter ranks as separate tier');
  assert(mockDrives[3].id === 'D4_ELIGIBLE_0_MATCH', 'Rank 4: Eligible 0% technical match ranks below Baseline');
  assert(mockDrives[4].id === 'D1_INELIGIBLE_100_MATCH', 'Rank 5: Ineligible drive is placed at bottom');

  // -----------------------------------------------------------------
  // 5. Live API Contract Validation
  // -----------------------------------------------------------------
  console.log('\n--- 5. Live Backend API Response Contracts ---');

  const API_BASE = 'http://localhost:5000/api';
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul.cse@college.edu', password: 'Student@123' }),
  });
  const rahulAuth = await loginRes.json();

  if (rahulAuth.success) {
    const token = rahulAuth.token;

    // Check GET /api/drives/recommendations
    const recsRes = await fetch(`${API_BASE}/drives/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const recsData = await recsRes.json();

    assert(recsData.success === true, 'GET /api/drives/recommendations returns HTTP 200 with success: true');
    assert(Array.isArray(recsData.data) && recsData.data.length > 0, 'Recommendations return array of drive items');

    const firstRec = recsData.data[0];
    assert(firstRec.academicEligibility !== undefined, 'Drive item includes academicEligibility object');
    assert(typeof firstRec.academicEligibility.isEligible === 'boolean', 'academicEligibility.isEligible is boolean');
    assert(firstRec.skillMatch !== undefined, 'Drive item includes skillMatch object');
    assert(typeof firstRec.skillMatch.score === 'number', 'skillMatch.score is a number');
    assert(typeof firstRec.recommendationTier === 'string', 'recommendationTier is a string');
    // Verify Web Development drive dynamic match calculation agreement
    const webDevRec = recsData.data.find((d) => d.title === 'Web Development');
    assert(Boolean(webDevRec), 'Web Development drive is present in recommendations list');
    if (webDevRec) {
      const studentSkills = rahulAuth.user?.skills || [];
      const expectedWebDevMatch = calculateSkillMatch(studentSkills, webDevRec.requiredSkills);
      assert(
        webDevRec.skillMatch.score === expectedWebDevMatch.score,
        `Web Development live match score (${webDevRec.skillMatch.score}%) dynamically agrees with candidate skills calculation (${expectedWebDevMatch.score}%)`
      );
      assert(webDevRec.academicEligibility.isEligible === true, 'Web Development drive is academically eligible for student');
    }

    // Verify Baseline / No Skill Filter drives exist and have correct tier & score
    const baselineDrives = recsData.data.filter((d) => d.skillMatch.totalRequired === 0);
    assert(baselineDrives.length >= 2, 'Baseline drives with No Skill Filter (Amazon & Deloitte) are present in recommendations');
    const allBaselinesValid = baselineDrives.every(
      (d) => d.skillMatch.score === 100 && d.recommendationTier === 'No Skill Filter' && getRecommendationRankPriority(d) === 2
    );
    assert(allBaselinesValid, 'All baseline drives receive score 100, "No Skill Filter" tier, and Priority 2');

    // Verify Live Ranking Order Invariant across entire list:
    // 1. Priority tier monotonic order (Priority 1 <= Priority 2 <= Priority 3 <= Priority 4)
    // 2. Score descending within same priority tier
    // 3. Drive date tie-breaker
    let rankingContractPreserved = true;
    for (let i = 0; i < recsData.data.length - 1; i++) {
      const curr = recsData.data[i];
      const next = recsData.data[i + 1];
      const pCurr = getRecommendationRankPriority(curr);
      const pNext = getRecommendationRankPriority(next);

      if (pCurr > pNext) {
        rankingContractPreserved = false;
        break;
      }
      if (pCurr === pNext && curr.skillMatch.score < next.skillMatch.score) {
        rankingContractPreserved = false;
        break;
      }
      if (pCurr === pNext && curr.skillMatch.score === next.skillMatch.score) {
        if (new Date(curr.driveDate) > new Date(next.driveDate)) {
          rankingContractPreserved = false;
          break;
        }
      }
    }
    assert(rankingContractPreserved, 'Live recommendations list strictly obeys priority tier, score descending, and date tie-breaker hierarchy');

    // Genuine technical skill matches (Priority 1) strictly precede baseline No Skill Filter drives (Priority 2)
    const genuineMatches = recsData.data.filter(
      (d) => d.academicEligibility.isEligible && d.skillMatch.totalRequired > 0 && d.skillMatch.score > 0
    );
    if (genuineMatches.length > 0 && baselineDrives.length > 0) {
      const maxGenuineIdx = Math.max(...genuineMatches.map((d) => recsData.data.indexOf(d)));
      const minBaselineIdx = Math.min(...baselineDrives.map((d) => recsData.data.indexOf(d)));
      assert(
        maxGenuineIdx < minBaselineIdx,
        'Genuine technical skill matches (Priority 1) strictly precede baseline No Skill Filter drives (Priority 2)'
      );
    }

    // Check GET /api/drives/:id/match-score
    const singleScoreRes = await fetch(`${API_BASE}/drives/${firstRec._id}/match-score`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const singleScoreData = await singleScoreRes.json();

    assert(singleScoreData.success === true, 'GET /api/drives/:id/match-score returns success: true');
    assert(singleScoreData.data.driveId.toString() === firstRec._id.toString(), 'Match score references correct driveId');
    assert(singleScoreData.data.skillMatch.score === firstRec.skillMatch.score, 'Individual drive match score agrees with recommendation list score');
    assert(singleScoreData.data.academicEligibility.isEligible === firstRec.academicEligibility.isEligible, 'Individual drive eligibility agrees with recommendation list eligibility');
  } else {
    console.warn('  [SKIP] Live API tests skipped (backend offline or credentials altered)');
  }

  // -----------------------------------------------------------------
  // 6. Officer Applicant Match Score API Contract
  // -----------------------------------------------------------------
  console.log('\n--- 6. Officer Applicant Match Scores Contract ---');
  const officerLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@college.edu', password: 'Officer@123' }),
  });
  const officerAuth = await officerLogin.json();

  if (officerAuth.success) {
    const officerToken = officerAuth.token;
    // Test on Google Web Dev drive
    const driveId = '6ac35bd533bf145003f883df';
    const officerScoresRes = await fetch(`${API_BASE}/applications/drive/${driveId}/match-scores`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const officerScoresData = await officerScoresRes.json();

    assert(officerScoresData.success === true, 'GET /api/applications/drive/:driveId/match-scores returns success: true');
    assert(officerScoresData.data.scoreDistribution !== undefined, 'Officer match score contains scoreDistribution breakdown');
    assert(Array.isArray(officerScoresData.data.applicants), 'Officer response contains applicants array');

    if (officerScoresData.data.applicants.length > 0) {
      const applicant = officerScoresData.data.applicants[0];
      assert(applicant.student !== undefined, 'Applicant contains student career profile');
      assert(applicant.academicEligibility !== undefined, 'Applicant contains academicEligibility');
      assert(applicant.skillMatch !== undefined, 'Applicant contains skillMatch');
      assert(typeof applicant.skillMatch.score === 'number', 'Applicant skillMatch.score is numeric');
    }
  }

  // -----------------------------------------------------------------
  // 7. Alternative Skill Requirements & Backward Compatibility
  // -----------------------------------------------------------------
  console.log('\n--- 7. Alternative Skill Requirements & Backward Compatibility ---');

  // A. Slot Parsing and Delimiter Handling
  const slotSlash = parseRequirementSlot('Java / Python / C++');
  assert(slotSlash.isAlternative === true, 'Slash " / " parses as alternative slot');
  assert(slotSlash.canonical === 'Java / Python / C++', 'Canonical form is "Java / Python / C++"');
  assert(slotSlash.options.length === 3 && slotSlash.options[0] === 'Java' && slotSlash.options[1] === 'Python' && slotSlash.options[2] === 'C++',
    'Parses all 3 options correctly: Java, Python, C++');

  const slotPipe = parseRequirementSlot('Java | Python | C++');
  assert(slotPipe.isAlternative === true, 'Pipe " | " parses as alternative slot');
  assert(slotPipe.canonical === 'Java / Python / C++', 'Pipe options normalize to standard canonical "Java / Python / C++"');

  const slotPipeDense = parseRequirementSlot('Java|Python|C++');
  assert(slotPipeDense.isAlternative === true, 'Dense pipe "|" parses as alternative slot');

  const slotOr = parseRequirementSlot('Java or Python or C++');
  assert(slotOr.isAlternative === true, 'Word " or " parses as alternative slot');

  const slotCicd = parseRequirementSlot('CI/CD');
  assert(slotCicd.isAlternative === false, 'Literal slash in "CI/CD" is not confused with an alternative');
  assert(slotCicd.canonical === 'CI/CD', 'Canonical is "CI/CD"');

  const slotCicdAlt = parseRequirementSlot('CI/CD / Docker');
  assert(slotCicdAlt.isAlternative === true, 'Compound "CI/CD / Docker" parses "CI/CD" and "Docker" as alternatives');
  assert(slotCicdAlt.options[0] === 'CI/CD' && slotCicdAlt.options[1] === 'Docker', 'Options preserve "CI/CD" and "Docker"');

  const slotPlsql = parseRequirementSlot('PL/SQL');
  assert(slotPlsql.isAlternative === false, 'Literal slash in "PL/SQL" is not confused with an alternative');

  const slotTcpIp = parseRequirementSlot('TCP/IP');
  assert(slotTcpIp.isAlternative === false, 'Literal slash in "TCP/IP" is not confused with an alternative');

  const slotStandard = parseRequirementSlot('React');
  assert(slotStandard.isAlternative === false && slotStandard.canonical === 'React', 'Standard skill "React" parses normally');

  // B. Matching First Alternative
  const matchFirst = calculateSkillMatch(['Java'], ['Java / Python / C++']);
  assert(matchFirst.totalRequired === 1, 'First alternative match: totalRequired is 1');
  assert(matchFirst.totalMatched === 1, 'First alternative match: totalMatched is 1');
  assert(matchFirst.score === 100, 'First alternative match: score is 100');
  assert(matchFirst.matchedSkills.includes('Java'), 'First alternative match: matchedSkills includes Java');
  assert(matchFirst.missingSkills.length === 0, 'First alternative match: missingSkills is empty');

  // C. Matching Middle Alternative
  const matchMiddle = calculateSkillMatch(['Python'], ['Java / Python / C++']);
  assert(matchMiddle.totalRequired === 1, 'Middle alternative match: totalRequired is 1');
  assert(matchMiddle.totalMatched === 1, 'Middle alternative match: totalMatched is 1');
  assert(matchMiddle.score === 100, 'Middle alternative match: score is 100');
  assert(matchMiddle.matchedSkills.includes('Python'), 'Middle alternative match: matchedSkills includes Python');
  assert(matchMiddle.missingSkills.length === 0, 'Middle alternative match: missingSkills is empty');

  // D. Matching Last Alternative
  const matchLast = calculateSkillMatch(['C++'], ['Java / Python / C++']);
  assert(matchLast.totalRequired === 1, 'Last alternative match: totalRequired is 1');
  assert(matchLast.totalMatched === 1, 'Last alternative match: totalMatched is 1');
  assert(matchLast.score === 100, 'Last alternative match: score is 100');
  assert(matchLast.matchedSkills.includes('C++'), 'Last alternative match: matchedSkills includes C++');
  assert(matchLast.missingSkills.length === 0, 'Last alternative match: missingSkills is empty');

  // E. Matching None of the Alternatives
  const matchNone = calculateSkillMatch(['Ruby', 'Go'], ['Java / Python / C++']);
  assert(matchNone.totalRequired === 1, 'Match none: totalRequired is 1');
  assert(matchNone.totalMatched === 0, 'Match none: totalMatched is 0');
  assert(matchNone.score === 0, 'Match none: score is 0');
  assert(matchNone.matchedSkills.length === 0, 'Match none: matchedSkills is empty');
  assert(matchNone.missingSkills.length === 1 && matchNone.missingSkills[0] === 'Java / Python / C++',
    'Match none: missingSkills contains entire alternative group requirement');
  assert(matchNone.additionalSkills.includes('Ruby') && matchNone.additionalSkills.includes('Go'),
    'Match none: unmatched candidate skills correctly placed in additionalSkills');

  // F. Matching Multiple Alternatives in the Same Group
  const matchMulti = calculateSkillMatch(['Java', 'Python'], ['Java / Python / C++']);
  assert(matchMulti.totalRequired === 1, 'Multiple alternatives: alternative group counts as 1 requirement');
  assert(matchMulti.totalMatched === 1, 'Multiple alternatives: totalMatched is 1 (not 2)');
  assert(matchMulti.score === 100, 'Multiple alternatives: score is capped at 100');
  assert(matchMulti.matchedSkills.includes('Java') && matchMulti.matchedSkills.includes('Python'),
    'Multiple alternatives: all satisfied candidate options recorded in matchedSkills');
  assert(matchMulti.missingSkills.length === 0, 'Multiple alternatives: zero missing skills');

  const matchAllThree = calculateSkillMatch(['Java', 'Python', 'C++'], ['Java / Python / C++']);
  assert(matchAllThree.totalRequired === 1 && matchAllThree.totalMatched === 1 && matchAllThree.score === 100,
    'All three alternatives matched: counts as 1 requirement, score is 100');

  // G. Mixed Mandatory and Alternative Requirements
  const mixedDrive = ['React', 'Java / Python / C++', 'SQL'];
  
  // Mixed Candidate 1: React + Python (matches mandatory React + middle alternative Python)
  const mixedCand1 = calculateSkillMatch(['React', 'Python'], mixedDrive);
  assert(mixedCand1.totalRequired === 3, 'Mixed drive: totalRequired is 3');
  assert(mixedCand1.totalMatched === 2, 'Mixed cand 1: totalMatched is 2');
  assert(mixedCand1.score === 67, 'Mixed cand 1: score is 67% (2 of 3)');
  assert(mixedCand1.matchedSkills.includes('React') && mixedCand1.matchedSkills.includes('Python'),
    'Mixed cand 1: matchedSkills has React and Python');
  assert(mixedCand1.missingSkills.length === 1 && mixedCand1.missingSkills[0] === 'SQL',
    'Mixed cand 1: missingSkills has SQL');
  assert(mixedCand1.explanation.includes('2 of 3 required skills matched (67%)'),
    'Mixed cand 1: explanation explains 2 of 3 match');

  // Mixed Candidate 2: React + Ruby (matches React, misses alternative group and SQL)
  const mixedCand2 = calculateSkillMatch(['React', 'Ruby'], mixedDrive);
  assert(mixedCand2.totalRequired === 3, 'Mixed cand 2: totalRequired is 3');
  assert(mixedCand2.totalMatched === 1, 'Mixed cand 2: totalMatched is 1');
  assert(mixedCand2.score === 33, 'Mixed cand 2: score is 33% (1 of 3)');
  assert(mixedCand2.matchedSkills.length === 1 && mixedCand2.matchedSkills[0] === 'React',
    'Mixed cand 2: matchedSkills has only React');
  assert(mixedCand2.missingSkills.includes('Java / Python / C++') && mixedCand2.missingSkills.includes('SQL'),
    'Mixed cand 2: missingSkills has alternative group and SQL');
  assert(mixedCand2.additionalSkills.includes('Ruby'), 'Mixed cand 2: Ruby is in additionalSkills');

  // Mixed Candidate 3: React + Java + Python + SQL (satisfies all mandatory + multiple alternatives)
  const mixedCand3 = calculateSkillMatch(['React', 'Java', 'Python', 'SQL'], mixedDrive);
  assert(mixedCand3.totalRequired === 3, 'Mixed cand 3: totalRequired is 3');
  assert(mixedCand3.totalMatched === 3, 'Mixed cand 3: totalMatched is 3');
  assert(mixedCand3.score === 100, 'Mixed cand 3: score is 100%');
  assert(mixedCand3.missingSkills.length === 0, 'Mixed cand 3: zero missing skills');

  // H. Punctuation and Case Normalization
  const matchNorm1 = calculateSkillMatch(['cplusplus'], ['  java  /   python3   /   cpp   ']);
  assert(matchNorm1.totalRequired === 1 && matchNorm1.totalMatched === 1 && matchNorm1.score === 100,
    'Normalization: "cpp" in requirement matches candidate "cplusplus" (both resolve to C++)');
  assert(matchNorm1.matchedSkills.includes('C++'), 'Normalized matchedSkill is canonical "C++"');

  const matchNorm2 = calculateSkillMatch(['PYTHON'], ['java | python | c plus plus']);
  assert(matchNorm2.totalRequired === 1 && matchNorm2.totalMatched === 1 && matchNorm2.score === 100,
    'Normalization: uppercase "PYTHON" matches lower "python" across pipe alternative group');
  assert(matchNorm2.matchedSkills.includes('Python'), 'Normalized matchedSkill is canonical "Python"');

  const normList = normalizeSkillList(['java / python / cpp', 'react', 'SQL']);
  assert(normList.length === 3 && normList[0] === 'Java / Python / C++' && normList[1] === 'React' && normList[2] === 'SQL',
    'normalizeSkillList normalizes internal options in alternative groups to canonical form');

  // I. Backward Compatibility for Existing Drives
  const legacyMatch = calculateSkillMatch(['React', 'Java', 'Python', 'AWS'], ['React', 'Java', 'SQL']);
  assert(legacyMatch.totalRequired === 3 && legacyMatch.totalMatched === 2 && legacyMatch.score === 67,
    'Backward compatibility: existing drives with standard skill arrays behave identically');
  assert(legacyMatch.missingSkills[0] === 'SQL', 'Backward compatibility: missing skill is SQL');

  const emptyDriveMatch = calculateSkillMatch(['React', 'Node.js'], []);
  assert(emptyDriveMatch.totalRequired === 0 && emptyDriveMatch.totalMatched === 0 && emptyDriveMatch.score === 100,
    'Backward compatibility: empty requiredSkills baseline drive receives score 100');

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
