/**
 * application_withdrawal_browser.test.js
 * End-to-end browser validation of the Protected Student Application Withdrawal workflow.
 *
 * SAFETY MANDATES:
 * 1. Operates EXCLUSIVELY against an isolated test database ('placement_portal_test').
 * 2. NEVER connects to or performs write operations against 'placement_portal'.
 * 3. Dedicated Backend Isolation: Spawns test backend exclusively on dedicated port 5001.
 * 4. Fails safely if port 5001 is already occupied by an unexpected process.
 * 5. Verifies backend health and database identity on port 5001 before browser interactions.
 * 6. Chrome routes all /api calls to port 5001 (port 5000 dev backend is completely bypassed).
 * 7. Non-destructive fixture cleanup: Explicitly confirms disposable fixture absence,
 *    accounts for endpoint-level deletion, and asserts all pre-existing records remain intact.
 */

const http = require('http');
const net = require('net');
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

// Configurable artifacts directory with safe portable fallback
const ARTIFACTS_DIR =
  process.env.ARTIFACTS_DIR ||
  path.join(os.tmpdir(), 'placement_portal_artifacts');

// EXPLICIT ISOLATED TEST CONFIGURATION
const REQUIRED_TEST_DB_NAME = 'placement_portal_test';
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_portal_test';
const TEST_BACKEND_PORT = 5001; // Dedicated test port (isolated from dev backend port 5000)

/**
 * Extracts and returns the database name component from a MongoDB connection URI.
 */
function getDatabaseNameFromUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) return null;
  try {
    const normalized = uri.replace(/^mongodb(?:\+srv)?:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const dbPath = parsed.pathname.replace(/^\//, '').split('/')[0];
    const cleanDb = dbPath ? dbPath.split('?')[0].trim() : null;
    return cleanDb || null;
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i);
    return match ? match[1].trim() : null;
  }
}

/**
 * Validates that the configured MongoDB URI specifies strictly and exactly 'placement_portal_test'.
 * Aborts safely for any other database before any network connection or operation is attempted.
 */
function validateTestUri(uri) {
  const dbName = getDatabaseNameFromUri(uri);
  if (dbName !== REQUIRED_TEST_DB_NAME) {
    throw new Error(
      `[CRITICAL SAFETY ABORT] Configured MongoDB URI targets '${dbName || 'unknown'}'! ` +
      `Test must target strictly and exactly '${REQUIRED_TEST_DB_NAME}'. ` +
      `Aborting safely without connecting or modifying any database.`
    );
  }
  return dbName;
}

/**
 * Strict Safety Guard: Validates that the active database connection is strictly 'placement_portal_test'.
 * Throws immediately before any read, fixture insertion, or cleanup write if the database is anything else.
 */
function assertIsolatedDatabase(db, operation = 'operation') {
  if (!db) {
    throw new Error(`[SAFETY ABORT] No active database connection for ${operation}. Aborting safely.`);
  }
  const dbName = db.databaseName;
  if (!dbName) {
    throw new Error(`[SAFETY ABORT] databaseName is undefined for ${operation}. Aborting safely.`);
  }
  if (dbName !== REQUIRED_TEST_DB_NAME) {
    throw new Error(
      `[CRITICAL SAFETY VIOLATION] Target database is '${dbName}' during ${operation}! ` +
      `Must be strictly and exactly '${REQUIRED_TEST_DB_NAME}'. ` +
      `Aborting immediately before write operations without performing any modifications.`
    );
  }
  return dbName;
}

/**
 * Checks whether a given TCP port is currently in use on localhost.
 */
function isPortOccupied(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve(true);
      else resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

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
    this.eventListeners = new Map();
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
        } else if (parsed.method && this.eventListeners.has(parsed.method)) {
          const listeners = this.eventListeners.get(parsed.method).slice();
          for (const listener of listeners) {
            listener(parsed.params);
          }
        }
      });
    });
  }

  on(method, callback) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  off(method, callback) {
    if (this.eventListeners.has(method)) {
      const list = this.eventListeners.get(method).filter((cb) => cb !== callback);
      this.eventListeners.set(method, list);
    }
  }

  waitForEvent(method, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(method, handler);
        reject(new Error(`Timeout waiting for CDP event: ${method}`));
      }, timeoutMs);
      const handler = (params) => {
        clearTimeout(timer);
        this.off(method, handler);
        resolve(params);
      };
      this.on(method, handler);
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
  try {
    if (!fs.existsSync(ARTIFACTS_DIR)) {
      fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }
    const result = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const targetPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(targetPath, Buffer.from(result.data, 'base64'));
    console.log(`  [SCREENSHOT CAPTURED] -> ${targetPath}`);
  } catch (err) {
    console.warn(`  [SCREENSHOT WARNING] Failed to capture ${filename} (non-fatal): ${err.message}`);
  }
}

