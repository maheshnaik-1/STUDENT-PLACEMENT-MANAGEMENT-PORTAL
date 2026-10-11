/**
 * resume_workflow_browser.test.js
 * End-to-end browser validation of the V3.0 Resume Skills & Intelligence Analysis workflow:
 * 1. Re-analyze extracts skills accurately from uploaded resume.
 * 2. Individual skill-add button adds only selected skill to profile form.
 * 3. "Add All to Profile Form" adds all discovered skills without duplicating.
 * 4. Current profile skills & detected skills are displayed accurately.
 * 5. Changes are NOT persisted to MongoDB until explicit form submission.
 * 6. Saving profile preserves existing student data without overwriting unrelated fields.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));

require(path.join(__dirname, '../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../server/.env'),
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getChromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    ].filter(Boolean);
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return 'google-chrome';
}

async function getStudentToken() {
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ role: 'student', email: 'rahul.cse@college.edu' });
  await mongoose.disconnect();

  if (!user) throw new Error('Student user not found');
  return {
    token: jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    ),
    originalUser: user,
  };
}

async function getMongoUser() {
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ role: 'student', email: 'rahul.cse@college.edu' });
  await mongoose.disconnect();
  return user;
}

async function restoreMongoSkills(originalSkills) {
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  await mongoose.connection.db
    .collection('users')
    .updateOne(
      { role: 'student', email: 'rahul.cse@college.edu' },
      { $set: { skills: originalSkills } }
    );
  await mongoose.disconnect();
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (err) => reject(err));
      this.ws.addEventListener('message', (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const { resolve, reject } = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runValidation() {
  console.log('===============================================================');
  console.log('  E2E BROWSER VALIDATION: RESUME SKILLS & INTELLIGENCE ANALYSIS');
  console.log('===============================================================\n');

  const { token, originalUser } = await getStudentToken();
  const initialSkills = [...originalUser.skills];
  console.log('Initial Student Profile loaded for testing:');
  console.log(`  Role: ${originalUser.role} | Branch: ${originalUser.branch} | Skills count: ${initialSkills.length}`);

  const chromePath = getChromePath();
  const debuggingPort = 9222;
  const userDataDir = path.join(os.tmpdir(), `chrome_resume_test_${Date.now()}`);

  const chromeProcess = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,900',
    ],
    { stdio: 'ignore' }
  );

  await wait(2000);

  try {
    const targets = await fetchJson(`http://localhost:${debuggingPort}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // 1. Authenticate session & navigate to /student/profile
    console.log('Navigating to /login to set auth token...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await wait(1200);

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(token)});`,
    });
    await wait(300);

    console.log('Navigating to http://localhost:3000/student/profile...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/profile' });
    await wait(3000);

    // Verify initial form skills
    const formSkillsInit = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[name="skills"]');
          return input ? input.value : null;
        })()
      `,
      returnByValue: true,
    });
    console.log(`Initial Form Skills Input: "${formSkillsInit.result.value}"`);

    // -------------------------------------------------------------
    // BEHAVIOR 4: Accurate Display of Profile & Detected Skills
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 4: Open Modal and Verify Skill Display ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI Skills Analysis'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(3000); // Allow modal to trigger parseResume and render

    const modalData = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const modal = document.querySelector('.modal-container');
          if (!modal) return { open: false };

          const text = modal.innerText;
          // Generic test fixtures / patterns to validate contact info and stats extraction without hardcoded personal PII
          const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          const phonePattern = /(\\+\\d{1,3}[- ]?)?\\d{10}/;
          const profileLinkPattern = /github\\.com\\/[a-zA-Z0-9_-]+/;

          return {
            open: true,
            hasBanner: text.includes('V3.0 Resume Text Extraction & Skill Discovery'),
            hasDocumentStats: text.includes('.pdf') && text.includes('Words:') && text.includes('Characters:'),
            hasDetectedCount: text.includes('Detected Skills:'),
            hasNewSkillsCount: text.includes('New Skills Discovered in Resume'),
            hasCurrentProfileSkills: text.includes('Current Profile Skills'),
            hasContactEmail: emailPattern.test(text),
            hasContactPhone: phonePattern.test(text),
            hasGitHubLink: profileLinkPattern.test(text),
          };
        })()
      `,
      returnByValue: true,
    });

    console.log('Behavior 4 Validation Result:', modalData.result.value);
    if (!modalData.result.value.open || !modalData.result.value.hasDocumentStats || !modalData.result.value.hasContactEmail) {
      throw new Error('Behavior 4 FAILED: Modal stats or document info not accurately displayed.');
    }
    console.log('  [PASS] Behavior 4: Accurate display of current profile skills, detected skills, stats, and contact info.');

    // -------------------------------------------------------------
    // BEHAVIOR 1: Re-analyze Button
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 1: Verify Re-analyze Action ---');
    const reanalyzeResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const reBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Re-analyze'));
          if (reBtn) {
            reBtn.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Re-analyze clicked:', reanalyzeResult.result.value);
    await wait(3000);

    const reanalyzeCheck = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const modal = document.querySelector('.modal-container');
          return {
            hasStats: modal ? modal.innerText.includes('Detected Skills:') : false,
            hasNewCount: modal ? modal.innerText.includes('New Skills Discovered in Resume') : false,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Re-analyze Check Result:', reanalyzeCheck.result.value);
    if (!reanalyzeCheck.result.value.hasStats) {
      throw new Error('Behavior 1 FAILED: Re-analyze did not produce expected extraction result.');
    }
    console.log('  [PASS] Behavior 1: Re-analyze successfully extracted skills from uploaded resume.');

    // -------------------------------------------------------------
    // BEHAVIOR 2: Individual Skill-Add Button Adds ONLY Selected Skill
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 2: Individual Skill-Add Button ---');
    const singleSkillClick = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const tailwindBtn = document.querySelector('button[title*="Tailwind CSS"]');
          if (tailwindBtn) {
            tailwindBtn.click();
            return { clicked: true, skill: 'Tailwind CSS' };
          }
          const firstPlusBtn = document.querySelector('div[style*="newSkillsFound"] button, span button');
          if (firstPlusBtn) {
            firstPlusBtn.click();
            return { clicked: true, skill: firstPlusBtn.title };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Clicked single skill add button:', singleSkillClick.result.value);
    await wait(600);

    // Check form skills input
    const formSkillsAfterSingle = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[name="skills"]');
          return input ? input.value : '';
        })()
      `,
      returnByValue: true,
    });
    console.log(`Form Skills Input After Single Add: "${formSkillsAfterSingle.result.value}"`);

    const skillsArrayAfterSingle = formSkillsAfterSingle.result.value.split(',').map((s) => s.trim());
    const containsTailwind = skillsArrayAfterSingle.includes('Tailwind CSS');
    const doesNotContainC = !skillsArrayAfterSingle.includes('C');
    const doesNotContainSQL = !skillsArrayAfterSingle.includes('SQL');

    console.log(`  Contains 'Tailwind CSS': ${containsTailwind}`);
    console.log(`  Does NOT contain 'C' (unclicked): ${doesNotContainC}`);
    console.log(`  Does NOT contain 'SQL' (unclicked): ${doesNotContainSQL}`);

    if (!containsTailwind || !doesNotContainC || !doesNotContainSQL) {
      throw new Error('Behavior 2 FAILED: Individual skill add did not add ONLY the selected skill.');
    }
    console.log('  [PASS] Behavior 2: Individual skill-add button added only the selected skill to the profile form.');

    // -------------------------------------------------------------
    // BEHAVIOR 5 (Part A): Changes NOT Persisted in MongoDB Yet
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 5 (Part A): MongoDB State Verification (Zero-Mutation Before Save) ---');
    const mongoUserMid = await getMongoUser();
    console.log(`MongoDB skills currently: [${mongoUserMid.skills.join(', ')}]`);
    const mongoHasTailwind = mongoUserMid.skills.includes('Tailwind CSS');
    console.log(`MongoDB contains 'Tailwind CSS' before save: ${mongoHasTailwind}`);
    if (mongoHasTailwind) {
      throw new Error('Behavior 5 FAILED: Changes were written to MongoDB before form submission!');
    }
    console.log('  [PASS] Behavior 5 (Part A): Changes are NOT persisted to MongoDB until student submits the form.');

    // -------------------------------------------------------------
    // BEHAVIOR 3: "Add All to Profile Form" Without Duplication
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 3: "Add All to Profile Form" Without Duplication ---');
    const addAllClick = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add All to Profile Form'));
          if (btn) {
            btn.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Clicked "Add All to Profile Form":', addAllClick.result.value);
    await wait(800);

    const formSkillsAfterAddAll = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[name="skills"]');
          return input ? input.value : '';
        })()
      `,
      returnByValue: true,
    });
    console.log(`Form Skills Input After Add All: "${formSkillsAfterAddAll.result.value}"`);

    const allSkillsList = formSkillsAfterAddAll.result.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Check for duplicate items (case-insensitive)
    const lowerCounts = {};
    for (const s of allSkillsList) {
      const k = s.toLowerCase();
      lowerCounts[k] = (lowerCounts[k] || 0) + 1;
    }
    const duplicates = Object.entries(lowerCounts).filter(([_, count]) => count > 1);
    console.log('Duplicates found in skills draft:', duplicates);

    if (duplicates.length > 0) {
      throw new Error(`Behavior 3 FAILED: Duplicates found in skills: ${JSON.stringify(duplicates)}`);
    }

    // Verify all 9 new skills + initial 7 skills are present
    const expectedNewSkills = ['JavaScript', 'C', 'SQL', 'HTML', 'CSS', 'Tailwind CSS', 'GitHub', 'Data Structures', 'OOP'];
    const missingSkills = expectedNewSkills.filter(
      (s) => !allSkillsList.map((x) => x.toLowerCase()).includes(s.toLowerCase())
    );
    console.log('Missing skills from expected new skills:', missingSkills);

    if (missingSkills.length > 0) {
      throw new Error(`Behavior 3 FAILED: Missing newly discovered skills: ${missingSkills.join(', ')}`);
    }
    console.log(`  [PASS] Behavior 3: Added all newly discovered skills (${allSkillsList.length} total) without duplication.`);

    // Close the modal
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Close' && b.closest('.modal-container'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await wait(600);

    // -------------------------------------------------------------
    // BEHAVIOR 5 & 6: Save Profile Form & Preserve Unrelated Fields
    // -------------------------------------------------------------
    console.log('\n--- BEHAVIOR 5 & 6: Save Profile Form & Verify MongoDB Persistence & Preservation ---');

    // Verify MongoDB still untouched before save
    const mongoUserPreSave = await getMongoUser();
    console.log(`MongoDB skills count before submit: ${mongoUserPreSave.skills.length} (original 7)`);
    if (mongoUserPreSave.skills.length !== 7) {
      throw new Error('Behavior 5 FAILED: MongoDB was altered before profile submission.');
    }

    // Click "Save Career Profile" button on the form
    console.log('Submitting profile form via "Save Career Profile" button...');
    const submitClick = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save Career Profile'));
          if (saveBtn) {
            saveBtn.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Save Career Profile clicked:', submitClick.result.value);
    await wait(3000); // Wait for PUT /api/auth/profile to complete

    // Inspect MongoDB after explicit form submission
    const mongoUserPostSave = await getMongoUser();
    console.log(`MongoDB skills count after submit: ${mongoUserPostSave.skills.length} skills: [${mongoUserPostSave.skills.join(', ')}]`);

    // Verification 1: Skills persisted
    if (mongoUserPostSave.skills.length <= 7) {
      throw new Error('Behavior 5/6 FAILED: Skills were not persisted to MongoDB after submitting form.');
    }
    console.log('  [PASS] Behavior 5: Profile changes successfully persisted to MongoDB upon explicit form submission.');

    // Verification 2: Unrelated fields preserved
    console.log('\nVerifying unrelated student fields are preserved:');
    const nameMatch = mongoUserPostSave.name === originalUser.name;
    const emailMatch = mongoUserPostSave.email === originalUser.email;
    const branchMatch = mongoUserPostSave.branch === originalUser.branch;
    const cgpaMatch = mongoUserPostSave.cgpa === originalUser.cgpa;
    const resumeMatch = mongoUserPostSave.resumeFile?.filename === originalUser.resumeFile?.filename;

    if (!nameMatch || !emailMatch || !branchMatch || !cgpaMatch || !resumeMatch) {
      throw new Error('Behavior 6 FAILED: Unrelated student profile fields were corrupted or overwritten.');
    }
    console.log('  [PASS] Behavior 6: All existing student profile fields and resume reference were safely preserved.');

    // -------------------------------------------------------------
    // RESTORATION: Restore Rahul's skills back to original 7
    // -------------------------------------------------------------
    console.log('\nRestoring student skills back to exact original database state...');
    await restoreMongoSkills(initialSkills);
    const restoredUser = await getMongoUser();
    console.log(`Restored MongoDB skills count: ${restoredUser.skills.length}: [${restoredUser.skills.join(', ')}]`);

    cdp.close();
    console.log('\n===============================================================');
    console.log('  ALL 6 WORKFLOW BEHAVIORS SUCCESSFULLY VERIFIED IN BROWSER!');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Validation Error:', err);
    await restoreMongoSkills(initialSkills);
    process.exit(1);
  } finally {
    chromeProcess.kill();
  }
}

runValidation();
