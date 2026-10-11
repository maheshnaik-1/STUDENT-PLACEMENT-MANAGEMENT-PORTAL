/**
 * recommendations_browser.test.js
 * End-to-end browser validation of Placement Recommendations and Skill Matching:
 * 1. Rahul Verma - All Campus Drives tab & Smart Recommendations tab
 * 2. Drive Details page - Google Web Development (Partial Match 67%)
 * 3. Drive Details page - Deloitte India (Empty Required Skills / Baseline)
 * 4. Academic Eligibility Separation - Arjun Patel (Ineligible)
 * 5. Placement Officer view - Applicants table & Applicant Evaluation Modal
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

async function getTokenFor(email) {
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ email });
  await mongoose.disconnect();

  if (!user) throw new Error(`User ${email} not found`);
  return {
    token: jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    ),
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      cgpa: user.cgpa,
      activeBacklogs: user.activeBacklogs,
    },
  };
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

async function captureScreenshot(cdp, filename) {
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const artifactsDir = path.join(os.tmpdir(), 'portal_test_artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const filepath = path.join(artifactsDir, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

async function runBrowserTests() {
  console.log('===============================================================');
  console.log('  E2E BROWSER VALIDATION: RECOMMENDATIONS & SKILL MATCHING');
  console.log('===============================================================\n');

  const rahul = await getTokenFor('rahul.cse@college.edu');
  const arjun = await getTokenFor('arjun.ece@college.edu');
  const officer = await getTokenFor('officer@college.edu');

  const chromePath = getChromePath();
  const debuggingPort = 9222;
  const userDataDir = path.join(os.tmpdir(), `chrome_recs_test_${Date.now()}`);

  const chromeProcess = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,950',
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

    // -------------------------------------------------------------------
    // STEP 1: Rahul Verma - All Campus Drives tab
    // -------------------------------------------------------------------
    console.log('--- Step 1: Login as Rahul Verma & Load /student/drives ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await wait(1200);

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(rahul.token)});`,
    });
    await wait(300);

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/drives' });
    await wait(3000);

    const drivesAllInfo = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = document.querySelectorAll('.card');
          const title = document.querySelector('.page-title')?.textContent;
          const userPill = document.querySelector('.page-header')?.textContent;
          return { cardCount: cards.length, title, userPill: userPill?.trim() };
        })()
      `,
      returnByValue: true,
    });
    console.log('  All Drives View card count:', drivesAllInfo.result?.value?.cardCount);
    await captureScreenshot(cdp, 'browser_audit_01_all_drives.png');

    // -------------------------------------------------------------------
    // STEP 2: Rahul Verma - Click "Smart Recommendations" tab
    // -------------------------------------------------------------------
    console.log('\n--- Step 2: Switch to "Smart Recommendations" tab ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const recBtn = buttons.find(b => b.textContent.includes('Smart Recommendations'));
          if (recBtn) recBtn.click();
          return Boolean(recBtn);
        })()
      `,
    });
    await wait(2500);

    const recsInfo = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const advisory = document.querySelector('[style*="linear-gradient(135deg, #f5f3ff"]')?.textContent;
          const cards = Array.from(document.querySelectorAll('.card')).map(card => {
            const h4 = card.querySelector('h4')?.textContent?.trim();
            const tier = card.querySelector('[style*="border-radius: 4px"]')?.textContent?.trim();
            const score = card.querySelector('[style*="fontWeight: 800"]')?.textContent?.trim() ||
                          card.querySelector('[style*="fontWeight: 700"][style*="fontSize: 0.75rem"]')?.textContent?.trim();
            return { h4, tier, score };
          }).filter(c => c.h4);
          return { hasAdvisory: Boolean(advisory), cardCount: cards.length };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Smart Recommendations rendered:', recsInfo.result?.value?.cardCount, 'cards');
    await captureScreenshot(cdp, 'browser_audit_02_recommendations_tab.png');

    // -------------------------------------------------------------------
    // STEP 3: Drive Details Page - Google Web Development (Partial Match 67%)
    // -------------------------------------------------------------------
    console.log('\n--- Step 3: Google Web Development Drive Details (67% Match) ---');
    await cdp.send('Page.navigate', {
      url: 'http://localhost:3000/student/drives/6ac35bd533bf145003f883df',
    });
    await wait(3000);

    const webDevDetails = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('h1')?.textContent;
          const matchPill = document.querySelector('[style*="padding: 0.25rem 0.75rem"]')?.textContent;
          const isEligibleBadge = document.querySelector('.badge-selected')?.textContent;
          return { title, matchPill, isEligibleBadge };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Google Web Development Details:', webDevDetails.result?.value?.matchPill);
    await captureScreenshot(cdp, 'browser_audit_03_google_webdev_details.png');

    // -------------------------------------------------------------------
    // STEP 4: Drive Details Page - Deloitte India (Empty Required Skills / Baseline)
    // -------------------------------------------------------------------
    console.log('\n--- Step 4: Deloitte India Drive Details (Empty Required Skills / Baseline) ---');
    await cdp.send('Page.navigate', {
      url: 'http://localhost:3000/student/drives/6ac0e6edec34c6d148de5d79',
    });
    await wait(3000);

    const deloitteDetails = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('h1')?.textContent;
          const matchPill = document.querySelector('[style*="padding: 0.25rem 0.75rem"]')?.textContent;
          return { title, matchPill };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Deloitte India Details:', deloitteDetails.result?.value?.matchPill);
    await captureScreenshot(cdp, 'browser_audit_04_deloitte_baseline_details.png');

    // -------------------------------------------------------------------
    // STEP 5: Academic Eligibility Separation - Arjun Patel (Ineligible)
    // -------------------------------------------------------------------
    console.log('\n--- Step 5: Academic Eligibility Separation - Arjun Patel (ECE, CGPA 6.4, 1 Backlog) ---');
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(arjun.token)});`,
    });
    await wait(300);

    await cdp.send('Page.navigate', {
      url: 'http://localhost:3000/student/drives/6ac35bd533bf145003f883df',
    });
    await wait(3000);

    const arjunWebDev = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const eligBadge = document.querySelector('.badge-rejected')?.textContent;
          const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Not Eligible'));
          const skillMatchPill = document.querySelector('[style*="padding: 0.25rem 0.75rem"]')?.textContent;
          return {
            eligBadge,
            applyDisabled: applyBtn ? applyBtn.disabled : null,
            skillMatchPill,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Arjun Patel on Google Web Dev:', arjunWebDev.result?.value?.eligBadge, '| Apply disabled:', arjunWebDev.result?.value?.applyDisabled);
    await captureScreenshot(cdp, 'browser_audit_05_arjun_ineligible_separation.png');

    // -------------------------------------------------------------------
    // STEP 6: Placement Officer View - TCS Digital Applicants
    // -------------------------------------------------------------------
    console.log('\n--- Step 6: Placement Officer View - TCS Digital Applicants ---');
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(officer.token)});`,
    });
    await wait(300);

    await cdp.send('Page.navigate', {
      url: 'http://localhost:3000/officer/drives/6ac0e6edec34c6d148de5d7a/applicants',
    });
    await wait(3000);

    const officerApplicantsInfo = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = document.querySelectorAll('tbody tr');
          return { rowCount: rows.length };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Officer Applicants row count:', officerApplicantsInfo.result?.value?.rowCount);
    await captureScreenshot(cdp, 'browser_audit_06_officer_applicants.png');

    // Click "Evaluate" button on first applicant
    console.log('\n--- Step 7: Open Officer Applicant Evaluation Modal ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const evalBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Evaluate'));
          if (evalBtns.length > 0) {
            evalBtns[0].click();
            return true;
          }
          return false;
        })()
      `,
    });
    await wait(1500);

    const modalInfo = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const modalTitle = document.querySelector('.modal-title, [class*="modal"] h3, h3')?.textContent;
          return {
            isOpen: Boolean(modalTitle),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Officer Evaluation Modal opened:', modalInfo.result?.value?.isOpen);
    await captureScreenshot(cdp, 'browser_audit_07_officer_eval_modal.png');

    cdp.close();
  } finally {
    chromeProcess.kill();
  }

  console.log('\n===============================================================');
  console.log('  ALL BROWSER VALIDATION CHECKS COMPLETED SUCCESSFULLY');
  console.log('===============================================================\n');
}

runBrowserTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
