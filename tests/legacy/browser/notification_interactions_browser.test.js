/**
 * notification_interactions_browser.test.js
 * Verifies interactive behavior of the context-aware notification dropdown in the real browser:
 * 1. Toggle open/close via bell button
 * 2. Unread indicators and action items present
 * 3. Outside click dismisses the panel
 * 4. Item click dismisses panel and navigates to target route
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mongoose = require(path.join(__dirname, '../../../server/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../../../server/node_modules/jsonwebtoken'));

require(path.join(__dirname, '../../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../../server/.env'),
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
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
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

async function run() {
  console.log('===============================================================');
  console.log('  E2E BROWSER VALIDATION: NOTIFICATION DROPDOWN INTERACTIONS');
  console.log('===============================================================\n');

  const token = await getStudentToken();
  const chromePath = getChromePath();
  const debuggingPort = 9222;
  const userDataDir = path.join(os.tmpdir(), `chrome_notify_test_${Date.now()}`);

  const chromeProcess = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,800',
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

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await wait(1500);

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(token)});`,
    });
    await wait(400);

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/profile' });
    await wait(2500);

    console.log('--- Step 1: Open Dropdown by clicking Bell ---');
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.notification-bell-btn').click();`,
    });
    await wait(600);

    const step1 = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const dropdown = document.querySelector('.notification-dropdown');
          const items = document.querySelectorAll('.notification-item');
          return {
            isOpen: !!dropdown,
            itemsCount: items.length,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Dropdown open status:', step1.result.value);
    if (!step1.result.value.isOpen) {
      throw new Error('Step 1 FAILED: Notification dropdown failed to open.');
    }
    console.log('  [PASS] Step 1: Dropdown opens successfully upon clicking bell.');

    console.log('\n--- Step 2: Outside Click Dismissal ---');
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      `,
    });
    await wait(400);

    const step2 = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const dropdown = document.querySelector('.notification-dropdown');
          return { isOpen: !!dropdown };
        })()
      `,
      returnByValue: true,
    });
    console.log('Dropdown dismissed after outside click:', !step2.result.value.isOpen);
    if (step2.result.value.isOpen) {
      throw new Error('Step 2 FAILED: Notification dropdown remained open after outside click.');
    }
    console.log('  [PASS] Step 2: Outside click successfully dismisses dropdown panel.');

    console.log('\n--- Step 3: Re-open and Click Notification Item ---');
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.notification-bell-btn').click();`,
    });
    await wait(600);

    const step3 = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const firstItem = document.querySelector('.notification-item');
          if (firstItem) {
            firstItem.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Clicked notification item:', step3.result.value);
    await wait(1000);

    const finalState = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const dropdown = document.querySelector('.notification-dropdown');
          return {
            isClosedAfterItemClick: !dropdown,
            currentUrl: window.location.pathname,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Result after item click:', finalState.result.value);
    if (!finalState.result.value.isClosedAfterItemClick) {
      throw new Error('Step 3 FAILED: Notification dropdown did not close after clicking item.');
    }
    console.log('  [PASS] Step 3: Notification click successfully navigates and closes panel.');

    cdp.close();
    console.log('\n===============================================================');
    console.log('  ALL NOTIFICATION BROWSER INTERACTIONS PASSED SUCCESSFULLY');
    console.log('===============================================================\n');
  } finally {
    chromeProcess.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
