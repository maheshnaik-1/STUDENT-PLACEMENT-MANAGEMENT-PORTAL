/**
 * @file skillMatcher.js
 * @desc Deterministic Skill Matching & Normalization Engine for Placement Portal V3.0
 */

// Canonical alias dictionary: maps lowercase variants to standard display names
const SKILL_ALIASES = {
  // Programming Languages
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'ecmascript': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'python': 'Python',
  'py': 'Python',
  'python3': 'Python',
  'java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'cplusplus': 'C++',
  'c plus plus': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'c sharp': 'C#',
  'c': 'C',
  'golang': 'Go',
  'go': 'Go',
  'rust': 'Rust',
  'ruby': 'Ruby',
  'php': 'PHP',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'dart': 'Dart',
  'scala': 'Scala',
  'r': 'R',
  'bash': 'Bash',
  'shell': 'Shell Scripting',
  'powershell': 'PowerShell',
  'sql': 'SQL',
  'html': 'HTML',
  'html5': 'HTML',
  'css': 'CSS',
  'css3': 'CSS',

  // Frontend Frameworks & Libraries
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'angular': 'Angular',
  'angular.js': 'Angular',
  'angularjs': 'Angular',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'next': 'Next.js',
  'redux': 'Redux',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'jquery': 'jQuery',

  // Backend Frameworks & Runtimes
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'nest.js': 'NestJS',
  'nestjs': 'NestJS',
  'asp.net': 'ASP.NET',
  'dotnet': '.NET',
  '.net': '.NET',
  'laravel': 'Laravel',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',

  // Mobile
  'flutter': 'Flutter',
  'react native': 'React Native',
  'react-native': 'React Native',
  'android': 'Android Development',
  'ios': 'iOS Development',

  // Databases & Storage
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'sqlite': 'SQLite',
  'redis': 'Redis',
  'oracle': 'Oracle DB',
  'cassandra': 'Cassandra',
  'dynamodb': 'DynamoDB',
  'firebase': 'Firebase',
  'supabase': 'Supabase',

  // Cloud & DevOps
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'azure': 'Azure',
  'microsoft azure': 'Azure',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'jenkins': 'Jenkins',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'linux': 'Linux',
  'unix': 'Linux',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'nginx': 'Nginx',

  // Data Science, AI & ML
  'machine learning': 'Machine Learning',
  'ml': 'Machine Learning',
  'artificial intelligence': 'Artificial Intelligence',
  'ai': 'Artificial Intelligence',
  'deep learning': 'Deep Learning',
  'dl': 'Deep Learning',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'computer vision': 'Computer Vision',
  'cv': 'Computer Vision',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'keras': 'Keras',
  'scikit-learn': 'Scikit-Learn',
  'sklearn': 'Scikit-Learn',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'matplotlib': 'Matplotlib',
  'tableau': 'Tableau',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',

  // Core Computer Science & Architecture
  'data structures': 'Data Structures',
  'algorithms': 'Algorithms',
  'dsa': 'Data Structures & Algorithms',
  'data structures and algorithms': 'Data Structures & Algorithms',
  'data structures & algorithms': 'Data Structures & Algorithms',
  'oop': 'OOP',
  'oops': 'OOP',
  'object oriented programming': 'OOP',
  'system design': 'System Design',
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  'restful': 'REST APIs',
  'restful api': 'REST APIs',
  'graphql': 'GraphQL',
  'microservices': 'Microservices',
  'dbms': 'DBMS',
  'computer networks': 'Computer Networks',
  'operating systems': 'Operating Systems',
  'agile': 'Agile',
  'scrum': 'Scrum',
};

/**
 * Normalizes a raw skill string into a canonical representation.
 * Handles casing, punctuation, and common aliases.
 *
 * @param {string} rawSkill
 * @returns {string} Canonical skill name
 */
