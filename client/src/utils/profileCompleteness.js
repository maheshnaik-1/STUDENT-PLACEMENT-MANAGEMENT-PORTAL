/**
 * Profile Completeness & Career Readiness Utility (v2.5)
 *
 * Implements deterministic career profile completeness scoring across 7 dimensions:
 * 1. Basic Info & Contact (15%)
 * 2. Core Academic Record (15%)
 * 3. Extended Academic History (15%)
 * 4. Technical Skills (15%)
 * 5. Resume Document / Link (15%)
 * 6. Projects Portfolio (15%)
 * 7. Professional Links or Certifications (10%)
 *
 * Compatible with both flattened form state (StudentProfile.jsx) and
 * populated Student User entities/DTOs (Officer Evaluation in DriveApplicants.jsx).
 */

export const COMPLETENESS_WEIGHTS = {
  BASIC_CONTACT: 15,
  CORE_ACADEMIC: 15,
  EXTENDED_ACADEMIC: 15,
  SKILLS: 15,
  RESUME: 15,
  PROJECTS: 15,
  LINKS_CERTS: 10,
  // Canonical aliases
  basicAndContact: 15,
  coreAcademic: 15,
  extendedAcademic: 15,
  skills: 15,
  resume: 15,
  projects: 15,
  linksAndCertifications: 10,
};

/**
 * Get readiness tier descriptor and color styles for a given percentage.
 *
 * @param {number} percentage - 0 to 100
 * @returns {{ label: string, color: string, bg: string, badgeBg: string, badgeColor: string }}
 */
export const getCompletenessTier = (percentage = 0) => {
  const p = Number(percentage) || 0;
  if (p >= 100) {
    return {
      label: 'Placement Ready',
      color: '#15803d',
      bg: '#dcfce7',
      badgeBg: '#dcfce7',
      badgeColor: '#15803d',
    };
  }
  if (p >= 70) {
    return {
      label: 'Good Profile Readiness',
      color: '#1d4ed8',
      bg: '#eff6ff',
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
    };
  }
  return {
    label: 'Profile In Progress',
    color: '#92400e',
    bg: '#fef3c7',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
  };
};

/**
 * Calculates deterministic profile completeness score and missing information checklist.
 *
 * Supports:
 * - 4 arguments: (formData, resumeFile, projects, certifications)
 * - 1 argument:  (studentDocument) where resumeFile, projects, certifications,
 *   academicDetails, and links are nested inside the student object.
 *
 * @param {Object} data - Form data or populated student document
 * @param {Object} [resumeFile] - Uploaded resume metadata object
 * @param {Array}  [projects] - Student projects array
 * @param {Array}  [certifications] - Student certifications array
 * @returns {{ percentage: number, completed: string[], missing: string[] }}
 */
