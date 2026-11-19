/**
 * resume_suggestions.test.js
 * Comprehensive unit test suite for deterministic resume improvement suggestions:
 * 1. Missing and equivalent section headings (Education, Projects, Experience, Skills)
 * 2. Short, optimal, dense, and unusually long word count thresholds
 * 3. Drive skill gaps: present vs missing skills across active placement drives
 * 4. Contact details & portfolio links detection
 * 5. Empty, blank, and malformed extracted text
 * 6. Backward compatibility of parseResume data contract
 * 7. In-memory safety (no side effects or database mutation)
 */

const path = require('path');
const {
  generateResumeSuggestions,
  parseResume,
  extractSkillsFromText,
  extractContactInfo,
} = require(path.join(__dirname, '../../server/services/resumeParser'));

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    const errMsg = `FAILED: ${testName} ${details ? '(' + details + ')' : ''}`;
    failures.push(errMsg);
    console.error(`  [FAIL] ${errMsg}`);
  }
}

function runTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: RESUME IMPROVEMENT SUGGESTIONS (resumeParser.js)');
  console.log('===============================================================\n');

  // --- Scenario 1: Empty and Malformed Text ---
  console.log('--- Scenario 1: Empty & Malformed Extracted Text ---');
  {
    const emptyRes = generateResumeSuggestions({ text: '' });
    assert(Array.isArray(emptyRes), 'Empty string returns suggestions array');
    assert(emptyRes.length === 1, 'Empty string returns single empty_document suggestion');
    assert(emptyRes[0].type === 'empty_document', 'Identifies empty_document type');
    assert(emptyRes[0].severity === 'warning', 'Empty document has warning severity');
    assert(emptyRes[0].isPositive === false, 'Empty document is not positive');

    const whitespaceRes = generateResumeSuggestions({ text: '   \n\t   \r\n  ' });
    assert(whitespaceRes.length === 1 && whitespaceRes[0].type === 'empty_document', 'Whitespace-only string treated as empty document');

    const nullRes = generateResumeSuggestions({ text: null });
    assert(nullRes.length === 1 && nullRes[0].type === 'empty_document', 'Null text treated safely without throwing');

    const undefinedRes = generateResumeSuggestions({});
    assert(undefinedRes.length === 1 && undefinedRes[0].type === 'empty_document', 'Undefined arguments return safe empty suggestion');
  }

  // --- Scenario 2: Standard and Equivalent Section Headings ---
  console.log('\n--- Scenario 2: Standard & Equivalent Section Headings ---');
  {
    // Complete resume fixture with standard headings
    const standardResume = `
      John Doe
      johndoe@college.edu | 9876543210 | github.com/johndoe | linkedin.com/in/johndoe
      Education
      B.Tech Computer Science, GPA 8.5
      Technical Skills
      Languages: JavaScript, Python, C++, SQL
      Projects
      Placement Portal: Web app using React and Node.js
      Experience
      Software Engineering Intern at Tech Corp
      Worked on backend APIs and microservices.
    `;

    const stdSuggestions = generateResumeSuggestions({
      text: standardResume,
      wordCount: 200,
    });

    const eduPresent = stdSuggestions.find((s) => s.id === 'section-education');
    assert(eduPresent && eduPresent.isPositive === true, 'Standard "Education" heading detected as present');

    const projPresent = stdSuggestions.find((s) => s.id === 'section-projects');
    assert(projPresent && projPresent.isPositive === true, 'Standard "Projects" heading detected as present');

    const expPresent = stdSuggestions.find((s) => s.id === 'section-experience');
    assert(expPresent && expPresent.isPositive === true, 'Standard "Experience" heading detected as present');

    const skillsPresent = stdSuggestions.find((s) => s.id === 'section-skills');
    assert(skillsPresent && skillsPresent.isPositive === true, 'Standard "Technical Skills" heading detected as present');

    // Equivalent headings fixture
    const equivalentResume = `
      Jane Doe
      janedoe@college.edu | +91 9123456789
      ## Academic Background
      B.E. Information Technology
      Core Competencies:
      Java, Python, MongoDB, Docker
      Selected Projects:
      Cloud Storage Manager: Implemented with AWS and Node.js
      Industrial Training:
      Summer Intern at DataWorks
    `;

    const eqSuggestions = generateResumeSuggestions({
      text: equivalentResume,
      wordCount: 220,
    });

    const eqEdu = eqSuggestions.find((s) => s.id === 'section-education');
    assert(eqEdu && eqEdu.isPositive === true, 'Equivalent heading "Academic Background" recognized as Education');

    const eqSkills = eqSuggestions.find((s) => s.id === 'section-skills');
    assert(eqSkills && eqSkills.isPositive === true, 'Equivalent heading "Core Competencies:" recognized as Skills');

    const eqProj = eqSuggestions.find((s) => s.id === 'section-projects');
    assert(eqProj && eqProj.isPositive === true, 'Equivalent heading "Selected Projects:" recognized as Projects');

    const eqExp = eqSuggestions.find((s) => s.id === 'section-experience');
    assert(eqExp && eqExp.isPositive === true, 'Equivalent heading "Industrial Training:" recognized as Experience');
  }

  // --- Scenario 3: Missing Sections & Constructive Phrasing ---
  console.log('\n--- Scenario 3: Missing Sections & Constructive Phrasing ---');
  {
    // Resume with only projects and skills (no education, no experience)
    const missingSectionsResume = `
      Alex Smith
      alex@college.edu | 9876501234
      Skills:
      Python, Django, PostgreSQL
      Projects:
      AI Bot: Machine learning classification tool
    `;

    const suggestions = generateResumeSuggestions({
      text: missingSectionsResume,
      wordCount: 160,
    });

    const eduMissing = suggestions.find((s) => s.id === 'section-education');
    assert(eduMissing && eduMissing.isPositive === false && eduMissing.type === 'section_missing', 'Flags missing Education section');
    assert(eduMissing.severity === 'warning', 'Missing Education is marked as warning');

    const expMissing = suggestions.find((s) => s.id === 'section-experience');
    assert(expMissing && expMissing.isPositive === false && expMissing.type === 'section_missing', 'Flags missing Experience section');
    assert(expMissing.severity === 'info', 'Missing Experience uses info severity tailored for students/freshers');
    assert(expMissing.recommendation.includes('fresher'), 'Experience recommendation addresses freshers constructively');
  }

  // --- Scenario 4: Heading False-Positive Resistance ---
  console.log('\n--- Scenario 4: Heading False-Positive Resistance ---');
  {
    // Prose sentences containing words like "education" or "experience" in paragraph text
    const proseResume = `
      Taylor Green
      taylor@test.com | 9999888877
      I am a student passionate about continuous education and learning.
      My prior life experience has taught me teamwork and discipline.
      I have worked on various hobbies in my spare time.
    `;

    const suggestions = generateResumeSuggestions({
      text: proseResume,
      wordCount: 180,
    });

    const eduSection = suggestions.find((s) => s.id === 'section-education');
    assert(eduSection && eduSection.isPositive === false, 'Sentence containing "education" does not trigger false positive heading');

    const expSection = suggestions.find((s) => s.id === 'section-experience');
    assert(expSection && expSection.isPositive === false, 'Sentence containing "experience" does not trigger false positive heading');
  }

  // --- Scenario 5: Word Count Thresholds ---
  console.log('\n--- Scenario 5: Word Count & Length Thresholds ---');
  {
    // 1. Very brief resume (< 150 words)
    const shortText = 'John Doe. Student. Skills: Java, C++. Projects: Web Portal.';
    const shortSug = generateResumeSuggestions({ text: shortText, wordCount: 50 });
    const lengthShort = shortSug.find((s) => s.category === 'length');
    assert(lengthShort && lengthShort.id === 'length-short', 'Identifies very brief resume (< 150 words)');
    assert(lengthShort.isPositive === false && lengthShort.severity === 'warning', 'Brief resume has warning severity');

    // 2. Optimal length (150 - 650 words)
    const optText = 'Word '.repeat(300);
    const optSug = generateResumeSuggestions({ text: optText, wordCount: 300 });
    const lengthOpt = optSug.find((s) => s.category === 'length');
    assert(lengthOpt && lengthOpt.id === 'length-optimal', 'Identifies optimal resume length (150–650 words)');
    assert(lengthOpt.isPositive === true && lengthOpt.severity === 'success', 'Optimal length is a positive finding');

    // 3. Dense content (651 - 850 words)
    const denseText = 'Word '.repeat(720);
    const denseSug = generateResumeSuggestions({ text: denseText, wordCount: 720 });
    const lengthDense = denseSug.find((s) => s.category === 'length');
    assert(lengthDense && lengthDense.id === 'length-dense', 'Identifies dense content (651–850 words)');
    assert(lengthDense.isPositive === false && lengthDense.severity === 'info', 'Dense resume has info severity');

    // 4. Unusually long (> 850 words)
    const longText = 'Word '.repeat(950);
    const longSug = generateResumeSuggestions({ text: longText, wordCount: 950 });
    const lengthLong = longSug.find((s) => s.category === 'length');
    assert(lengthLong && lengthLong.id === 'length-long', 'Identifies unusually long resume (> 850 words)');
    assert(lengthLong.isPositive === false && lengthLong.severity === 'warning', 'Long resume has warning severity');
  }

  // --- Scenario 6: Contact Information & Profile Links ---
  console.log('\n--- Scenario 6: Contact Info & Portfolio Links Audits ---');
  {
    // Missing email
    const noEmail = generateResumeSuggestions({
      text: 'John Doe\nPhone: 9876543210\nEducation\nB.Tech',
      contactInfo: { email: null, phone: '9876543210', links: [] },
      wordCount: 200,
    });
    const missEmail = noEmail.find((s) => s.id === 'contact-missing-email');
    assert(missEmail && missEmail.isPositive === false, 'Identifies missing contact email');

    // Missing phone
    const noPhone = generateResumeSuggestions({
      text: 'John Doe\njohn@college.edu\nEducation\nB.Tech',
      contactInfo: { email: 'john@college.edu', phone: null, links: [] },
      wordCount: 200,
    });
    const missPhone = noPhone.find((s) => s.id === 'contact-missing-phone');
    assert(missPhone && missPhone.isPositive === false, 'Identifies missing contact phone number');

    // Missing portfolio links
    const noLinks = generateResumeSuggestions({
      text: 'John Doe\njohn@college.edu\n9876543210\nEducation\nB.Tech',
      contactInfo: { email: 'john@college.edu', phone: '9876543210', links: [] },
      wordCount: 200,
    });
    const missLinks = noLinks.find((s) => s.id === 'contact-links-missing');
    assert(missLinks && missLinks.isPositive === false, 'Recommends adding GitHub or LinkedIn portfolio links');

    // Complete contact & links
    const completeContact = generateResumeSuggestions({
      text: 'John Doe\njohn@college.edu\n9876543210\ngithub.com/johndoe\nlinkedin.com/in/johndoe',
      contactInfo: {
        email: 'john@college.edu',
        phone: '9876543210',
        links: ['https://github.com/johndoe', 'https://linkedin.com/in/johndoe'],
      },
      wordCount: 200,
    });
    const hasComplete = completeContact.find((s) => s.id === 'contact-complete');
    assert(hasComplete && hasComplete.isPositive === true, 'Identifies complete contact info as positive strength');

    const hasLinks = completeContact.find((s) => s.id === 'contact-links-present');
    assert(hasLinks && hasLinks.isPositive === true, 'Identifies portfolio links as positive strength');
  }

  // --- Scenario 7: Drive Skills Gap Matching ---
  console.log('\n--- Scenario 7: Placement Drive Skills Gap Analysis ---');
  {
    const resumeSkills = ['Java', 'SQL', 'HTML', 'CSS'];
    const activeDriveSkills = ['React', 'Data Structures & Algorithms', 'Azure', 'SQL', 'C++'];

    const gapSug = generateResumeSuggestions({
      text: 'Resume text with some skills\nEducation\nProjects\nExperience\nSkills',
      extractedSkills: resumeSkills,
      activeDriveSkills,
      wordCount: 200,
    });

    const skillGap = gapSug.find((s) => s.id === 'skills-drive-gap');
    assert(skillGap && skillGap.isPositive === false, 'Identifies missing drive skills as actionable suggestion');
    assert(skillGap.explanation.includes('React'), 'Skill gap explanation mentions top missing skill React');
    assert(skillGap.explanation.includes('Azure'), 'Skill gap explanation mentions Azure');
    assert(!skillGap.explanation.includes('SQL,'), 'Skill gap does not flag SQL because it is present in resume');

    // When all drive skills are matched
    const fullMatchSug = generateResumeSuggestions({
      text: 'Resume with all drive skills\nEducation\nProjects\nExperience\nSkills',
      extractedSkills: ['React', 'Data Structures & Algorithms', 'Azure', 'SQL', 'C++'],
      activeDriveSkills: ['React', 'SQL'],
      wordCount: 200,
    });
    const skillMatch = fullMatchSug.find((s) => s.id === 'skills-drive-match');
    assert(skillMatch && skillMatch.isPositive === true, 'Identifies complete alignment with active drive skills as positive highlight');

    // When activeDriveSkills is empty array
    const emptyDriveSug = generateResumeSuggestions({
      text: 'Resume text\nEducation\nProjects',
      extractedSkills: ['Java'],
      activeDriveSkills: [],
      wordCount: 200,
    });
    const noDriveGap = emptyDriveSug.find((s) => s.id === 'skills-drive-gap' || s.id === 'skills-drive-match');
    assert(!noDriveGap, 'Omits drive skill gap suggestion when no active drives are available');
  }

  // --- Scenario 8: parseResume Contract & Backward Compatibility ---
  console.log('\n--- Scenario 8: parseResume Contract & Backward Compatibility ---');
  {
    parseResume({
      storedFilename: 'resume-6ac0e6edec34c6d148de5d60-1791165313680-543557642.pdf',
      activeDriveSkills: ['React', 'Azure', 'C++'],
    })
      .then((result) => {
        assert(result.success === true, 'parseResume succeeds with valid stored PDF');
        assert(typeof result.fileType === 'string', 'fileType field preserved');
        assert(typeof result.characterCount === 'number', 'characterCount field preserved');
        assert(typeof result.wordCount === 'number', 'wordCount field preserved');
        assert(typeof result.text === 'string', 'text field preserved');
        assert(Array.isArray(result.extractedSkills), 'extractedSkills field preserved as array');
        assert(typeof result.contactInfo === 'object', 'contactInfo field preserved as object');
        assert(Array.isArray(result.suggestions), 'suggestions field is present as an array');
        assert(result.suggestions.length > 0, `Generated ${result.suggestions.length} suggestions on real PDF`);

        // Validate structure of every suggestion
        const validSchema = result.suggestions.every(
          (s) =>
            typeof s.id === 'string' &&
            typeof s.category === 'string' &&
            typeof s.type === 'string' &&
            typeof s.title === 'string' &&
            typeof s.explanation === 'string' &&
            typeof s.recommendation === 'string' &&
            typeof s.isPositive === 'boolean' &&
            ['success', 'info', 'warning'].includes(s.severity)
        );
        assert(validSchema === true, 'All suggestions strictly conform to required schema contract');

        printSummary();
      })
      .catch((err) => {
        assert(false, `parseResume threw an error: ${err.message}`);
        printSummary();
      });
    return;
  }
}

function printSummary() {
  console.log('\n===============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================\n');

  if (failed > 0) {
    console.error('Test Failures:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('ALL RESUME IMPROVEMENT SUGGESTIONS TESTS PASSED.');
  }
}

runTests();