function normalizeSkill(rawSkill) {
  if (!rawSkill || typeof rawSkill !== 'string') return '';

  const clean = rawSkill.trim();
  if (!clean) return '';

  const lower = clean.toLowerCase();

  // 1. Direct alias match
  if (SKILL_ALIASES[lower]) {
    return SKILL_ALIASES[lower];
  }

  // 2. Normalized punctuation match (e.g. "node-js" or "react_js")
  const stripped = lower.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SKILL_ALIASES[stripped]) {
    return SKILL_ALIASES[stripped];
  }
  const collapsed = lower.replace(/[-_.\s]/g, '');
  if (SKILL_ALIASES[collapsed]) {
    return SKILL_ALIASES[collapsed];
  }

  // 3. Fallback: Capitalize words cleanly
  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Regex for detecting supported alternative delimiters:
// 1. Pipe: | with optional whitespace (\s*\|\s*)
// 2. Slash with adjacent whitespace: (\s+\/\s*|\s*\/\s+) - avoids false splitting of literal slashes in "CI/CD", "TCP/IP", "PL/SQL"
// 3. Word "or": surrounded by whitespace (\s+or\s+)
const ALTERNATIVE_DELIMITER_REGEX = /\s*\|\s*|\s+\/\s*|\s*\/\s+|\s+or\s+/i;

/**
 * Parses a single skill requirement string, detecting whether it defines
 * an alternative skill slot (e.g. "Java / Python / C++" or "Java | Python | C++").
 *
 * @param {string} rawReq
 * @returns {{ isAlternative: boolean, canonical: string, options: string[] }}
 */
function parseRequirementSlot(rawReq) {
  if (!rawReq || typeof rawReq !== 'string') {
    return { isAlternative: false, canonical: '', options: [] };
  }

  const trimmed = rawReq.trim();
  if (!trimmed) {
    return { isAlternative: false, canonical: '', options: [] };
  }

  const lower = trimmed.toLowerCase();

  // If the entire raw string is an exact known skill/alias (e.g. "ci/cd", "c++", "c#", ".net"),
  // treat it as a single non-alternative requirement immediately.
  if (SKILL_ALIASES[lower]) {
    const canonical = SKILL_ALIASES[lower];
    return { isAlternative: false, canonical, options: [canonical] };
  }

  // Check if string contains supported alternative delimiters
  if (ALTERNATIVE_DELIMITER_REGEX.test(trimmed)) {
    const rawParts = trimmed.split(ALTERNATIVE_DELIMITER_REGEX);
    const seenOptions = new Set();
    const options = [];

    for (const part of rawParts) {
      const normalizedPart = normalizeSkill(part);
      if (normalizedPart && !seenOptions.has(normalizedPart.toLowerCase())) {
        seenOptions.add(normalizedPart.toLowerCase());
        options.push(normalizedPart);
      }
    }

    if (options.length > 1) {
      const canonical = options.join(' / ');
      return { isAlternative: true, canonical, options };
    } else if (options.length === 1) {
      return { isAlternative: false, canonical: options[0], options };
    }
  }

  // Standard single skill
  const canonical = normalizeSkill(trimmed);
  return { isAlternative: false, canonical, options: canonical ? [canonical] : [] };
}

/**
 * Normalizes an array, comma-separated string, or mixed collection of skills.
 * Filters out empty values and returns unique canonical names.
 *
 * @param {string[]|string|any} skillsInput
 * @returns {string[]} Array of unique canonical skill names
 */
function normalizeSkillList(skillsInput) {
  if (!skillsInput) return [];

  let items = [];
  if (Array.isArray(skillsInput)) {
    items = skillsInput;
  } else if (typeof skillsInput === 'string') {
    items = skillsInput.split(/[,;\n]/);
  } else {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (typeof item === 'string') {
      const parsed = parseRequirementSlot(item);
      if (parsed.canonical && !seen.has(parsed.canonical.toLowerCase())) {
        seen.add(parsed.canonical.toLowerCase());
        result.push(parsed.canonical);
      }
    }
  }

  return result;
}

/**
 * Deterministically evaluates candidate skills against required skills for a placement drive.
 * Supports alternative skill groups (e.g. "Java / Python / C++") where matching ANY option satisfies
 * the single requirement slot.
 *
 * @param {string[]|string} candidateSkillsInput - Candidate's skills (from profile or resume)
 * @param {string[]|string} requiredSkillsInput - Drive's required technical skills
 * @returns {Object} Structured match evaluation with explainable 0-100 score
 */
