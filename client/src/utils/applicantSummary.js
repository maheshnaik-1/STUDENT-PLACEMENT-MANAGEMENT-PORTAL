/**
 * applicantSummary.js
 *
 * Deterministic utility for generating the Officer-Facing Holistic Applicant Assessment.
 * Provides transparent, explainable synthesis across:
 * 1. Academic Gateway (Prerequisite Institutional Criteria)
 * 2. Technical Skill Alignment (Role-Specific Match & Competencies)
 * 3. Profile Readiness & Documented Evidence (Informational Completeness)
 * 4. Standout Strengths & Attention Points (Objective Observations)
 * 5. Advisory Disclaimer (Strictly non-automating)
 *
 * Core Principles:
 * - Purely deterministic with zero network or database access.
 * - Keeps academic eligibility strictly separated from technical skill matching.
 * - Handles dirty/missing/non-numeric data with robust defaults (zero NaN).
 * - Explicitly non-automating: never decides selection, rejection, or status changes.
 */

export const ADVISORY_DISCLAIMER =
  'Advisory assessment only. The placement officer makes all selection decisions.';

export const ADVISORY_NOTE =
  'This assessment consolidates verified academic eligibility, technical skill matching, and profile documentation. It does not automate selection, rejection, or application status updates.';

/**
 * Defensive numeric extractor that guarantees a finite number or fallback.
 */
