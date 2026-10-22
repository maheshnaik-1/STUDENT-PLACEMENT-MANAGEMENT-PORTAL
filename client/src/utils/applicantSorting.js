/**
 * applicantSorting.js
 * Shared utility for Drive Applicant sorting and academic eligibility evaluation.
 * Used by officer drive applicant views and automated regression suites.
 */

export const SORT_OPTIONS = [
  { value: 'applied_desc', label: 'Applied Date: Newest First' },
  { value: 'applied_asc', label: 'Applied Date: Oldest First' },
  { value: 'cgpa_desc', label: 'CGPA: Highest to Lowest' },
  { value: 'cgpa_asc', label: 'CGPA: Lowest to Highest' },
  { value: 'name_asc', label: 'Candidate Name: A to Z' },
  { value: 'name_desc', label: 'Candidate Name: Z to A' },
  { value: 'match_desc', label: 'Skill Match Score: Highest First' },
];

/**
 * Defensive timestamp extractor that never returns NaN.
 * Fallbacks safely to 0 (Unix epoch) for null, undefined, or unparseable strings.
 */
export const safeTime = (val) => {
  if (!val) return 0;
  const t = new Date(val).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Defensive finite number extractor that never returns NaN.
 * Fallbacks safely to defaultVal (0) for null, undefined, NaN, or non-numeric strings.
 */
export const safeNum = (val, defaultVal = 0) => {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : defaultVal;
  }
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : defaultVal;
};

/**
 * Reusable eligibility evaluation for Drive vs Candidate.
 * Supports canonical allowedBranches with backward compatibility for legacy eligibleBranches.
 *
 * @param {Object} student - Student profile object
 * @param {Object} drive - Placement drive object containing eligibility criteria
 * @returns {Object} { isEligible: Boolean, details: Array }
 */
export const evaluateEligibility = (student, drive) => {
  if (!student || !drive) return { isEligible: true, details: [] };

  const elig = drive.eligibility || {};
  const details = [];
  let isEligible = true;

  // 1. CGPA
  const minCGPA = safeNum(elig.minCGPA, 0);
  const studentCGPA = safeNum(student.cgpa, 0);
  const cgpaOk = studentCGPA >= minCGPA;
  if (!cgpaOk) isEligible = false;
  details.push({
    criteria: 'Minimum CGPA',
    required: `≥ ${minCGPA.toFixed(2)}`,
    actual: studentCGPA.toFixed(2),
    passed: cgpaOk,
  });

  // 2. Backlogs
  const maxBacklogs = elig.maxBacklogs !== undefined ? safeNum(elig.maxBacklogs, 0) : 0;
  const studentBacklogs = safeNum(student.activeBacklogs, 0);
  const backlogsOk = studentBacklogs <= maxBacklogs;
  if (!backlogsOk) isEligible = false;
  details.push({
    criteria: 'Max Backlogs',
    required: `≤ ${maxBacklogs}`,
    actual: `${studentBacklogs}`,
    passed: backlogsOk,
  });

  // 3. Branches (canonical allowedBranches first, then eligibleBranches for backward compatibility)
  const eligibleBranches =
    Array.isArray(elig.allowedBranches) && elig.allowedBranches.length > 0
      ? elig.allowedBranches
      : Array.isArray(elig.eligibleBranches) && elig.eligibleBranches.length > 0
        ? elig.eligibleBranches
        : [];
  const branchOk = eligibleBranches.length === 0 || eligibleBranches.includes(student.branch);
  if (!branchOk) isEligible = false;
  details.push({
    criteria: 'Eligible Branch',
    required: eligibleBranches.length > 0 ? eligibleBranches.join(', ') : 'All Branches',
    actual: student.branch || 'N/A',
    passed: branchOk,
  });

  // 4. Passing Year
  const reqPassingYear = safeNum(elig.passingYear, 0);
  const studentPassingYear = safeNum(student.passingYear, 0);
  const yearOk = !reqPassingYear || studentPassingYear === reqPassingYear;
  if (!yearOk) isEligible = false;
  if (reqPassingYear) {
    details.push({
      criteria: 'Passing Batch',
      required: `${reqPassingYear}`,
      actual: `${studentPassingYear || 'N/A'}`,
      passed: yearOk,
    });
  }

  return { isEligible, details };
};

/**
 * Safe, immutable applicant sorting supporting multiple modes and fallback tie-breakers.
 * Guarantees zero NaN returns and deterministic ordering even with dirty/missing data.
 *
 * @param {Array} applicantsList - Array of application objects
 * @param {String} sortBy - Sorting mode identifier
 * @returns {Array} Sorted copy of applicants array
 */
