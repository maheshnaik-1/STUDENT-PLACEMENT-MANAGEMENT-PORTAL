/**
 * Applicant Comparison Utility (V4.0 Phase 2 Step 3)
 *
 * Provides pure, deterministic functions for managing candidate comparison
 * selection (capped at a maximum of 4 candidates) and generating side-by-side
 * comparison matrices with defensive handling of dirty/missing data.
 */

import { evaluateEligibility } from './applicantSorting.js';

export const MAX_COMPARE_LIMIT = 4;

/**
 * Pure helper to safely toggle a candidate in the comparison selection.
 * Enforces the strict maximum capacity of 4 candidates.
 *
 * @param {Set<string>|Array<string>} currentSelection
 * @param {string} candidateId
 * @param {number} maxLimit (defaults to MAX_COMPARE_LIMIT = 4)
 * @returns {{
 *   nextSelected: Set<string>,
 *   added: boolean,
 *   removed: boolean,
 *   limitReached: boolean,
 *   message: string
 * }}
 */
export function toggleCandidateComparison(
  currentSelection,
  candidateId,
  maxLimit = MAX_COMPARE_LIMIT
) {
  if (!candidateId) {
    return {
      nextSelected: new Set(currentSelection || []),
      added: false,
      removed: false,
      limitReached: false,
      message: 'Invalid candidate identifier.',
    };
  }

  const currentSet = new Set(currentSelection || []);

  if (currentSet.has(candidateId)) {
    currentSet.delete(candidateId);
    return {
      nextSelected: currentSet,
      added: false,
      removed: true,
      limitReached: false,
      message: 'Candidate removed from comparison.',
    };
  }

  if (currentSet.size >= maxLimit) {
    return {
      nextSelected: currentSet,
      added: false,
      removed: false,
      limitReached: true,
      message: `Comparison limit reached. A maximum of ${maxLimit} candidates can be compared side-by-side.`,
    };
  }

  currentSet.add(candidateId);
  return {
    nextSelected: currentSet,
    added: true,
    removed: false,
    limitReached: false,
    message: 'Candidate added to comparison.',
  };
}

/**
 * Pure helper to remove a candidate from comparison.
 *
 * @param {Set<string>|Array<string>} currentSelection
 * @param {string} candidateId
 * @returns {Set<string>}
 */
export function removeCandidateComparison(currentSelection, candidateId) {
  const currentSet = new Set(currentSelection || []);
  if (candidateId) {
    currentSet.delete(candidateId);
  }
  return currentSet;
}

/**
 * Builds a defensive, normalized candidate comparison object for a single applicant.
 *
 * @param {Object} app - Application record (optionally populated with student)
 * @param {Object} drive - Placement drive configuration
 * @param {Object|null} matchScoreData - AI skill match data from matchScoresMap
 * @returns {Object} Normalized candidate comparison item
 */
export function buildComparisonCandidate(app, drive = {}, matchScoreData = null) {
  const s = app?.student || {};

  // Numeric CGPA extraction
  let numericCgpa = null;
  if (s.cgpa !== undefined && s.cgpa !== null) {
    const parsed = parseFloat(s.cgpa);
    if (!isNaN(parsed) && isFinite(parsed)) {
      numericCgpa = parsed;
    }
  }

  // Active backlogs extraction
  const rawBacklogs = s.activeBacklogs;
  const parsedBacklogs =
    typeof rawBacklogs === 'number'
      ? rawBacklogs
      : typeof rawBacklogs === 'string'
      ? parseInt(rawBacklogs, 10)
      : 0;
  const backlogs = isNaN(parsedBacklogs) ? 0 : Math.max(0, parsedBacklogs);

  // Academic Eligibility with defensive drive schema normalization
  const effectiveDrive = {
    ...drive,
    eligibility: {
      minCGPA:
        drive?.eligibility?.minCGPA ??
        drive?.minCGPA ??
        drive?.eligibilityCriteria?.minCgpa ??
        0,
      maxBacklogs:
        drive?.eligibility?.maxBacklogs ??
        drive?.maxBacklogs ??
        drive?.eligibilityCriteria?.maxBacklogs ??
        0,
      allowedBranches:
        drive?.allowedBranches ||
        drive?.eligibility?.allowedBranches ||
        drive?.eligibleBranches ||
        [],
      passingYear: drive?.eligibility?.passingYear || drive?.passingYear || 0,
      ...(drive?.eligibility || {}),
    },
  };

  const rawEligibility = app?.student
    ? evaluateEligibility(s, effectiveDrive)
    : {
        isEligible: false,
        details: [
          { criteria: 'Profile Status', passed: false, actual: 'No student record linked' },
        ],
      };

  const violations = (rawEligibility.details || [])
    .filter((d) => !d.passed)
    .map((d) => `${d.criteria} (${d.actual || 'N/A'}, required: ${d.required || 'N/A'})`);

  const academicEligibility = {
    isEligible: Boolean(rawEligibility.isEligible && app?.student),
    details: rawEligibility.details || [],
    violations,
  };

  // Skill Match Score Defensive Normalization
  let matchInfo = {
    hasScore: false,
    score: null,
    totalRequired: 0,
    totalMatched: 0,
    matchedSkills: [],
    missingSkills: [],
    explanation: 'Match score not available',
    isBaseline: false,
  };

  const scoreSource = matchScoreData || app?.skillMatch;
  if (scoreSource && typeof scoreSource.score === 'number' && !isNaN(scoreSource.score)) {
    matchInfo = {
      hasScore: true,
      score: scoreSource.score,
      totalRequired: scoreSource.totalRequired ?? 0,
      totalMatched: scoreSource.totalMatched ?? 0,
      matchedSkills: Array.isArray(scoreSource.matchedSkills) ? scoreSource.matchedSkills : [],
      missingSkills: Array.isArray(scoreSource.missingSkills) ? scoreSource.missingSkills : [],
      explanation: scoreSource.explanation || '',
      isBaseline: scoreSource.totalRequired === 0,
    };
  }

  // Resume status
  const hasUploadedResume = Boolean(s.resumeFile?.filename || s.resumeFile?.originalName);
  const isPdf = Boolean(
    s.resumeFile?.mimeType === 'application/pdf' ||
      s.resumeFile?.originalName?.toLowerCase().endsWith('.pdf')
  );

  return {
    applicationId: app?._id ? String(app._id) : 'unknown',
    studentId: s._id ? String(s._id) : null,
    name: s.name || 'Unnamed Candidate',
    rollNo: s.rollNo || 'N/A',
    email: s.email || 'N/A',
    phone: s.phone || null,
    branch: s.branch || 'N/A',
    cgpaDisplay: numericCgpa !== null ? numericCgpa.toFixed(2) : 'N/A',
    numericCgpa,
    backlogs,
    status: app?.status || 'Unknown',
    appliedAt: app?.appliedAt || null,
    remarks: app?.remarks || '',
    skills: Array.isArray(s.skills) ? s.skills.filter(Boolean) : [],
    academicEligibility,
    matchInfo,
    hasUploadedResume,
    isPdf,
    resumeOriginalName: s.resumeFile?.originalName || null,
    resumeUrl: s.resumeUrl || null,
    projectsCount: Array.isArray(s.projects) ? s.projects.length : 0,
    certificationsCount: Array.isArray(s.certifications) ? s.certifications.length : 0,
    rawApp: app,
    rawStudent: s,
  };
}