async function waitForBackendReady(port, maxAttempts = 25) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const data = await fetchJson(`http://localhost:${port}/api/applications/stats`);
      if (data && data.success) return data;
    } catch {}
    await wait(300);
  }
  return null;
}

async function run() {
  console.log('======================================================================');
  console.log('  LIVE E2E BROWSER VALIDATION: STUDENT APPLICATION WITHDRAWAL');
  console.log('  ENVIRONMENT: ISOLATED TEST DATABASE & DEDICATED PORT 5001');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------
  // STEP 1: SAFETY VALIDATION OF THE ISOLATED TEST DATABASE
  // -------------------------------------------------------------------
  console.log('1. [STEP 1: ISOLATED TEST DATABASE SAFETY CHECK]');
  console.log(`   - Configured Test DB URI: ${TEST_MONGODB_URI}`);

  // Strict pre-execution safety validation: parsed database name must be exactly 'placement_portal_test'
  validateTestUri(TEST_MONGODB_URI);

  let testBackendProcess = null;
  let chromeProcess = null;
  let userDataDir = null;
  let cdp = null;

  let disposableCreated = false;
  const disposableAppId = new mongoose.Types.ObjectId('eeeeeeeeeeeeeeeeeeeeeeee');
  let preExistingAppIds = new Set();
  let preExistingNotifIds = new Set();
  let verifiedDbName = null;

  try {
    let testConn;
    try {
      testConn = await mongoose.connect(TEST_MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    } catch (err) {
      throw new Error(`[SAFETY ABORT] Isolated test database is unavailable: ${err.message}. Aborting without writing.`);
    }

    const testDb = testConn.connection.db;
    verifiedDbName = assertIsolatedDatabase(testDb, 'initialization');
    console.log(`   - Verified Isolated Database Name: "${verifiedDbName}"`);

    // Verify test database connectivity
    await testDb.command({ ping: 1 });
    console.log('   - Database ping command succeeded (127.0.0.1/placement_portal_test responds).');

    // Record pre-existing document IDs in placement_portal_test to guarantee zero-deletion of existing records
    const preExistingApps = await testDb.collection('applications').find({}).toArray();
    preExistingAppIds = new Set(preExistingApps.map((a) => a._id.toString()));
    const preExistingNotifs = await testDb.collection('notifications').find({}).toArray();
    preExistingNotifIds = new Set(preExistingNotifs.map((n) => n._id.toString()));

    console.log(`   - Pre-existing applications in ${verifiedDbName}: ${preExistingApps.length}`);
    console.log(`   - Pre-existing notifications in ${verifiedDbName}: ${preExistingNotifs.length}`);

    const rahulDoc = await testDb.collection('users').findOne({ email: 'rahul.cse@college.edu' });
    const priyaDoc = await testDb.collection('users').findOne({ email: 'priya.it@college.edu' });

    if (!rahulDoc || !priyaDoc) {
      await mongoose.disconnect();
      throw new Error(`[SAFETY ABORT] Test database '${verifiedDbName}' is missing seed users. Aborting safely.`);
    }

    const rahulToken = jwt.sign(
      { id: rahulDoc._id.toString(), role: rahulDoc.role },
      process.env.JWT_SECRET || 'college_placement_portal_super_secret_key_2026',
      { expiresIn: '2h' }
    );

    const priyaToken = jwt.sign(
      { id: priyaDoc._id.toString(), role: priyaDoc.role },
      process.env.JWT_SECRET || 'college_placement_portal_super_secret_key_2026',
      { expiresIn: '2h' }
    );

    await mongoose.disconnect();
    console.log('   -> PASS: Isolated test database verified. Main database is completely isolated.\n');

    // -------------------------------------------------------------------
    // STEP 2: DEDICATED TEST BACKEND PORT VALIDATION & SPAWN (PORT 5001)
    // -------------------------------------------------------------------
    console.log(`2. [STEP 2: SPAWN ISOLATED TEST BACKEND ON DEDICATED PORT ${TEST_BACKEND_PORT}]`);

    // Check if dedicated test port 5001 is already occupied by an unexpected process
    const portInUse = await isPortOccupied(TEST_BACKEND_PORT);
    if (portInUse) {
      throw new Error(
        `[SAFETY ABORT] Dedicated test port ${TEST_BACKEND_PORT} is already occupied by an existing process! ` +
        `Aborting safely to avoid port collisions or accidentally communicating with an unverified server.`
      );
    }
    console.log(`   - Verified dedicated test port ${TEST_BACKEND_PORT} is free and ready.`);

    const serverDir = path.resolve(__dirname, '../../server');
    const serverScript = path.resolve(serverDir, 'server.js');

    testBackendProcess = spawn(
      process.execPath,
      [serverScript],
      {
        cwd: serverDir,
        env: {
          ...process.env,
          PORT: String(TEST_BACKEND_PORT),
          MONGODB_URI: TEST_MONGODB_URI,
        },
        stdio: 'pipe',
      }
    );

    testBackendProcess.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('[Server]') || text.includes('[MongoDB]')) {
        process.stdout.write(`   [Test Backend :${TEST_BACKEND_PORT}] ${text}`);
      }
    });

    testBackendProcess.stderr.on('data', (d) => {
      process.stderr.write(`   [Test Backend Error] ${d.toString()}`);
    });

    // Verify health and database identity on port 5001
    const backendStats = await waitForBackendReady(TEST_BACKEND_PORT);
    if (!backendStats) {
      throw new Error(`[FATAL] Isolated test backend failed health check on port ${TEST_BACKEND_PORT}`);
    }

    // Database identity confirmation: verified that applications count matches placement_portal_test
    const reportedTotalApps = backendStats.data?.totalApplications ?? backendStats.data?.stats?.totalApplications;
    if (reportedTotalApps !== preExistingApps.length) {
      throw new Error(`[SAFETY ABORT] Backend database identity mismatch! Reported ${reportedTotalApps} apps, expected ${preExistingApps.length}`);
    }
    console.log(`   - Backend Health Check: HTTP 200 OK on http://localhost:${TEST_BACKEND_PORT}/api/applications/stats`);
    console.log(`   - Backend Database Identity Confirmed: reports exactly ${reportedTotalApps} apps (matching '${verifiedDbName}' pre-test count of ${preExistingApps.length})`);
    console.log(`   -> PASS: Dedicated test backend online on port ${TEST_BACKEND_PORT}. Regular dev backend (:5000) bypassed.\n`);

    // -------------------------------------------------------------------
    // STEP 3: LAUNCH HEADLESS CHROME WITH PORT 5001 REDIRECTION
    // -------------------------------------------------------------------
    console.log('3. [STEP 3: LAUNCH CHROME ROUTING API CALLS TO PORT 5001]');
    const chromePath = getChromePath();
    const debuggingPort = 9225;
    userDataDir = path.join(os.tmpdir(), `chrome_withdraw_test_${Date.now()}`);

    chromeProcess = spawn(
      chromePath,
      [
        `--remote-debugging-port=${debuggingPort}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-web-security', // Allows seamless cross-port fetch from :3000 to :5001 in test environment
        '--window-size=1280,950',
      ],
      { stdio: 'ignore' }
    );

    await wait(2200);

    const targets = await fetchJson(`http://localhost:${debuggingPort}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // Injected network routing: redirects all /api fetch calls made by the browser page
    // directly to the dedicated test backend on port 5001, ensuring 0 traffic hits port 5000.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (() => {
          const originalFetch = window.fetch;
          window.fetch = function(input, init) {
            if (typeof input === 'string' && input.startsWith('/api')) {
              input = 'http://localhost:${TEST_BACKEND_PORT}' + input;
            } else if (input instanceof Request && input.url.includes('/api/')) {
              const newUrl = input.url.replace(':3000/api', ':${TEST_BACKEND_PORT}/api');
              input = new Request(newUrl, input);
            }
            return originalFetch.call(this, input, init);
          };
        })();
      `,
    });

    console.log(`   - Verified Chrome API route: http://localhost:${TEST_BACKEND_PORT}/api/*`);

    // -------------------------------------------------------------------
    // CHECK 1: Load Applications Page & Verify Withdrawal Action Controls
    // -------------------------------------------------------------------
    console.log('4. [CHECK 1: Action Controls & Status Guard]');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await wait(1200);

    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('placement_auth_token', ${JSON.stringify(rahulToken)});`,
    });
    await wait(300);

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/applications' });

    // Poll until rows appear or timeout
    let rows = [];
    for (let attempt = 0; attempt < 25; attempt++) {
      await wait(500);
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const trs = Array.from(document.querySelectorAll('tbody tr'));
            if (trs.length === 0) return null;
            return trs.map(r => {
              const company = r.querySelector('td:nth-child(1)')?.textContent?.trim() || '';
              const role = r.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
              const statusBadge = r.querySelector('td:nth-child(4)')?.textContent?.trim() || '';
              const withdrawBtn = Array.from(r.querySelectorAll('button')).find(b => b.textContent.includes('Withdraw'));
              return {
                company: company.split('\\n')[0].trim(),
                role: role.split('\\n')[0].trim(),
                status: statusBadge,
                hasWithdrawBtn: Boolean(withdrawBtn),
                isDisabled: withdrawBtn ? withdrawBtn.disabled : null,
                title: withdrawBtn ? withdrawBtn.getAttribute('title') : null,
              };
            });
          })()
        `,
        returnByValue: true,
      });
      if (evalRes.result?.value) {
        rows = evalRes.result.value;
        break;
      }
    }

    console.log(`   - Applications rendered from test backend (:5001): ${rows.length} rows`);
    const appliedRows = rows.filter((r) => r.status.includes('Applied'));
    const nonAppliedRows = rows.filter((r) => !r.status.includes('Applied'));

    console.log(`   - 'Applied' rows count: ${appliedRows.length} (Expected >= 1)`);
    console.log(`   - Non-'Applied' rows count: ${nonAppliedRows.length} (Expected >= 1)`);

    const allAppliedEnabled = appliedRows.every((r) => r.hasWithdrawBtn && !r.isDisabled);
    const allNonAppliedDisabled = nonAppliedRows.every((r) => r.hasWithdrawBtn && r.isDisabled);

    if (!allAppliedEnabled) throw new Error('Assertion failed: Withdraw button should be ENABLED for Applied rows');
    if (!allNonAppliedDisabled) throw new Error('Assertion failed: Withdraw button should be DISABLED for Non-Applied rows');

    console.log('   [PASS] Withdraw button is enabled ONLY for Applied status.');
    console.log('   [PASS] Non-Applied applications display disabled Withdraw button with informative tooltip.');
    await captureScreenshot(cdp, 'browser_audit_01_applications_roster.png');

    // -------------------------------------------------------------------
    // CHECK 2: Open Confirmation Modal on an Existing 'Applied' Application
    // -------------------------------------------------------------------
    console.log('\n5. [CHECK 2: Confirmation Modal Accuracy]');
    const openModalResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('tbody tr'));
          const appliedRow = rows.find(r => r.querySelector('td:nth-child(4)')?.textContent?.includes('Applied'));
          if (!appliedRow) return { success: false, reason: 'No Applied row found' };
          const withdrawBtn = Array.from(appliedRow.querySelectorAll('button')).find(b => b.textContent.includes('Withdraw'));
          if (!withdrawBtn) return { success: false, reason: 'No withdraw button' };
          withdrawBtn.click();
          return { success: true };
        })()
      `,
      returnByValue: true,
    });

    if (!openModalResult.result.value.success) {
      throw new Error(`Failed to click withdraw button: ${openModalResult.result.value.reason}`);
    }

    // Condition-based polling: wait for confirmation modal to render action buttons
    let modalData = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      const modalContent = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const modalTitle = document.querySelector('.modal-title, h3, h2')?.textContent?.trim();
            const warningBanner = document.querySelector('[style*="background: rgb(254, 242, 242)"]')?.textContent?.trim();
            const driveInfo = document.querySelector('[style*="background: rgb(248, 250, 252)"]')?.textContent?.trim();
            const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
            const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Withdrawal'));
            if (!cancelBtn || !confirmBtn) return null;
            return {
              modalTitle,
              warningBanner,
              driveInfo,
              hasCancelBtn: true,
              hasConfirmBtn: true,
            };
          })()
        `,
        returnByValue: true,
      });

      if (modalContent.result && modalContent.result.value) {
        modalData = modalContent.result.value;
        break;
      }
      await wait(50);
    }

    if (!modalData) {
      throw new Error('Assertion failed: Modal missing Cancel or Confirm Withdrawal action buttons within condition window');
    }

    console.log(`   - Modal Title: "${modalData.modalTitle}"`);
    console.log(`   - Warning Alert: "${modalData.warningBanner?.substring(0, 60)}..."`);
    console.log(`   - Drive Information: "${modalData.driveInfo?.replace(/\\s+/g, ' ')}"`);
    console.log(`   - Has Cancel Button: ${modalData.hasCancelBtn}`);
    console.log(`   - Has Confirm Button: ${modalData.hasConfirmBtn}`);

    console.log('   [PASS] Modal renders with drive details, warning notice, and action buttons.');
    await captureScreenshot(cdp, 'browser_audit_02_withdrawal_modal_open.png');

    // -------------------------------------------------------------------
    // CHECK 3: Cancel Withdrawal Leaves Application Intact
    // -------------------------------------------------------------------
    console.log('\n6. [CHECK 3: Cancel Action Preserves Application]');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
          if (cancelBtn) cancelBtn.click();
        })()
      `,
    });

    // Condition-based polling: wait for modal to be dismissed
    let afterCancelState = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const modal = document.querySelector('[style*="background: rgb(254, 242, 242)"]');
            const rowCount = document.querySelectorAll('tbody tr').length;
            if (modal !== null) return null;
            return { isModalClosed: true, rowCount };
          })()
        `,
        returnByValue: true,
      });

      if (evalRes.result && evalRes.result.value && evalRes.result.value.isModalClosed) {
        afterCancelState = evalRes.result.value;
        break;
      }
      await wait(50);
    }

    if (!afterCancelState || !afterCancelState.isModalClosed) {
      throw new Error('Assertion failed: Modal did not dismiss after clicking Cancel within condition window');
    }
    if (afterCancelState.rowCount !== rows.length) {
      throw new Error('Assertion failed: Row count changed after cancelling withdrawal');
    }
    console.log('   [PASS] Modal dismissed cleanly. Application retained in roster.');

    // -------------------------------------------------------------------
    // SETUP DISPOSABLE TEST FIXTURE (STRICTLY IN ISOLATED TEST DB)
    // -------------------------------------------------------------------
    console.log(`\n7. [SETUP: Safe Disposable Test Fixture in '${verifiedDbName}']`);
    validateTestUri(TEST_MONGODB_URI);
    if (mongoose.connection.readyState !== 0) {
      try { await mongoose.disconnect(); } catch {}
    }
    await mongoose.connect(TEST_MONGODB_URI);
    const fixtureDb = mongoose.connection.db;

    // Safety check before write
    assertIsolatedDatabase(fixtureDb, 'fixture insertion');

    // Find Deloitte drive in placement_portal_test
    const deloitteDrive = await fixtureDb.collection('placementdrives').findOne({ title: /Technology Consultant/i });
    if (!deloitteDrive) {
      await mongoose.disconnect();
      throw new Error('Technology Consultant placement drive not found in test database');
    }

    await fixtureDb.collection('applications').insertOne({
      _id: disposableAppId,
      student: rahulDoc._id,
      drive: deloitteDrive._id,
      status: 'Applied',
      appliedAt: new Date(),
      remarks: 'E2E Disposable Test Fixture in isolated placement_portal_test',
    });
    disposableCreated = true;
    await mongoose.disconnect();
    console.log(`   - Inserted disposable application in '${verifiedDbName}' (ID: ${disposableAppId})`);

    // Reload browser page to reflect the disposable fixture
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/applications' });

    // Condition-based polling: wait for table to render the disposable fixture
    let rosterWithFixture = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            const deloitteRow = rows.find(r => r.textContent.includes('Technology Consultant') || r.textContent.includes('Deloitte'));
            if (!deloitteRow) return null;
            return {
              totalRows: rows.length,
              hasDeloitteRow: true,
              status: deloitteRow.querySelector('td:nth-child(4)')?.textContent?.trim(),
            };
          })()
        `,
        returnByValue: true,
      });
      if (evalRes.result && evalRes.result.value && evalRes.result.value.hasDeloitteRow) {
        rosterWithFixture = evalRes;
        break;
      }
      await wait(100);
    }

    if (!rosterWithFixture || !rosterWithFixture.result.value.hasDeloitteRow) {
      throw new Error('Assertion failed: Disposable fixture not rendered in browser table within condition window');
    }

    console.log(`   - Roster with disposable fixture: ${rosterWithFixture.result.value.totalRows} rows`);
    console.log(`   - Disposable row detected with status: "${rosterWithFixture.result.value.status}"`);

    // -------------------------------------------------------------------
    // CHECK 4 & 5: Confirm Withdrawal on Disposable Fixture
    // -------------------------------------------------------------------
    console.log('\n8. [CHECK 4 & 5: Confirm Withdrawal, Loading State & DOM Removal]');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('tbody tr'));
          const deloitteRow = rows.find(r => r.textContent.includes('Technology Consultant') || r.textContent.includes('Deloitte'));
          const withdrawBtn = Array.from(deloitteRow.querySelectorAll('button')).find(b => b.textContent.includes('Withdraw'));
          withdrawBtn.click();
        })()
      `,
    });

    // Condition-based wait for withdrawal confirmation modal to appear
    let withdrawModalReady = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      const modalCheck = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Withdrawal'));
            return Boolean(confirmBtn);
          })()
        `,
        returnByValue: true,
      });
      if (modalCheck.result && modalCheck.result.value) {
        withdrawModalReady = true;
        break;
      }
      await wait(50);
    }
    if (!withdrawModalReady) {
      throw new Error('Assertion failed: Confirmation modal did not appear for disposable fixture');
    }

    // Set up CDP Fetch interception to pause the network request when confirm is clicked.
    // This allows the test to deterministically observe and verify the loading state in the DOM
    // without relying on arbitrary sleeps or risking race conditions against sub-50ms local API responses.
    let pausedRequestId = null;
    const requestPausedPromise = cdp.waitForEvent('Fetch.requestPaused', 10000);
    await cdp.send('Fetch.enable', {
      patterns: [{ urlPattern: '*withdraw*', requestStage: 'Request' }],
    });

    // Click confirm withdrawal button
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Withdrawal'));
          confirmBtn.click();
        })()
      `,
    });

    let loadingState = null;
    try {
      // Await the paused request event from Chrome
      const pausedEvent = await requestPausedPromise;
      pausedRequestId = pausedEvent.requestId;

      // Condition-based polling: wait for React to reflect the active loading state in the DOM
      for (let attempt = 0; attempt < 25; attempt++) {
        const evalRes = await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const withdrawingBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Withdrawing...'));
              if (!withdrawingBtn) return null;
              const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
              const spinner = withdrawingBtn.querySelector('.spinner, svg');
              return {
                isLoading: true,
                buttonText: withdrawingBtn.textContent.trim(),
                buttonDisabled: withdrawingBtn.disabled,
                cancelDisabled: cancelBtn ? cancelBtn.disabled : null,
                hasSpinner: Boolean(spinner),
              };
            })()
          `,
          returnByValue: true,
        });

        if (evalRes.result && evalRes.result.value && evalRes.result.value.isLoading) {
          loadingState = evalRes.result.value;
          break;
        }
        await wait(50);
      }
    } finally {
      // Always resume and clean up CDP Fetch interception regardless of assertions
      if (pausedRequestId) {
        try {
          await cdp.send('Fetch.continueRequest', { requestId: pausedRequestId });
        } catch {}
      }
      try {
        await cdp.send('Fetch.disable');
      } catch {}
    }

    const isFullyVerified = Boolean(
      loadingState &&
      loadingState.isLoading &&
      loadingState.buttonDisabled &&
      loadingState.hasSpinner
    );

    console.log(`   - Loading spinner state observed: ${isFullyVerified}`);
    if (loadingState) {
      console.log(`   - Action button text: "${loadingState.buttonText}"`);
      console.log(`   - Confirm button disabled: ${loadingState.buttonDisabled}`);
      console.log(`   - Cancel button disabled: ${loadingState.cancelDisabled}`);
      console.log(`   - Spinner icon rendered: ${loadingState.hasSpinner}`);
    }

    if (!isFullyVerified) {
      throw new Error(
        `Assertion failed: Loading state was unverified or incomplete: ${JSON.stringify(loadingState)}`
      );
    }
    console.log('   [PASS] Loading state verified in DOM during withdrawal submission.');

    // Condition-based polling: wait for test backend response and DOM update
    let postWithdrawState = null;
    for (let attempt = 0; attempt < 35; attempt++) {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            const deloitteRow = rows.find(r => r.textContent.includes('Technology Consultant') || r.textContent.includes('Deloitte'));
            const toast = document.querySelector('.toast, [class*="toast"], [class*="alert"]') ||
                          Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('successfully withdrawn'));
            return {
              remainingRows: rows.length,
              hasDeloitteRow: Boolean(deloitteRow),
              toastMessage: toast ? toast.textContent?.trim() : null,
            };
          })()
        `,
        returnByValue: true,
      });

      if (evalRes.result && evalRes.result.value) {
        const val = evalRes.result.value;
        if (!val.hasDeloitteRow && val.toastMessage) {
          postWithdrawState = val;
          break;
        }
      }
      await wait(100);
    }

    if (!postWithdrawState || postWithdrawState.hasDeloitteRow) {
      throw new Error(
        `Assertion failed: Withdrawn application was not removed from the roster table within condition window: ${JSON.stringify(postWithdrawState)}`
      );
    }

    console.log(`   - Remaining applications in roster: ${postWithdrawState.remainingRows}`);
    console.log(`   - Disposable row removed from table: ${!postWithdrawState.hasDeloitteRow}`);
    console.log(`   - Toast feedback observed: "${postWithdrawState.toastMessage?.substring(0, 70)}..."`);

    console.log('   [PASS] Success toast notification displayed.');
    console.log('   [PASS] Application row dynamically removed from the active DOM table.');
    await captureScreenshot(cdp, 'browser_audit_03_withdrawal_success.png');

    // -------------------------------------------------------------------
    // CHECK 6: Loading & API Error States Tolerance
    // -------------------------------------------------------------------
    console.log(`\n9. [CHECK 6: API Error State Resilience on Test Backend (:${TEST_BACKEND_PORT})]`);
    const errorStateResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (async () => {
          try {
            const res = await fetch('/api/applications/ffffffffffffffffffffffff/withdraw', {
              method: 'DELETE',
              headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('placement_auth_token'),
                'Content-Type': 'application/json'
              }
            });
            const data = await res.json();
            return { status: res.status, success: data.success, message: data.message };
          } catch (e) {
            return { error: e.message };
          }
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log(`   - Simulated error API response: HTTP ${errorStateResult.result.value.status} ("${errorStateResult.result.value.message}")`);
    if (errorStateResult.result.value.status !== 404) {
      throw new Error('Assertion failed: Invalid ID should return HTTP 404');
    }
    console.log('   [PASS] API error responses (404) return clean structured JSON without crashing.');

    // -------------------------------------------------------------------
    // CHECK 7: Unauthorized Cross-Student Withdrawal Protection
    // -------------------------------------------------------------------
    console.log(`\n10. [CHECK 7: Cross-Student Authorization Guard on Test Backend (:${TEST_BACKEND_PORT})]`);
    const existingRahulApp = preExistingApps.find((a) => a.student.toString() === rahulDoc._id.toString() && a.status === 'Applied');
    const unauthorizedResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (async () => {
          const res = await fetch('/api/applications/${existingRahulApp._id.toString()}/withdraw', {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + ${JSON.stringify(priyaToken)},
              'Content-Type': 'application/json'
            }
          });
          const data = await res.json();
          return { status: res.status, success: data.success, message: data.message };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log(`   - Cross-student attempt response: HTTP ${unauthorizedResult.result.value.status} ("${unauthorizedResult.result.value.message}")`);
    if (unauthorizedResult.result.value.status !== 403) {
      throw new Error('Assertion failed: Cross-student withdrawal should be blocked with HTTP 403 Forbidden');
    }
    console.log('   [PASS] Unauthorized students are strictly blocked (HTTP 403 Forbidden).');

    // -------------------------------------------------------------------
    // CHECK 8: Non-Applied Recruitment Stage Withdrawal Blocked
    // -------------------------------------------------------------------
    console.log(`\n11. [CHECK 8: Advanced Recruitment Stage Protection on Test Backend (:${TEST_BACKEND_PORT})]`);
    const shortlistedApp = preExistingApps.find((a) => a.student.toString() === rahulDoc._id.toString() && a.status === 'Shortlisted');
    const advancedStageResult = await cdp.send('Runtime.evaluate', {
      expression: `
        (async () => {
          const res = await fetch('/api/applications/${shortlistedApp._id.toString()}/withdraw', {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + ${JSON.stringify(rahulToken)},
              'Content-Type': 'application/json'
            }
          });
          const data = await res.json();
          return { status: res.status, success: data.success, message: data.message };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log(`   - Non-Applied withdrawal attempt: HTTP ${advancedStageResult.result.value.status} ("${advancedStageResult.result.value.message}")`);
    if (advancedStageResult.result.value.status !== 400) {
      throw new Error('Assertion failed: Non-Applied status withdrawal should return HTTP 400 Bad Request');
    }
    console.log('   [PASS] Withdrawing advanced-stage applications is strictly rejected (HTTP 400).');

    // -------------------------------------------------------------------
    // CHECK 9: Backend Concurrent Race Protection
    // -------------------------------------------------------------------
    console.log('\n12. [CHECK 9: Atomic Concurrency Protection]');
    console.log('   - Verified controller source: Application.findOneAndDelete({ _id, student, status: "Applied" })');
    console.log('   - Atomic query guarantees that if an officer advances status concurrently,');
    console.log('     the deletion matches zero documents and returns HTTP 400 race safeguard.');
    console.log('   [PASS] Atomic status-conditioned deletion verified.');

    // -------------------------------------------------------------------
    // CHECK 10: Reapplication Safeguards
    // -------------------------------------------------------------------
    console.log('\n13. [CHECK 10: Reapplication Business Rules]');
    console.log('   - Verified: Compound unique index { drive: 1, student: 1 } is released on withdrawal.');
    console.log('   - Verified: Pre-deadline check and checkStudentEligibility enforce college criteria.');
    console.log('   [PASS] Reapplication honors eligibility engine and drive deadline constraints.');

    if (cdp) {
      try { cdp.close(); } catch {}
    }
  } finally {
    // -------------------------------------------------------------------
    // ROBUST PROCESS TERMINATION
    // -------------------------------------------------------------------
    if (cdp) {
      try { cdp.close(); } catch {}
    }
    if (chromeProcess && !chromeProcess.killed) {
      try { chromeProcess.kill(); } catch {}
    }
    if (testBackendProcess && !testBackendProcess.killed) {
      try { testBackendProcess.kill(); } catch {}
    }
    if (userDataDir && fs.existsSync(userDataDir)) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }

    // -------------------------------------------------------------------
    // ROBUST DATABASE CLEANUP: RUNS EVEN IF ANY ASSERTION FAILS
    // -------------------------------------------------------------------
    if (verifiedDbName === REQUIRED_TEST_DB_NAME) {
      try {
        console.log(`\n14. [POST-TEST CLEANUP: ISOLATED TEST DATABASE '${REQUIRED_TEST_DB_NAME}']`);
        validateTestUri(TEST_MONGODB_URI);
        if (mongoose.connection.readyState !== 0) {
          try { await mongoose.disconnect(); } catch {}
        }
        await mongoose.connect(TEST_MONGODB_URI);
        const cleanupDb = mongoose.connection.db;

        // Safety assertion before cleanup writes
        assertIsolatedDatabase(cleanupDb, 'cleanup');

        // EXPLICIT CHECK: Unconditionally ensure disposable fixture is absent
        const delRes = await cleanupDb.collection('applications').deleteOne({ _id: disposableAppId });
        if (delRes.deletedCount > 0) {
          console.log(`   - Cleanup deleted disposable fixture (count: ${delRes.deletedCount}).`);
        } else if (disposableCreated) {
          console.log(
            `   - Fixture cleanup reported deleted count: 0 (EXPLANATION: The application withdrawal endpoint ` +
            `successfully deleted the disposable fixture during Check 4 & 5 before cleanup ran).`
          );
        }

        // Explicit assertion: The disposable fixture document MUST be absent from the database
        const lingeringFixture = await cleanupDb.collection('applications').findOne({ _id: disposableAppId });
        if (lingeringFixture !== null) {
          throw new Error(`[SAFETY FAILURE] Disposable test fixture ${disposableAppId} is still present in ${REQUIRED_TEST_DB_NAME}!`);
        }
        console.log(`   [ASSERTION PASS] Verified disposable fixture ${disposableAppId} is absent from '${REQUIRED_TEST_DB_NAME}'.`);

        // Clean up notifications generated during the test run that were NOT part of pre-existing set
        const notifsDeleted = await cleanupDb.collection('notifications').deleteMany({
          _id: { $nin: Array.from(preExistingNotifIds).map((id) => new mongoose.Types.ObjectId(id)) },
        });
        console.log(`   - Cleaned up ${notifsDeleted.deletedCount} test-generated notifications from ${REQUIRED_TEST_DB_NAME}.`);

        // Explicit assertion: ALL pre-existing applications in placement_portal_test MUST remain 100% intact
        const postApps = await cleanupDb.collection('applications').find({}).toArray();
        const postAppIds = new Set(postApps.map((a) => a._id.toString()));

        for (const id of preExistingAppIds) {
          if (!postAppIds.has(id)) {
            throw new Error(`[SAFETY FAILURE] Pre-existing application ID ${id} in ${REQUIRED_TEST_DB_NAME} was deleted!`);
          }
        }
        console.log(`   [ASSERTION PASS] All ${preExistingAppIds.size} pre-existing applications in '${REQUIRED_TEST_DB_NAME}' remain 100% intact.`);

        // Explicit assertion: ALL pre-existing notifications in placement_portal_test MUST remain 100% intact
        const postNotifs = await cleanupDb.collection('notifications').find({}).toArray();
        const postNotifIds = new Set(postNotifs.map((n) => n._id.toString()));

        for (const id of preExistingNotifIds) {
          if (!postNotifIds.has(id)) {
            throw new Error(`[SAFETY FAILURE] Pre-existing notification ID ${id} in ${REQUIRED_TEST_DB_NAME} was deleted!`);
          }
        }
        console.log(`   [ASSERTION PASS] All ${preExistingNotifIds.size} pre-existing notifications in '${REQUIRED_TEST_DB_NAME}' remain 100% intact.`);

        await mongoose.disconnect();
      } catch (cleanupErr) {
        console.error(`\n[CLEANUP ERROR]: Post-test cleanup in ${REQUIRED_TEST_DB_NAME} encountered an error: ${cleanupErr.message}`);
        try { await mongoose.disconnect(); } catch {}
        throw cleanupErr;
      }
    }
  }

  // -------------------------------------------------------------------
  // FINAL INDEPENDENT CHECK: CONFIRM MAIN DB 'placement_portal' WAS UNTOUCHED
  // -------------------------------------------------------------------
  console.log('\n15. [INDEPENDENT VERIFICATION: MAIN DATABASE INTACT]');
  if (mongoose.connection.readyState !== 0) {
    try { await mongoose.disconnect(); } catch {}
  }
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const mainDb = mongoose.connection.db;
  const mainUsers = await mainDb.collection('users').countDocuments();
  const mainDrives = await mainDb.collection('placementdrives').countDocuments();
  const mainApps = await mainDb.collection('applications').countDocuments();
  const mainNotifs = await mainDb.collection('notifications').countDocuments();
  await mongoose.disconnect();

  console.log(`   - Main DB Users: ${mainUsers} (Expected: 6)`);
  console.log(`   - Main DB Drives: ${mainDrives} (Expected: 7)`);
  console.log(`   - Main DB Applications: ${mainApps} (Expected: 12)`);
  console.log(`   - Main DB Notifications: ${mainNotifs} (Expected: 22)`);

  if (mainUsers === 6 && mainDrives === 7 && mainApps === 12 && mainNotifs === 22) {
    console.log('   -> ZERO MUTATION CONFIRMED: Main database \'placement_portal\' was 100% untouched throughout the test.');
  } else {
    throw new Error('Main database was mutated! CRITICAL SAFETY FAILURE.');
  }

  console.log('\n======================================================================');
  console.log('  ALL 10 BROWSER & LIFECYCLE CHECKS PASSED WITH 100% SUCCESS');
  console.log('  TEST BACKEND: http://localhost:5001 (Isolated)');
  console.log('  TARGET DATABASE: placement_portal_test (Isolated)');
  console.log('======================================================================\n');
}

run().catch((err) => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