export const sortApplicants = (applicantsList = [], sortBy = 'applied_desc') => {
  const list = [...applicantsList];
  return list.sort((a, b) => {
    const studentA = a.student || {};
    const studentB = b.student || {};

    switch (sortBy) {
      case 'cgpa_desc': {
        const cgpaA = safeNum(studentA.cgpa, 0);
        const cgpaB = safeNum(studentB.cgpa, 0);
        if (cgpaB !== cgpaA) return cgpaB - cgpaA;
        // Secondary tie-breaker: newer applied date
        const timeDiff = safeTime(b.appliedAt) - safeTime(a.appliedAt);
        if (timeDiff !== 0) return timeDiff;
        // Tertiary tie-breaker: candidate name alphabetical
        return (studentA.name || '').localeCompare(studentB.name || '', undefined, { sensitivity: 'base' });
      }
      case 'cgpa_asc': {
        const cgpaA = safeNum(studentA.cgpa, 0);
        const cgpaB = safeNum(studentB.cgpa, 0);
        if (cgpaA !== cgpaB) return cgpaA - cgpaB;
        // Secondary tie-breaker: newer applied date
        const timeDiff = safeTime(b.appliedAt) - safeTime(a.appliedAt);
        if (timeDiff !== 0) return timeDiff;
        // Tertiary tie-breaker: candidate name alphabetical
        return (studentA.name || '').localeCompare(studentB.name || '', undefined, { sensitivity: 'base' });
      }
      case 'applied_asc': {
        const timeDiff = safeTime(a.appliedAt) - safeTime(b.appliedAt);
        if (timeDiff !== 0) return timeDiff;
        // Secondary tie-breaker: candidate name alphabetical
        return (studentA.name || '').localeCompare(studentB.name || '', undefined, { sensitivity: 'base' });
      }
      case 'applied_desc': {
        const timeDiff = safeTime(b.appliedAt) - safeTime(a.appliedAt);
        if (timeDiff !== 0) return timeDiff;
        // Secondary tie-breaker: candidate name alphabetical
        return (studentA.name || '').localeCompare(studentB.name || '', undefined, { sensitivity: 'base' });
      }
      case 'name_asc': {
        const nameA = (studentA.name || '').trim();
        const nameB = (studentB.name || '').trim();
        const nameDiff = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        // Secondary tie-breaker: newer applied date
        return safeTime(b.appliedAt) - safeTime(a.appliedAt);
      }
      case 'name_desc': {
        const nameA = (studentA.name || '').trim();
        const nameB = (studentB.name || '').trim();
        const nameDiff = nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        // Secondary tie-breaker: newer applied date
        return safeTime(b.appliedAt) - safeTime(a.appliedAt);
      }
      case 'match_desc': {
        const scoreA =
          a.matchScore !== undefined
            ? safeNum(a.matchScore, 0)
            : a.skillMatch?.score !== undefined
              ? safeNum(a.skillMatch.score, 0)
              : studentA.matchScore !== undefined
                ? safeNum(studentA.matchScore, 0)
                : 0;
        const scoreB =
          b.matchScore !== undefined
            ? safeNum(b.matchScore, 0)
            : b.skillMatch?.score !== undefined
              ? safeNum(b.skillMatch.score, 0)
              : studentB.matchScore !== undefined
                ? safeNum(studentB.matchScore, 0)
                : 0;

        if (scoreB !== scoreA) return scoreB - scoreA;
        // Secondary tie-breaker: higher CGPA
        const cgpaA = safeNum(studentA.cgpa, 0);
        const cgpaB = safeNum(studentB.cgpa, 0);
        if (cgpaB !== cgpaA) return cgpaB - cgpaA;
        // Tertiary tie-breaker: newer applied date
        const timeDiff = safeTime(b.appliedAt) - safeTime(a.appliedAt);
        if (timeDiff !== 0) return timeDiff;
        // Quaternary tie-breaker: candidate name alphabetical
        return (studentA.name || '').localeCompare(studentB.name || '', undefined, { sensitivity: 'base' });
      }
      default:
        return 0;
    }
  });
};

/**
 * Terminal application statuses that represent finalized recruitment decisions.
 * Bulk operations must protect these statuses from accidental batch overwrites.
 */
export const TERMINAL_STATUSES = ['Selected', 'Rejected'];

/**
 * Checks whether an application status string is a terminal state.
 *
 * @param {string} status
 * @returns {boolean}
 */
export const isTerminalStatus = (status) => {
  return typeof status === 'string' && TERMINAL_STATUSES.includes(status.trim());
};

/**
 * Partitions an array of application records into active (updatable) vs terminal (protected).
 *
 * @param {Array<Object>} applications
 * @returns {{ updatable: Array<Object>, terminal: Array<Object> }}
 */
export const partitionByTerminalStatus = (applications = []) => {
  const updatable = [];
  const terminal = [];

  (applications || []).forEach((app) => {
    if (app && isTerminalStatus(app.status)) {
      terminal.push(app);
    } else {
      updatable.push(app);
    }
  });

  return { updatable, terminal };
};