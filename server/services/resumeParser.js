/**
 * @file resumeParser.js
 * @desc Secure Resume Text Parsing & Skill Extraction Service for V3.0
 */

const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { normalizeSkillList } = require('./skillMatcher');

// Resolved destination directory for authenticated resumes
const UPLOADS_DIR = path.resolve(__dirname, '../uploads/resumes');

// Curated list of technical skill keywords and regex patterns for text scanning
const TECHNICAL_KEYWORDS = [
  // Programming Languages
  { name: 'JavaScript', pattern: /\b(?:javascript|js|ecmascript)\b/i },
  { name: 'TypeScript', pattern: /\b(?:typescript|ts)\b/i },
  { name: 'Python', pattern: /\b(?:python|python3)\b/i },
  { name: 'Java', pattern: /\bjava\b(?!\s*script)/i },
  { name: 'C++', pattern: /(?:\bc\+\+|\bcpp\b)/i },
  { name: 'C#', pattern: /(?:\bc#|\bcsharp\b)/i },
  { name: 'C', pattern: /(?:languages?:[^.\n]*\bc\b|\bc\s*,\s*|\bprogramming\s+in\s+c\b)/i },
  { name: 'Go', pattern: /\b(?:golang|go\s+language)\b/i },
  { name: 'Rust', pattern: /\brust\b/i },
  { name: 'Ruby', pattern: /\bruby\b/i },
  { name: 'PHP', pattern: /\bphp\b/i },
  { name: 'Swift', pattern: /\bswift\b/i },
  { name: 'Kotlin', pattern: /\bkotlin\b/i },
  { name: 'Dart', pattern: /\bdart\b/i },
  { name: 'SQL', pattern: /\bsql\b/i },
  { name: 'HTML', pattern: /\b(?:html|html5)\b/i },
  { name: 'CSS', pattern: /\b(?:css|css3)\b/i },

  // Frontend
  { name: 'React', pattern: /\b(?:react|react\.?js|reactjs)\b/i },
  { name: 'Angular', pattern: /\b(?:angular|angular\.?js|angularjs)\b/i },
  { name: 'Vue.js', pattern: /\b(?:vue|vue\.?js|vuejs)\b/i },
  { name: 'Next.js', pattern: /\b(?:next\.?js|nextjs)\b/i },
  { name: 'Redux', pattern: /\bredux\b/i },
  { name: 'Tailwind CSS', pattern: /\b(?:tailwind|tailwindcss|tailwind\s+css)\b/i },
  { name: 'Bootstrap', pattern: /\bbootstrap\b/i },
  { name: 'Sass', pattern: /\bsass\b/i },
  { name: 'jQuery', pattern: /\bjquery\b/i },

  // Backend
  { name: 'Node.js', pattern: /\b(?:node\.?js|nodejs|node)\b/i },
  { name: 'Express.js', pattern: /\b(?:express\.?js|expressjs|express)\b/i },
  { name: 'Spring Boot', pattern: /\b(?:spring\s+boot|springboot|spring\s+framework)\b/i },
  { name: 'Django', pattern: /\bdjango\b/i },
  { name: 'Flask', pattern: /\bflask\b/i },
  { name: 'FastAPI', pattern: /\bfastapi\b/i },
  { name: 'NestJS', pattern: /\b(?:nest\.?js|nestjs)\b/i },
  { name: '.NET', pattern: /(?:\.net|dotnet|asp\.net)\b/i },
  { name: 'Laravel', pattern: /\blaravel\b/i },

  // Mobile
  { name: 'Flutter', pattern: /\bflutter\b/i },
  { name: 'React Native', pattern: /\breact[\s-]native\b/i },

  // Databases
  { name: 'MongoDB', pattern: /\b(?:mongodb|mongo)\b/i },
  { name: 'PostgreSQL', pattern: /\b(?:postgresql|postgres)\b/i },
  { name: 'MySQL', pattern: /\bmysql\b/i },
  { name: 'SQLite', pattern: /\bsqlite\b/i },
  { name: 'Redis', pattern: /\bredis\b/i },
  { name: 'Oracle DB', pattern: /\boracle(?:\s+db)?\b/i },
  { name: 'Firebase', pattern: /\bfirebase\b/i },

  // Cloud & DevOps
  { name: 'AWS', pattern: /\b(?:aws|amazon\s+web\s+services)\b/i },
  { name: 'Azure', pattern: /\b(?:azure|microsoft\s+azure)\b/i },
  { name: 'GCP', pattern: /\b(?:gcp|google\s+cloud(?:\s+platform)?)\b/i },
  { name: 'Docker', pattern: /\bdocker\b/i },
  { name: 'Kubernetes', pattern: /\b(?:kubernetes|k8s)\b/i },
  { name: 'Jenkins', pattern: /\bjenkins\b/i },
  { name: 'Git', pattern: /\bgit\b/i },
  { name: 'GitHub', pattern: /\bgithub\b/i },
  { name: 'GitLab', pattern: /\bgitlab\b/i },
  { name: 'CI/CD', pattern: /\bci[\/-]?cd\b/i },
  { name: 'Linux', pattern: /\blinux\b/i },

  // Data Science, AI & ML
  { name: 'Machine Learning', pattern: /\bmachine\s+learning\b/i },
  { name: 'Deep Learning', pattern: /\bdeep\s+learning\b/i },
  { name: 'Artificial Intelligence', pattern: /\bartificial\s+intelligence\b/i },
  { name: 'NLP', pattern: /\b(?:nlp|natural\s+language\s+processing)\b/i },
  { name: 'TensorFlow', pattern: /\btensorflow\b/i },
  { name: 'PyTorch', pattern: /\bpytorch\b/i },
  { name: 'Pandas', pattern: /\bpandas\b/i },
  { name: 'NumPy', pattern: /\bnumpy\b/i },
  { name: 'Tableau', pattern: /\btableau\b/i },
  { name: 'Power BI', pattern: /\bpower\s*bi\b/i },

  // CS Fundamentals & Methodologies
  { name: 'Data Structures', pattern: /\bdata\s+structures\b/i },
  { name: 'Algorithms', pattern: /\balgorithms\b/i },
  { name: 'Data Structures & Algorithms', pattern: /\b(?:dsa|data\s+structures\s+(?:and|&)\s+algorithms)\b/i },
  { name: 'OOP', pattern: /\b(?:oop|oops|object[\s-]oriented(?:\s+programming)?)\b/i },
  { name: 'REST APIs', pattern: /\b(?:rest|restful)(?:\s+apis?|\s+web\s+services)?\b/i },
  { name: 'GraphQL', pattern: /\bgraphql\b/i },
  { name: 'Microservices', pattern: /\bmicroservices\b/i },
  { name: 'DBMS', pattern: /\bdbms\b/i },
  { name: 'Agile', pattern: /\bagile\b/i },
];

/**
 * Extracts raw textual content from a PDF Buffer using pdf-parse v2
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    await parser.load();
    const result = await parser.getText();
    let text = '';
    if (Array.isArray(result?.pages)) {
      text = result.pages.map((p) => p.text || '').join('\n');
    } else if (typeof result?.text === 'string') {
      text = result.text;
    } else if (typeof result === 'string') {
      text = result;
    }
    return text.replace(/\r\n/g, '\n').trim();
  } finally {
    try {
      await parser.destroy();
    } catch {
      // noop
    }
  }
}

/**
 * Extracts raw textual content from a DOCX Buffer using mammoth
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFromDocx(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('DOCX buffer is empty');
  }

  const result = await mammoth.extractRawText({ buffer });
  return (result?.value || '').replace(/\r\n/g, '\n').trim();
}

/**
 * Scans text content for recognized technical skills and returns a normalized list
 * @param {string} text
 * @returns {string[]}
 */
function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const matchedSkills = [];
  for (const { name, pattern } of TECHNICAL_KEYWORDS) {
    if (pattern.test(text)) {
      matchedSkills.push(name);
    }
  }

  return normalizeSkillList(matchedSkills);
}

/**
 * Extracts basic candidate contact information from text
 * @param {string} text
 * @returns {Object}
 */
function extractContactInfo(text) {
  if (!text || typeof text !== 'string') {
    return { email: null, phone: null, links: [] };
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/);

  const links = [];
  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  if (githubMatch) links.push(`https://${githubMatch[0]}`);

  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) links.push(`https://${linkedinMatch[0]}`);

  return {
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    links,
  };
}

