/**
 * resume_endpoints.test.js
 * Integration test for the resume-analysis endpoint:
 * 1. Backend direct: POST http://localhost:5000/api/ai/parse-resume
 * 2. Vite dev proxy: POST http://localhost:3000/api/ai/parse-resume
 *
 * NOTE: Credentials, passwords, and JWT tokens are NEVER printed or exposed.
 */

const http = require('http');
const path = require('path');
const mongoose = require(path.join(__dirname, '../../../server/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../../../server/node_modules/jsonwebtoken'));

// Load env for JWT_SECRET
require(path.join(__dirname, '../../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../../server/.env'),
});

async function postRequest(url, headers = {}, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return {
    statusCode: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: json,
  };
}

async function run() {
  console.log('Testing Resume Analysis Endpoints...\n');

  // 1. Connect to Mongo in read-only mode to find Rahul Verma's user ID
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ role: 'student', email: 'rahul.cse@college.edu' }, { projection: { _id: 1, name: 1, role: 1, skills: 1 } });

  if (!user) {
    console.error('Student user not found.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Generate an authenticated session token for the student (do NOT log or expose it)
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  await mongoose.disconnect();

  const authHeader = { Authorization: `Bearer ${token}` };

  // Validate suggestion schema helper
  const validateSuggestions = (suggestions) => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return false;
    return suggestions.every(
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
  };

  // Test 1: Direct backend on port 5000
  console.log('1. Testing Direct Backend: POST http://localhost:5000/api/ai/parse-resume');
  try {
    const resBackend = await postRequest('http://localhost:5000/api/ai/parse-resume', authHeader);
    console.log(`   Status: ${resBackend.statusCode}`);
    console.log(`   Success: ${resBackend.body?.success}`);
    console.log(`   Extracted Skills Count: ${resBackend.body?.data?.extractedSkills?.length}`);
    console.log(`   New Skills Count: ${resBackend.body?.data?.newSkillsFound?.length}`);
    console.log(`   Current Profile Skills Count: ${resBackend.body?.data?.currentProfileSkills?.length}`);
    console.log(`   Word Count: ${resBackend.body?.data?.wordCount}`);
    console.log(`   Suggestions Count: ${resBackend.body?.data?.suggestions?.length}`);

    if (resBackend.statusCode !== 200 || !resBackend.body?.success) {
      console.error('   FAILED: Expected 200 OK from backend.');
      process.exit(1);
    }

    if (!validateSuggestions(resBackend.body?.data?.suggestions)) {
      console.error('   FAILED: suggestions array missing or invalid schema on backend.');
      process.exit(1);
    }
  } catch (err) {
    console.error('   Error contacting backend:', err.message);
    process.exit(1);
  }

  // Test 2: Vite dev proxy on port 3000
  console.log('\n2. Testing Vite Dev Proxy: POST http://localhost:3000/api/ai/parse-resume');
  try {
    const resProxy = await postRequest('http://localhost:3000/api/ai/parse-resume', authHeader);
    console.log(`   Status: ${resProxy.statusCode}`);
    console.log(`   Success: ${resProxy.body?.success}`);
    console.log(`   Extracted Skills Count: ${resProxy.body?.data?.extractedSkills?.length}`);
    console.log(`   New Skills Count: ${resProxy.body?.data?.newSkillsFound?.length}`);
    console.log(`   Current Profile Skills Count: ${resProxy.body?.data?.currentProfileSkills?.length}`);
    console.log(`   Word Count: ${resProxy.body?.data?.wordCount}`);
    console.log(`   Suggestions Count: ${resProxy.body?.data?.suggestions?.length}`);

    if (resProxy.statusCode !== 200 || !resProxy.body?.success) {
      console.error('   FAILED: Expected 200 OK from Vite proxy.');
      process.exit(1);
    }

    if (!validateSuggestions(resProxy.body?.data?.suggestions)) {
      console.error('   FAILED: suggestions array missing or invalid schema on Vite proxy.');
      process.exit(1);
    }
  } catch (err) {
    console.error('   Error contacting Vite proxy:', err.message);
    process.exit(1);
  }

  // Verify student profile skills in Mongo remain completely unmodified
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const userAfter = await mongoose.connection.db
    .collection('users')
    .findOne({ _id: user._id });
  await mongoose.disconnect();

  if (JSON.stringify(userAfter.skills) !== JSON.stringify(user.skills)) {
    console.error('   FAILED: Student profile skills were unexpectedly modified in MongoDB.');
    process.exit(1);
  }
  console.log('\n   Zero-Mutation Verified: Student profile skills in MongoDB remain identical before & after.');

  console.log('\nAll endpoint tests succeeded cleanly with status 200 OK.');
}

run();