const safeNum = (val, fallback = 0) => {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Generates the complete Holistic Applicant Summary object.
 *
 * @param {Object} params
 * @param {Object} [params.student] - Student user document or object
 * @param {Object} [params.drive] - Placement drive document or object
 * @param {Object} [params.eligibility] - Precomputed eligibility object from evaluateEligibility
 * @param {Object} [params.matchScore] - Precomputed skill match object from matchScoresMap
 * @param {Object} [params.completeness] - Precomputed completeness object from calculateCompleteness
 * @param {Object} [params.completenessTier] - Precomputed completeness tier from getCompletenessTier
 * @returns {Object} Structured holistic summary
 */
export function generateApplicantSummary({
  student = {},
  drive = {},
  eligibility = null,
  matchScore = null,
  completeness = null,
  completenessTier = null,
} = {}) {
  const safeStudent = student && typeof student === 'object' ? student : {};
  const safeDrive = drive && typeof drive === 'object' ? drive : {};

  // -----------------------------------------------------------------
  // 1. Academic Gateway (Prerequisite Institutional Criteria)
  // -----------------------------------------------------------------
  const eligDetails = Array.isArray(eligibility?.details) ? eligibility.details : [];
  const hasEligRecord = eligibility !== null && typeof eligibility === 'object';
  const isEligible = hasEligRecord ? Boolean(eligibility.isEligible) : true;

  const unmetCriteria = eligDetails
    .filter((d) => d && !d.passed)
    .map((d) => {
      const name = d.criteria || 'Criterion';
      const actual = d.actual !== undefined ? d.actual : 'N/A';
      const req = d.required !== undefined ? d.required : 'N/A';
      return `${name} (${actual}, required: ${req})`;
    });

  let academicSummary = 'Candidate satisfies all institutional eligibility criteria for this drive.';
  if (!isEligible) {
    if (unmetCriteria.length > 0) {
      academicSummary = `Criteria requirement not satisfied: ${unmetCriteria.join('; ')}.`;
    } else {
      academicSummary = 'Candidate does not satisfy current drive eligibility criteria.';
    }
  } else if (!hasEligRecord) {
    academicSummary = 'No eligibility restrictions configured for this placement drive.';
  }

  const academicGateway = {
    isEligible,
    statusLabel: isEligible ? 'ELIGIBLE' : 'INELIGIBLE',
    badgeColor: isEligible ? '#15803d' : '#b91c1c',
    badgeBg: isEligible ? '#dcfce7' : '#fee2e2',
    badgeBorder: isEligible ? '#86efac' : '#fca5a5',
    summary: academicSummary,
    unmetCriteria,
    details: eligDetails,
    separationNote: 'Academic eligibility is evaluated independently from technical skill matching.',
  };

  // -----------------------------------------------------------------
  // 2. Technical Skill Alignment (Role-Specific Match & Competencies)
  // -----------------------------------------------------------------
  const driveRequiredSkills = Array.isArray(safeDrive.requiredSkills)
    ? safeDrive.requiredSkills.filter(Boolean)
    : [];

  const isBaseline = Boolean(
    driveRequiredSkills.length === 0 ||
      matchScore?.isBaseline === true ||
      (matchScore && matchScore.totalRequired === 0)
  );

  const rawScore = matchScore?.score;
  const hasScore = typeof rawScore === 'number' && Number.isFinite(rawScore);
  const score = hasScore ? Math.max(0, Math.min(100, Math.round(rawScore))) : null;

  const matchedSkills = Array.isArray(matchScore?.matchedSkills)
    ? matchScore.matchedSkills.filter(Boolean)
    : [];
  const missingSkills = Array.isArray(matchScore?.missingSkills)
    ? matchScore.missingSkills.filter(Boolean)
    : [];

  const totalRequired =
    typeof matchScore?.totalRequired === 'number' && Number.isFinite(matchScore.totalRequired)
      ? matchScore.totalRequired
      : driveRequiredSkills.length;

  let alignmentTier = 'Score Unavailable';
  let tierColor = '#64748b';
  let tierBg = '#f8fafc';
  let tierBorder = '#e2e8f0';
  let technicalSummary = 'Technical skill match data is not available for this candidate.';

  if (isBaseline) {
    alignmentTier = 'Baseline Evaluation';
    tierColor = '#475569';
    tierBg = '#f1f5f9';
    tierBorder = '#cbd5e1';
    technicalSummary =
      'This drive specifies no mandatory technical skills. The score reflects a baseline evaluation rather than role-specific suitability.';
  } else if (hasScore) {
    if (score >= 80) {
      alignmentTier = 'Strong Alignment';
      tierColor = '#15803d';
      tierBg = '#dcfce7';
      tierBorder = '#86efac';
      technicalSummary = `Candidate matches ${matchedSkills.length} of ${totalRequired || matchedSkills.length} required skills (${score}%). Strong technical alignment for this role.`;
    } else if (score >= 60) {
      alignmentTier = 'Moderate Alignment';
      tierColor = '#1d4ed8';
      tierBg = '#eff6ff';
      tierBorder = '#bfdbfe';
      technicalSummary = `Candidate matches ${matchedSkills.length} of ${totalRequired || (matchedSkills.length + missingSkills.length)} required skills (${score}%). Notable skills present with some gaps.`;
    } else if (score >= 40) {
      alignmentTier = 'Developing Alignment';
      tierColor = '#a16207';
      tierBg = '#fefce8';
      tierBorder = '#fef08a';
      technicalSummary = `Candidate matches ${matchedSkills.length} of ${totalRequired || (matchedSkills.length + missingSkills.length)} required skills (${score}%). Foundational coverage with gaps in core requirements.`;
    } else {
      alignmentTier = 'Low Alignment / Skill Gap';
      tierColor = '#b91c1c';
      tierBg = '#fee2e2';
      tierBorder = '#fca5a5';
      technicalSummary = `Candidate matches ${matchedSkills.length} of ${totalRequired || (matchedSkills.length + missingSkills.length)} required skills (${score}%). Significant skill gap for role-specific requirements.`;
    }
  }

  const technicalAlignment = {
    hasScore,
    score,
    scoreDisplay: hasScore ? `${score}%` : 'Unavailable',
    isBaseline,
    alignmentTier,
    tierColor,
    tierBg,
    tierBorder,
    matchedSkills,
    missingSkills,
    matchedCount: matchedSkills.length,
    missingCount: missingSkills.length,
    totalRequired,
    explanation:
      matchScore?.explanation ||
      (isBaseline ? 'No required skills specified for this drive (baseline assessment).' : ''),
    summaryText: technicalSummary,
  };

  // -----------------------------------------------------------------
  // 3. Profile Readiness & Documented Evidence (Informational Only)
  // -----------------------------------------------------------------
  const rawPercentage = completeness?.percentage;
  const percentage =
    typeof rawPercentage === 'number' && Number.isFinite(rawPercentage)
      ? Math.max(0, Math.min(100, Math.round(rawPercentage)))
      : 0;

  const tierLabel =
    completenessTier?.label ||
    (percentage >= 100
      ? 'Placement Ready'
      : percentage >= 70
      ? 'Good Profile Readiness'
      : 'Profile In Progress');

  const tierColorCompleteness =
    completenessTier?.color || (percentage >= 100 ? '#15803d' : percentage >= 70 ? '#1d4ed8' : '#92400e');
  const tierBgCompleteness =
    completenessTier?.bg || (percentage >= 100 ? '#dcfce7' : percentage >= 70 ? '#eff6ff' : '#fef3c7');

  const projectList = Array.isArray(safeStudent.projects)
    ? safeStudent.projects.filter((p) => p && typeof p === 'object' && p.title && String(p.title).trim())
    : [];
  const projectCount = projectList.length;

  const certList = Array.isArray(safeStudent.certifications)
    ? safeStudent.certifications.filter((c) => c && typeof c === 'object' && c.name && String(c.name).trim())
    : [];
  const certificationCount = certList.length;

  const hasUploadedResume = Boolean(
    safeStudent.resumeFile &&
      (safeStudent.resumeFile.filename || safeStudent.resumeFile.originalName)
  );
  const hasResumeUrl = Boolean(
    safeStudent.resumeUrl && String(safeStudent.resumeUrl).trim().length > 0
  );
  const hasResume = hasUploadedResume || hasResumeUrl;

  let resumeType = 'None Available';
  if (hasUploadedResume) {
    const isPdf =
      safeStudent.resumeFile?.mimeType === 'application/pdf' ||
      (safeStudent.resumeFile?.originalName || '').toLowerCase().endsWith('.pdf') ||
      (safeStudent.resumeFile?.filename || '').toLowerCase().endsWith('.pdf');
    resumeType = isPdf ? 'Uploaded PDF' : 'Uploaded File';
  } else if (hasResumeUrl) {
    resumeType = 'External Link';
  }

  const profileReadiness = {
    percentage,
    tierLabel,
    tierColor: tierColorCompleteness,
    tierBg: tierBgCompleteness,
    projectCount,
    certificationCount,
    hasResume,
    resumeType,
    summaryText: `Profile completeness is ${percentage}% (${tierLabel}). Documented evidence includes ${projectCount} project${
      projectCount === 1 ? '' : 's'
    }, ${certificationCount} certification${
      certificationCount === 1 ? '' : 's'
    }, and ${hasResume ? resumeType : 'no resume on record'}.`,
    readinessDisclaimer:
      'Profile completeness reflects documentation thoroughness and is not a measure of candidate aptitude or quality.',
  };

  // -----------------------------------------------------------------
  // 4. Standout Strengths & Attention Points (Deterministic Observations)
  // -----------------------------------------------------------------
  const strengths = [];
  const attentionPoints = [];

  const cgpa = safeNum(safeStudent.cgpa, 0);
  const backlogs = safeNum(safeStudent.activeBacklogs, 0);

  // Strengths
  if (cgpa >= 8.5) {
    strengths.push(`High Academic Standing: CGPA ${cgpa.toFixed(2)} (≥ 8.5)`);
  } else if (cgpa >= 7.5 && isEligible) {
    strengths.push(`Solid Academic Performance: CGPA ${cgpa.toFixed(2)}`);
  }

  if (backlogs === 0 && (cgpa >= 6.5 || isEligible)) {
    strengths.push('Clean Academic Record: 0 active backlogs');
  }

  if (!isBaseline && hasScore && score === 100) {
    strengths.push('Complete Skill Coverage: 100% of required drive skills matched');
  } else if (!isBaseline && hasScore && score >= 80) {
    strengths.push(`Strong Technical Match: ${score}% match with ${matchedSkills.length} required skill(s) satisfied`);
  }

  if (projectCount >= 2) {
    strengths.push(`Active Projects Portfolio: ${projectCount} documented coursework/technical projects`);
  } else if (projectCount === 1) {
    strengths.push('Documented Technical Project on Record');
  }

  if (certificationCount >= 1) {
    strengths.push(`Verified Credentials: ${certificationCount} professional certification(s)`);
  }

  const hasLinks = Boolean(
    safeStudent.links?.github || safeStudent.links?.linkedin || safeStudent.links?.portfolio
  );
  if (hasLinks) {
    strengths.push('Professional Links Linked (GitHub/LinkedIn/Portfolio)');
  }

  if (percentage >= 80) {
    strengths.push(`Comprehensive Profile: ${percentage}% completeness (${tierLabel})`);
  }

  if (strengths.length === 0) {
    strengths.push('Candidate profile meets initial application submission requirements.');
  }

  // Attention Points
  if (!isEligible && unmetCriteria.length > 0) {
    attentionPoints.push(`Academic Ineligibility: ${unmetCriteria.join(', ')}`);
  } else if (!isEligible) {
    attentionPoints.push('Academic Ineligibility: Candidate does not meet drive criteria');
  }

  if (backlogs > 0) {
    attentionPoints.push(
      `Active Backlogs: ${backlogs} active backlog${backlogs > 1 ? 's' : ''} on record`
    );
  }

  if (cgpa > 0 && cgpa < 6.5) {
    attentionPoints.push(`Academic Warning: CGPA ${cgpa.toFixed(2)} is in the lower tier (< 6.5)`);
  }

  if (!isBaseline && missingSkills.length > 0) {
    const previewMissing = missingSkills.slice(0, 3).join(', ');
    const moreCount = missingSkills.length > 3 ? ` (+${missingSkills.length - 3} more)` : '';
    attentionPoints.push(`Missing Required Skills: ${previewMissing}${moreCount}`);
  }

  if (!isBaseline && hasScore && score < 40 && missingSkills.length > 0) {
    attentionPoints.push(`Significant Skill Gap: ${score}% match with major drive requirements unmet`);
  }

  if (!hasResume) {
    attentionPoints.push('Resume Missing: No uploaded resume file or external link provided');
  }

  if (percentage > 0 && percentage < 50) {
    attentionPoints.push(`Incomplete Profile: ${percentage}% completeness (critical sections missing)`);
  }

  if (projectCount === 0) {
    attentionPoints.push('No technical or coursework projects listed on profile');
  }

  if (attentionPoints.length === 0) {
    attentionPoints.push('No immediate academic, skill, or documentation flags detected.');
  }

  // -----------------------------------------------------------------
  // 5. Final Holistic Synthesis Assembly
  // -----------------------------------------------------------------
  return {
    academicGateway,
    technicalAlignment,
    profileReadiness,
    standoutStrengths: strengths,
    attentionPoints,
    disclaimer: ADVISORY_DISCLAIMER,
    advisoryNote: ADVISORY_NOTE,
  };
}