/**
 * Deterministically analyzes extracted resume text, contact info, and skill gaps
 * to produce actionable resume improvement suggestions and positive findings.
 *
 * @param {Object} params
 * @param {string} params.text - Raw extracted resume text
 * @param {string[]} [params.extractedSkills] - Skills found in resume
 * @param {Object} [params.contactInfo] - Extracted contact information
 * @param {number} [params.wordCount] - Extracted word count
 * @param {string[]} [params.activeDriveSkills] - Skills frequently required by active campus drives
 * @returns {Array<Object>} List of structured suggestions
 */
function generateResumeSuggestions({
  text = '',
  extractedSkills = [],
  contactInfo = null,
  wordCount = 0,
  activeDriveSkills = [],
} = {}) {
  const suggestions = [];

  const rawText = typeof text === 'string' ? text.trim() : '';
  const calculatedWords =
    wordCount > 0
      ? wordCount
      : rawText
        ? rawText.split(/\s+/).filter(Boolean).length
        : 0;

  // 1. Guard against empty or unextractable text
  if (!rawText || calculatedWords === 0) {
    suggestions.push({
      id: 'doc-empty',
      category: 'content',
      type: 'empty_document',
      title: 'No Extractable Text Detected',
      explanation:
        'The resume file appears to have no readable text layers. It may be a scanned image, blank page, or corrupted document.',
      recommendation:
        'Export your resume directly as a text-based PDF (from Microsoft Word, Google Docs, or LaTeX) rather than an image scan so applicant tracking systems can index it.',
      isPositive: false,
      severity: 'warning',
    });
    return suggestions;
  }

  // Derive skills and contact info defensively if not provided
  const skills =
    Array.isArray(extractedSkills) && extractedSkills.length > 0
      ? extractedSkills
      : extractSkillsFromText(rawText);

  const contact =
    contactInfo && typeof contactInfo === 'object'
      ? contactInfo
      : extractContactInfo(rawText);

  // Helper to detect section headings deterministically
  const hasSection = (synonyms) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const syn of synonyms) {
      const exactHeading = new RegExp(`^[#*\\-\\d.\\s]*${syn}[:\\s*#\\-–—|]*$`, 'i');
      const inlineHeading = new RegExp(`^[#*\\-\\d.\\s]*${syn}\\s*[:\\-–—]`, 'i');
      const shortLineWordBoundary = new RegExp(`\\b${syn}\\b`, 'i');

      for (const line of lines) {
        if (exactHeading.test(line) || inlineHeading.test(line)) {
          return true;
        }
        if (line.length <= 40 && shortLineWordBoundary.test(line)) {
          const words = line.split(/\s+/);
          if (!line.endsWith('.') && words.length <= 5) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 2. Section Heading Audits
  // Education Section
  const educationSynonyms = [
    'education',
    'educational background',
    'academic background',
    'academics',
    'academic qualifications',
    'qualifications',
    'scholastic record',
    'scholastic achievements',
    'degrees',
  ];
  if (hasSection(educationSynonyms)) {
    suggestions.push({
      id: 'section-education',
      category: 'structure',
      type: 'section_present',
      title: 'Education Section Present',
      explanation: 'An Education or Academic Qualifications section heading was identified.',
      recommendation:
        'Ensure your degree, institution name, major, CGPA/percentage, and expected graduation year are clearly visible.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    suggestions.push({
      id: 'section-education',
      category: 'structure',
      type: 'section_missing',
      title: 'Missing Education Section',
      explanation: 'No distinct Education or Academic Background section heading was detected.',
      recommendation:
        'Add a dedicated Education section listing your current degree, college name, branch, graduation year, and CGPA.',
      isPositive: false,
      severity: 'warning',
    });
  }

  // Projects Section
  const projectsSynonyms = [
    'projects',
    'academic projects',
    'technical projects',
    'personal projects',
    'coursework projects',
    'key projects',
    'selected projects',
    'capstone project',
    'major projects',
  ];
  if (hasSection(projectsSynonyms)) {
    suggestions.push({
      id: 'section-projects',
      category: 'structure',
      type: 'section_present',
      title: 'Projects Section Present',
      explanation: 'A dedicated Projects section was identified in your resume.',
      recommendation:
        'Highlight 2-3 key technical projects with bullet points detailing the problem, stack, and measurable impact.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    suggestions.push({
      id: 'section-projects',
      category: 'structure',
      type: 'section_missing',
      title: 'Missing Projects Section',
      explanation: 'No dedicated Projects section heading was detected in the document.',
      recommendation:
        'Include a Projects section showcasing software, hardware, or research work with technologies used and GitHub links.',
      isPositive: false,
      severity: 'warning',
    });
  }

  // Experience / Internships Section (Carefully tailored for student level)
  const experienceSynonyms = [
    'experience',
    'work experience',
    'employment history',
    'internships',
    'internship experience',
    'professional experience',
    'work history',
    'practical training',
    'industrial training',
    'relevant experience',
    'apprenticeship',
  ];
  if (hasSection(experienceSynonyms)) {
    suggestions.push({
      id: 'section-experience',
      category: 'structure',
      type: 'section_present',
      title: 'Experience / Internship Section Present',
      explanation: 'An Experience, Internship, or Industrial Training section was detected.',
      recommendation:
        'Use action verbs (e.g., Developed, Optimized, Integrated) and quantify results where possible.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    suggestions.push({
      id: 'section-experience',
      category: 'structure',
      type: 'section_missing',
      title: 'No Experience / Internship Section Detected',
      explanation: 'No formal Experience or Internship section heading was detected in the document.',
      recommendation:
        'If you have completed internships, open-source work, or campus leadership roles, add an Experience section. If you are a fresher without prior internships, expand your Projects and Technical Skills sections.',
      isPositive: false,
      severity: 'info',
    });
  }

  // Technical Skills Section
  const skillsSynonyms = [
    'skills',
    'technical skills',
    'technologies',
    'core competencies',
    'key skills',
    'skillset',
    'areas of expertise',
    'programming skills',
    'tools & technologies',
    'competencies',
  ];
  if (hasSection(skillsSynonyms)) {
    suggestions.push({
      id: 'section-skills',
      category: 'structure',
      type: 'section_present',
      title: 'Technical Skills Section Present',
      explanation: 'A dedicated Skills or Technical Competencies section heading was identified.',
      recommendation:
        'Group skills by categories (e.g., Languages, Frameworks, Databases, Developer Tools) for fast recruiter scanning.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    suggestions.push({
      id: 'section-skills',
      category: 'structure',
      type: 'section_missing',
      title: 'Missing Dedicated Skills Section',
      explanation: 'No distinct Technical Skills or Competencies section heading was detected.',
      recommendation:
        'Create a categorized Technical Skills section listing your programming languages, frameworks, and developer tools.',
      isPositive: false,
      severity: 'warning',
    });
  }

  // 3. Length / Word Count Feedback
  if (calculatedWords < 150) {
    suggestions.push({
      id: 'length-short',
      category: 'length',
      type: 'length',
      title: 'Resume Content is Very Brief',
      explanation: `Extracted length is ${calculatedWords} words. Resumes with fewer than 150 words often lack adequate detail on technical projects, coursework, or responsibilities.`,
      recommendation:
        'Expand on your project architectures, tools utilized, and specific contributions to reach 200–500 words.',
      isPositive: false,
      severity: 'warning',
    });
  } else if (calculatedWords <= 650) {
    suggestions.push({
      id: 'length-optimal',
      category: 'length',
      type: 'length',
      title: 'Optimal Resume Length',
      explanation: `Extracted length is ${calculatedWords} words, which fits cleanly within the standard single-page target (150–650 words) for undergraduate placements.`,
      recommendation:
        'Maintain crisp bullet points and consistent formatting to ensure effortless readability during campus screenings.',
      isPositive: true,
      severity: 'success',
    });
  } else if (calculatedWords <= 850) {
    suggestions.push({
      id: 'length-dense',
      category: 'length',
      type: 'length',
      title: 'Dense Resume Content',
      explanation: `Extracted length is ${calculatedWords} words. This is on the longer side for a fresher resume and may risk crowding the page or overflowing into a second sheet.`,
      recommendation:
        'Ensure your margins, line spacing, and font size remain readable, or trim older high school details to keep it strictly 1 page.',
      isPositive: false,
      severity: 'info',
    });
  } else {
    suggestions.push({
      id: 'length-long',
      category: 'length',
      type: 'length',
      title: 'Resume is Unusually Long',
      explanation: `Extracted length is ${calculatedWords} words. Campus placement recruiters typically spend 20–30 seconds skimming fresh graduate resumes and strongly favor a concise 1-page profile.`,
      recommendation:
        'Condense older, duplicate, or secondary coursework details into high-impact bullet points to avoid multi-page sprawl.',
      isPositive: false,
      severity: 'warning',
    });
  }

  // 4. Contact Information Audits
  const hasEmail = Boolean(contact?.email);
  const hasPhone = Boolean(contact?.phone);
  const links = Array.isArray(contact?.links) ? contact.links : [];

  if (hasEmail && hasPhone) {
    suggestions.push({
      id: 'contact-complete',
      category: 'contact',
      type: 'contact_info',
      title: 'Essential Contact Details Detected',
      explanation: `Identified reachable contact email (${contact.email}) and phone number (${contact.phone}).`,
      recommendation:
        'Ensure contact details remain at the top header of the resume where recruiters expect them.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    if (!hasEmail) {
      suggestions.push({
        id: 'contact-missing-email',
        category: 'contact',
        type: 'contact_info',
        title: 'Missing Contact Email',
        explanation: 'No valid email address was detected in the document text.',
        recommendation:
          'Add a professional email address (college institutional or personal) in the header.',
        isPositive: false,
        severity: 'warning',
      });
    }
    if (!hasPhone) {
      suggestions.push({
        id: 'contact-missing-phone',
        category: 'contact',
        type: 'contact_info',
        title: 'Missing Phone Number',
        explanation: 'No phone number was identified in the resume text.',
        recommendation:
          'Include an active 10-digit mobile number with country code in your header.',
        isPositive: false,
        severity: 'warning',
      });
    }
  }

  // Professional Links (GitHub / LinkedIn)
  if (links.length > 0) {
    suggestions.push({
      id: 'contact-links-present',
      category: 'contact',
      type: 'contact_links',
      title: 'Professional Profiles Linked',
      explanation: `Identified ${links.length} portfolio link(s): ${links.join(', ')}.`,
      recommendation:
        'Verify that your linked profiles are active, have professional photos, and showcase clean project repositories.',
      isPositive: true,
      severity: 'success',
    });
  } else {
    suggestions.push({
      id: 'contact-links-missing',
      category: 'contact',
      type: 'contact_links',
      title: 'Consider Adding GitHub or LinkedIn Profiles',
      explanation: 'No GitHub or LinkedIn profile links were found in the resume.',
      recommendation:
        'Include hyperlinks to your LinkedIn profile and GitHub portfolio to allow recruiters to review your code and professional background.',
      isPositive: false,
      severity: 'info',
    });
  }

  // 5. Active Drive Skills Gap Feedback
  if (Array.isArray(activeDriveSkills) && activeDriveSkills.length > 0) {
    const resumeSkillSet = new Set(
      skills.map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
    );

    // Identify active drive skills missing from the resume
    const missingDriveSkills = [];
    for (const driveSkill of activeDriveSkills) {
      if (typeof driveSkill === 'string' && driveSkill.trim()) {
        const cleanSkill = driveSkill.trim();
        if (!resumeSkillSet.has(cleanSkill.toLowerCase())) {
          missingDriveSkills.push(cleanSkill);
        }
      }
    }

    if (missingDriveSkills.length > 0) {
      const topMissing = missingDriveSkills.slice(0, 4);
      suggestions.push({
        id: 'skills-drive-gap',
        category: 'skills',
        type: 'skills_gap',
        title: 'In-Demand Campus Skills Gap',
        explanation: `Active campus placement drives frequently seek ${topMissing.join(
          ', '
        )}, which were not identified in your resume text.`,
        recommendation: `If you have coursework, project, or certification experience with any of these (${topMissing.join(
          ', '
        )}), incorporate them into your Skills or Projects sections to increase recruiter match scores.`,
        isPositive: false,
        severity: 'info',
      });
    } else {
      suggestions.push({
        id: 'skills-drive-match',
        category: 'skills',
        type: 'skills_gap',
        title: 'Strong Campus Drive Skill Alignment',
        explanation:
          'Your resume features key technical skills actively sought by current campus placement opportunities.',
        recommendation:
          'Keep project descriptions updated with specific versions and tools to substantiate your proficiency.',
        isPositive: true,
        severity: 'success',
      });
    }
  }

  return suggestions;
}

/**
 * Parses a resume file provided as a Buffer or by referring to a safe, stored filename.
 * Does NOT expose server filesystem paths to the caller.
 *
 * @param {Object} options
 * @param {Buffer} [options.buffer] - Raw file Buffer
 * @param {string} [options.filename] - Original file name (to infer .pdf or .docx)
 * @param {string} [options.mimeType] - MIME type
 * @param {string} [options.storedFilename] - Name of a file stored in server/uploads/resumes/
 * @param {string[]} [options.activeDriveSkills] - Skills frequently required by active campus drives
 * @returns {Promise<Object>} Structured extraction result
 */
async function parseResume({
  buffer,
  filename,
  mimeType,
  storedFilename,
  activeDriveSkills = [],
} = {}) {
  let fileBuffer = buffer;
  let fileExt = '';

  // Case 1: Stored file reference (strictly restricted to uploads/resumes/)
  if (storedFilename) {
    if (typeof storedFilename !== 'string' || !storedFilename.trim()) {
      return {
        success: false,
        error: 'Invalid stored filename reference',
      };
    }

    const safeBasename = path.basename(storedFilename.trim());
    const resolvedPath = path.join(UPLOADS_DIR, safeBasename);

    // Guard against path traversal
    if (!resolvedPath.startsWith(UPLOADS_DIR) || !fs.existsSync(resolvedPath)) {
      return {
        success: false,
        error: 'Resume file not found or unauthorized path access',
      };
    }

    try {
      fileBuffer = fs.readFileSync(resolvedPath);
      fileExt = path.extname(safeBasename).toLowerCase();
    } catch (err) {
      return {
        success: false,
        error: `Failed to read stored resume: ${err.message}`,
      };
    }
  }

  // Case 2: Buffer provided directly
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return {
      success: false,
      error: 'No valid file buffer or stored filename provided',
    };
  }

  if (fileBuffer.length === 0) {
    return {
      success: false,
      error: 'Resume file is empty (0 bytes)',
    };
  }

  // Determine file extension
  if (!fileExt) {
    if (filename) {
      fileExt = path.extname(filename).toLowerCase();
    } else if (mimeType) {
      if (mimeType.includes('pdf')) fileExt = '.pdf';
      else if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) fileExt = '.docx';
      else if (mimeType.includes('msword')) fileExt = '.doc';
    }
  }

  // Fallback signature check if extension is still missing
  if (!fileExt) {
    if (fileBuffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
      fileExt = '.pdf';
    } else if (
      fileBuffer.length >= 4 &&
      fileBuffer[0] === 0x50 &&
      fileBuffer[1] === 0x4b &&
      fileBuffer[2] === 0x03 &&
      fileBuffer[3] === 0x04
    ) {
      fileExt = '.docx';
    }
  }

  let extractedText = '';

  try {
    if (fileExt === '.pdf') {
      extractedText = await extractTextFromPdf(fileBuffer);
    } else if (fileExt === '.docx') {
      extractedText = await extractTextFromDocx(fileBuffer);
    } else if (fileExt === '.doc') {
      return {
        success: false,
        error:
          'Text extraction is not supported for legacy binary .doc files. Please use modern PDF (.pdf) or Word (.docx) format.',
      };
    } else {
      return {
        success: false,
        error: `Unsupported file type '${fileExt || 'unknown'}'. Supported formats are PDF (.pdf) and DOCX (.docx).`,
      };
    }
  } catch (extractErr) {
    return {
      success: false,
      error: `Failed to parse document content: ${extractErr.message}`,
    };
  }

  const extractedSkills = extractSkillsFromText(extractedText);
  const contactInfo = extractContactInfo(extractedText);
  const wordCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;

  const suggestions = generateResumeSuggestions({
    text: extractedText,
    extractedSkills,
    contactInfo,
    wordCount,
    activeDriveSkills,
  });

  return {
    success: true,
    fileType: fileExt.replace('.', '').toUpperCase(),
    characterCount: extractedText.length,
    wordCount,
    text: extractedText,
    extractedSkills,
    contactInfo,
    suggestions,
  };
}

module.exports = {
  parseResume,
  generateResumeSuggestions,
  extractSkillsFromText,
  extractContactInfo,
  extractTextFromPdf,
  extractTextFromDocx,
};