function calculateSkillMatch(candidateSkillsInput, requiredSkillsInput) {
  const candidateSkills = normalizeSkillList(candidateSkillsInput);

  let rawReqItems = [];
  if (Array.isArray(requiredSkillsInput)) {
    rawReqItems = requiredSkillsInput;
  } else if (typeof requiredSkillsInput === 'string') {
    rawReqItems = requiredSkillsInput.split(/[,;\n]/);
  }

  const reqSlots = [];
  const seenReqs = new Set();
  for (const raw of rawReqItems) {
    if (typeof raw === 'string') {
      const parsed = parseRequirementSlot(raw);
      if (parsed.canonical && !seenReqs.has(parsed.canonical.toLowerCase())) {
        seenReqs.add(parsed.canonical.toLowerCase());
        reqSlots.push(parsed);
      }
    }
  }

  // Set of candidate skills normalized to lowercase for fast O(1) comparison
  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase()));

  const matchedSkills = [];
  const missingSkills = [];
  let totalMatched = 0;

  // Track all individual skill tokens across all requirement slots
  const allRequiredOptionSet = new Set();

  for (const slot of reqSlots) {
    for (const opt of slot.options) {
      allRequiredOptionSet.add(opt.toLowerCase());
    }

    if (slot.isAlternative) {
      // Find candidate skills matching any option in this alternative slot
      const matchedOptions = slot.options.filter((opt) =>
        candidateSet.has(opt.toLowerCase())
      );

      if (matchedOptions.length > 0) {
        totalMatched += 1; // Count group as 1 requirement
        for (const opt of matchedOptions) {
          if (!matchedSkills.includes(opt)) {
            matchedSkills.push(opt);
          }
        }
      } else {
        // Group unsatisfied: record canonical group in missingSkills
        missingSkills.push(slot.canonical);
      }
    } else {
      // Single mandatory skill requirement
      const opt = slot.options[0] || slot.canonical;
      if (candidateSet.has(opt.toLowerCase())) {
        totalMatched += 1;
        matchedSkills.push(opt);
      } else {
        missingSkills.push(slot.canonical);
      }
    }
  }

  // Additional skills candidate possesses that were not part of any requirement slot
  const additionalSkills = candidateSkills.filter(
    (candSkill) => !allRequiredOptionSet.has(candSkill.toLowerCase())
  );

  const totalRequired = reqSlots.length;

  let score = 0;
  let explanation = '';

  if (totalRequired === 0) {
    // Legacy drives or drives without specific technical skill filters:
    // All candidates receive a baseline score of 100% as no skill requirements were specified.
    score = 100;
    explanation =
      'No specific technical skills are required for this placement drive (baseline 100% match score). This does not establish candidate suitability or job qualification.';
  } else if (candidateSkills.length === 0) {
    score = 0;
    explanation = `Candidate has no listed technical skills. ${totalRequired} required skills missing.`;
  } else {
    // Deterministic linear score: (matched / required) * 100
    score = Math.round((totalMatched / totalRequired) * 100);
    // Strict clamp between 0 and 100
    score = Math.max(0, Math.min(100, score));

    if (score === 100) {
      explanation = `Exceptional match! Candidate satisfies all ${totalRequired} required skills (${matchedSkills.join(', ')}).`;
    } else if (score >= 70) {
      explanation = `Strong match: ${totalMatched} of ${totalRequired} required skills matched (${score}%). Missing: ${missingSkills.join(', ')}.`;
    } else if (score >= 40) {
      explanation = `Moderate match: ${totalMatched} of ${totalRequired} required skills matched (${score}%). Missing: ${missingSkills.join(', ')}.`;
    } else if (score > 0) {
      explanation = `Partial match: ${totalMatched} of ${totalRequired} required skills matched (${score}%). Missing: ${missingSkills.join(', ')}.`;
    } else {
      explanation = `No match: 0 of ${totalRequired} required skills matched. Missing: ${missingSkills.join(', ')}.`;
    }
  }

  return {
    score,
    matchPercentage: score,
    matchedSkills,
    missingSkills,
    additionalSkills,
    totalRequired,
    totalMatched,
    explanation,
  };
}

module.exports = {
  SKILL_ALIASES,
  normalizeSkill,
  normalizeSkillList,
  parseRequirementSlot,
  calculateSkillMatch,
};
