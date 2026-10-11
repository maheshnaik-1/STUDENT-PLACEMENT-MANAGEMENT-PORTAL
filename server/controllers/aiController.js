const User = require('../models/User');
const { parseResume } = require('../services/resumeParser');

/**
 * Safely normalizes student profile skills into a clean array of non-empty strings.
 * Accepts arrays or comma-separated strings. Ignores null, undefined, non-string, and whitespace-only entries.
 */
const normalizeStudentSkills = (rawSkills) => {
  if (!rawSkills) return [];
  const list = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string'
      ? rawSkills.split(',')
      : [];

  const result = [];
  for (const item of list) {
    if (typeof item === 'string') {
      const parts = item.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
          result.push(trimmed);
        }
      }
    }
  }
  return result;
};

/**
 * Compares extracted skills against student's existing profile skills.
 * Safely trims and lowercases both sides before comparison.
 */
const findNewSkills = (extractedSkills, currentProfileSkills) => {
  const currentSkills = normalizeStudentSkills(currentProfileSkills);
  const currentLowerSet = new Set(
    currentSkills.map((s) => s.toLowerCase())
  );

  const extracted = Array.isArray(extractedSkills) ? extractedSkills : [];
  return extracted.filter((skill) => {
    if (typeof skill !== 'string') return false;
    const trimmed = skill.trim();
    return trimmed.length > 0 && !currentLowerSet.has(trimmed.toLowerCase());
  });
};

/**
 * @desc    Parse and extract skills/contact info from authenticated student's stored resume
 * @route   POST /api/ai/parse-resume
 * @access  Private (Student only)
 */
const parseMyResume = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found',
      });
    }

    if (!student.resumeFile || !student.resumeFile.filename) {
      return res.status(400).json({
        success: false,
        message: 'No resume file found on your profile. Please upload a resume first.',
      });
    }

    // Parse the authenticated student's securely stored resume file
    const parseResult = await parseResume({
      storedFilename: student.resumeFile.filename,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error || 'Failed to extract text from resume.',
      });
    }

    // Compare extracted skills with student's current profile skills
    const currentSkills = normalizeStudentSkills(student.skills);
    const newSkillsFound = findNewSkills(
      parseResult.extractedSkills,
      currentSkills
    );

    // Return sanitized analysis without exposing filesystem paths
    // Note: Do NOT automatically modify student's profile skills
    res.status(200).json({
      success: true,
      data: {
        originalName: student.resumeFile.originalName || 'Resume',
        fileType: parseResult.fileType,
        characterCount: parseResult.characterCount,
        wordCount: parseResult.wordCount,
        extractedSkills: parseResult.extractedSkills,
        newSkillsFound,
        currentProfileSkills: currentSkills,
        contactInfo: parseResult.contactInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  parseMyResume,
  normalizeStudentSkills,
  findNewSkills,
};