/**
 * Builds the complete side-by-side comparison matrix for the given selected application IDs.
 * Computes comparative highlights (e.g. top CGPA, top skill match score) when comparing multiple candidates.
 *
 * @param {Set<string>|Array<string>} selectedAppIds
 * @param {Array<Object>} allApplicants
 * @param {Object} drive
 * @param {Object} matchScoresMap
 * @returns {{
 *   candidates: Array<Object>,
 *   count: number,
 *   maxLimit: number,
 *   isAtLimit: boolean,
 *   topCgpaAppId: string|null,
 *   topMatchScoreAppId: string|null,
 *   driveSummary: {
 *     title: string,
 *     companyName: string,
 *     allowedBranches: Array<string>,
 *     minCgpa: number,
 *     maxBacklogs: number,
 *     requiredSkills: Array<string>
 *   }
 * }}
 */
export function buildComparisonMatrix(
  selectedAppIds,
  allApplicants = [],
  drive = {},
  matchScoresMap = {}
) {
  const idArray = Array.from(selectedAppIds || []).slice(0, MAX_COMPARE_LIMIT);
  const applicantLookup = new Map();

  allApplicants.forEach((app) => {
    if (app && app._id) {
      applicantLookup.set(String(app._id), app);
    }
  });

  const candidates = [];
  idArray.forEach((id) => {
    const app = applicantLookup.get(String(id));
    if (app) {
      const matchScoreData = matchScoresMap ? matchScoresMap[app._id] : null;
      candidates.push(buildComparisonCandidate(app, drive, matchScoreData));
    }
  });

  // Calculate top highlights if comparing 2 or more candidates
  let topCgpaAppId = null;
  let topMatchScoreAppId = null;

  if (candidates.length > 1) {
    let maxCgpa = -1;
    let maxScore = -1;

    candidates.forEach((cand) => {
      if (cand.numericCgpa !== null && cand.numericCgpa > maxCgpa) {
        maxCgpa = cand.numericCgpa;
        topCgpaAppId = cand.applicationId;
      }
      if (cand.matchInfo.hasScore && cand.matchInfo.score > maxScore) {
        maxScore = cand.matchInfo.score;
        topMatchScoreAppId = cand.applicationId;
      }
    });
  }

  return {
    candidates,
    count: candidates.length,
    maxLimit: MAX_COMPARE_LIMIT,
    isAtLimit: candidates.length >= MAX_COMPARE_LIMIT,
    topCgpaAppId,
    topMatchScoreAppId,
    driveSummary: {
      title: drive?.title || 'Placement Drive',
      companyName: drive?.company?.name || 'Company',
      allowedBranches: drive?.allowedBranches || drive?.eligibleBranches || [],
      minCgpa: typeof drive?.eligibilityCriteria?.minCgpa === 'number' ? drive.eligibilityCriteria.minCgpa : 0,
      maxBacklogs: typeof drive?.eligibilityCriteria?.maxBacklogs === 'number' ? drive.eligibilityCriteria.maxBacklogs : 0,
      requiredSkills: Array.isArray(drive?.requiredSkills) ? drive.requiredSkills : [],
    },
  };
}