export const calculateCompleteness = (
  data = {},
  resumeFile,
  projects,
  certifications
) => {
  const safeData = data || {};
  let score = 0;
  const completed = [];
  const missing = [];

  // 1. Basic Info & Contact (15%)
  const name = safeData.name;
  const email = safeData.email;
  const rollNo = safeData.rollNo;
  const branch = safeData.branch;
  const phone = safeData.phone ? String(safeData.phone).trim() : '';

  const hasBasic = Boolean(
    name && email && rollNo && branch && phone && phone.length >= 7
  );

  if (hasBasic) {
    score += COMPLETENESS_WEIGHTS.BASIC_CONTACT;
    completed.push('Basic Information & Phone');
  } else {
    if (!phone || phone.length < 7) {
      missing.push('Add contact phone number');
    } else {
      missing.push('Complete basic details (name, roll no, branch)');
    }
  }

  // 2. Core Academic Profile (15%)
  const cgpaNum = parseFloat(safeData.cgpa);
  const activeBacklogs = safeData.activeBacklogs;
  const hasCore = Boolean(
    !isNaN(cgpaNum) &&
      cgpaNum > 0 &&
      safeData.passingYear &&
      activeBacklogs !== '' &&
      activeBacklogs !== undefined &&
      activeBacklogs !== null
  );

  if (hasCore) {
    score += COMPLETENESS_WEIGHTS.CORE_ACADEMIC;
    completed.push('Core Academic Record (CGPA, Backlogs, Batch)');
  } else {
    missing.push('Enter current CGPA, backlog count, and graduation batch');
  }

  // 3. Extended Academic History (15%)
  const rawTenth =
    safeData.tenthPercentage !== undefined && safeData.tenthPercentage !== null
      ? safeData.tenthPercentage
      : safeData.academicDetails?.tenthPercentage;
  const rawTwelfth =
    safeData.twelfthPercentage !== undefined && safeData.twelfthPercentage !== null
      ? safeData.twelfthPercentage
      : safeData.academicDetails?.twelfthPercentage;
  const rawDiploma =
    safeData.diplomaPercentage !== undefined && safeData.diplomaPercentage !== null
      ? safeData.diplomaPercentage
      : safeData.academicDetails?.diplomaPercentage;
  const rawSem =
    safeData.currentSemester !== undefined && safeData.currentSemester !== null
      ? safeData.currentSemester
      : safeData.academicDetails?.currentSemester;

  const tenth = rawTenth !== '' && rawTenth !== null && rawTenth !== undefined ? parseFloat(rawTenth) : NaN;
  const twelfth = rawTwelfth !== '' && rawTwelfth !== null && rawTwelfth !== undefined ? parseFloat(rawTwelfth) : NaN;
  const diploma = rawDiploma !== '' && rawDiploma !== null && rawDiploma !== undefined ? parseFloat(rawDiploma) : NaN;
  const sem = rawSem !== '' && rawSem !== null && rawSem !== undefined ? parseInt(rawSem, 10) : NaN;

  const has10th = !isNaN(tenth) && tenth > 0 && tenth <= 100;
  const has12thOrDip =
    (!isNaN(twelfth) && twelfth > 0 && twelfth <= 100) ||
    (!isNaN(diploma) && diploma > 0 && diploma <= 100);
  const hasSem = !isNaN(sem) && sem >= 1 && sem <= 12;

  if (has10th && has12thOrDip && hasSem) {
    score += COMPLETENESS_WEIGHTS.EXTENDED_ACADEMIC;
    completed.push('Schooling & Semester Record (10th, 12th/Diploma, Semester)');
  } else {
    const parts = [];
    if (!has10th) parts.push('10th %');
    if (!has12thOrDip) parts.push('12th/Diploma %');
    if (!hasSem) parts.push('Current Semester');
    missing.push(`Add academic history (${parts.join(', ')})`);
  }

  // 4. Technical Skills (15%)
  const rawSkills = Array.isArray(safeData.skills)
    ? safeData.skills
    : typeof safeData.skills === 'string'
    ? safeData.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const seenSkills = new Set();
  const skillsList = rawSkills.filter((s) => {
    if (typeof s !== 'string') return false;
    const clean = s.trim();
    if (!clean) return false;
    const lower = clean.toLowerCase();
    if (seenSkills.has(lower)) return false;
    seenSkills.add(lower);
    return true;
  });

  if (skillsList.length > 0) {
    score += COMPLETENESS_WEIGHTS.SKILLS;
    completed.push(`Technical Skills (${skillsList.length} skills listed)`);
  } else {
    missing.push('Add at least one technical skill (e.g., React, Java, Python)');
  }

  // 5. Resume (15%)
  const effectiveResume = resumeFile !== undefined ? resumeFile : safeData.resumeFile;
  const hasUploaded = Boolean(effectiveResume && effectiveResume.filename);
  const resumeUrl = safeData.resumeUrl ? String(safeData.resumeUrl).trim() : '';
  const hasExternal = Boolean(resumeUrl.length > 0);

  if (hasUploaded || hasExternal) {
    score += COMPLETENESS_WEIGHTS.RESUME;
    completed.push(hasUploaded ? 'Uploaded Resume Document' : 'External Resume Link');
  } else {
    missing.push('Upload a PDF/DOC resume or provide an external resume link');
  }

  // 6. Projects Portfolio (15%)
  const effectiveProjects =
    projects !== undefined
      ? projects
      : Array.isArray(safeData.projects)
      ? safeData.projects
      : [];
  const validProjects = Array.isArray(effectiveProjects)
    ? effectiveProjects.filter((p) => p && p.title && String(p.title).trim())
    : [];

  if (validProjects.length > 0) {
    score += COMPLETENESS_WEIGHTS.PROJECTS;
    completed.push(
      `Projects Portfolio (${validProjects.length} project${validProjects.length > 1 ? 's' : ''})`
    );
  } else {
    missing.push('Add at least one technical or coursework project');
  }

  // 7. Professional Links & Certifications (10%)
  const github =
    safeData.github !== undefined ? safeData.github : safeData.links?.github;
  const linkedin =
    safeData.linkedin !== undefined ? safeData.linkedin : safeData.links?.linkedin;
  const portfolio =
    safeData.portfolio !== undefined ? safeData.portfolio : safeData.links?.portfolio;

  const hasLinks = Boolean(
    (github && String(github).trim()) ||
      (linkedin && String(linkedin).trim()) ||
      (portfolio && String(portfolio).trim())
  );

  const effectiveCerts =
    certifications !== undefined
      ? certifications
      : Array.isArray(safeData.certifications)
      ? safeData.certifications
      : [];
  const validCerts = Array.isArray(effectiveCerts)
    ? effectiveCerts.filter((c) => c && c.name && String(c.name).trim())
    : [];

  if (hasLinks || validCerts.length > 0) {
    score += COMPLETENESS_WEIGHTS.LINKS_CERTS;
    completed.push('Professional Links or Certifications');
  } else {
    missing.push('Add LinkedIn / GitHub link or professional certifications');
  }

  const breakdown = {
    'Basic & Contact Information': hasBasic ? COMPLETENESS_WEIGHTS.BASIC_CONTACT : 0,
    'Core Academic Credentials': hasCore ? COMPLETENESS_WEIGHTS.CORE_ACADEMIC : 0,
    'Extended Academic Details': (has10th && has12thOrDip && hasSem) ? COMPLETENESS_WEIGHTS.EXTENDED_ACADEMIC : 0,
    'Technical Skills': skillsList.length > 0 ? COMPLETENESS_WEIGHTS.SKILLS : 0,
    'Resume Document': (hasUploaded || hasExternal) ? COMPLETENESS_WEIGHTS.RESUME : 0,
    'Projects Portfolio': validProjects.length > 0 ? COMPLETENESS_WEIGHTS.PROJECTS : 0,
    'Professional Links & Certifications': (hasLinks || validCerts.length > 0) ? COMPLETENESS_WEIGHTS.LINKS_CERTS : 0,
  };

  return {
    percentage: Math.min(score, 100),
    isComplete: score >= 100,
    completed,
    missing,
    missingDetails: missing,
    breakdown,
  };
};
