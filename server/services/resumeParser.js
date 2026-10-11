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
 * Parses a resume file provided as a Buffer or by referring to a safe, stored filename.
 * Does NOT expose server filesystem paths to the caller.
 *
 * @param {Object} options
 * @param {Buffer} [options.buffer] - Raw file Buffer
 * @param {string} [options.filename] - Original file name (to infer .pdf or .docx)
 * @param {string} [options.mimeType] - MIME type
 * @param {string} [options.storedFilename] - Name of a file stored in server/uploads/resumes/
 * @returns {Promise<Object>} Structured extraction result
 */
async function parseResume({ buffer, filename, mimeType, storedFilename }) {
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

  return {
    success: true,
    fileType: fileExt.replace('.', '').toUpperCase(),
    characterCount: extractedText.length,
    wordCount: extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0,
    text: extractedText,
    extractedSkills,
    contactInfo,
  };
}

module.exports = {
  parseResume,
  extractSkillsFromText,
  extractContactInfo,
  extractTextFromPdf,
  extractTextFromDocx,
};
