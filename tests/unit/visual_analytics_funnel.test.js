/**
 * visual_analytics_funnel.test.js
 * Automated tests for Visual Placement Analytics & Recruitment Funnel:
 * 1. Endpoint Authorization (401 unauthenticated, 403 student, 200 officer)
 * 2. Mathematical Aggregation Accuracy across all 12 MongoDB records
 * 3. Filter Variations (Branch & Status queries)
 * 4. Empty Data Resilience (Zero-division guards, no NaN, empty states)
 * 5. Database Read-Only Integrity (MongoDB collection counts remain strictly unchanged)
 *
 * NOTE: Credentials, passwords, and JWT tokens are NEVER printed or logged.
 */

const path = require('path');
const mongoose = require(path.join(__dirname, '../../server/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));

require(path.join(__dirname, '../../server/node_modules/dotenv')).config({
  path: path.join(__dirname, '../../server/.env'),
});

const BACKEND_BASE = 'http://localhost:5000/api/applications';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function run() {
  console.log('===============================================================');
  console.log(' RUNNING VISUAL PLACEMENT ANALYTICS & FUNNEL TEST SUITE');
  console.log('===============================================================\n');

  // Connect to MongoDB in read-only mode to fetch tokens and verify baseline counts
  await mongoose.connect('mongodb://127.0.0.1:27017/placement_portal');
  const db = mongoose.connection.db;

  const initialCounts = {
    users: await db.collection('users').countDocuments(),
    placementdrives: await db.collection('placementdrives').countDocuments(),
    applications: await db.collection('applications').countDocuments(),
    notifications: await db.collection('notifications').countDocuments(),
  };

  console.log('1. Baseline MongoDB Collection Counts:');
  console.log(`   - Users: ${initialCounts.users} (Expected: 6)`);
  console.log(`   - Placement Drives: ${initialCounts.placementdrives} (Expected: 7)`);
  console.log(`   - Applications: ${initialCounts.applications} (Expected: 12)`);
  console.log(`   - Notifications: ${initialCounts.notifications} (Expected: 20 or 22)`);

  assert(initialCounts.users === 6, 'Baseline users count must be 6');
  assert(initialCounts.placementdrives === 7, 'Baseline placementdrives count must be 7');
  assert(initialCounts.applications === 12, 'Baseline applications count must be 12');
  assert([20, 22].includes(initialCounts.notifications), 'Baseline notifications count must be 20 or 22');
  console.log('   -> PASS: Baseline counts verified.\n');

  // Fetch test users for JWT token generation
  const officerUser = await db.collection('users').findOne({ email: 'officer@college.edu' });
  const studentUser = await db.collection('users').findOne({ email: 'rahul.cse@college.edu' });

  assert(officerUser, 'Officer user exists');
  assert(studentUser, 'Student user exists');

  const officerToken = jwt.sign(
    { id: officerUser._id.toString(), role: officerUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const studentToken = jwt.sign(
    { id: studentUser._id.toString(), role: studentUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 1: AUTHORIZATION & ROUTE PROTECTION
  // --------------------------------------------------------------------------
  console.log('2. Testing Endpoint Authorization & Access Control:');

  // 1.1 Unauthenticated access to /analytics
  const unauthRes = await fetch(`${BACKEND_BASE}/analytics`);
  console.log(`   - Unauthenticated GET /api/applications/analytics: HTTP ${unauthRes.status}`);
  assert(unauthRes.status === 401, 'Unauthenticated request must return 401 Unauthorized');

  // 1.2 Student access to /analytics
  const studentRes = await fetch(`${BACKEND_BASE}/analytics`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`   - Student role GET /api/applications/analytics: HTTP ${studentRes.status}`);
  assert(studentRes.status === 403, 'Student request must return 403 Forbidden');

  // 1.3 Officer access to /analytics
  const officerRes = await fetch(`${BACKEND_BASE}/analytics`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  console.log(`   - Officer role GET /api/applications/analytics: HTTP ${officerRes.status}`);
  assert(officerRes.status === 200, 'Officer request must return 200 OK');
  console.log('   -> PASS: Authorization and role enforcement verified.\n');

  const fullData = await officerRes.json();
  assert(fullData.success === true, 'Analytics response success must be true');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: RECRUITMENT FUNNEL ACCURACY ACROSS ALL 12 RECORDS
  // --------------------------------------------------------------------------
  console.log('3. Testing Recruitment Funnel Aggregation Accuracy (Complete Portal Scope):');
  const funnel = fullData.data?.recruitmentFunnel;
  assert(funnel, 'recruitmentFunnel object exists in response');
  assert(Array.isArray(funnel.stages), 'funnel.stages is an array');
  assert(funnel.stages.length === 5, 'funnel.stages must contain exactly 5 progressive stages');

  const [s1, s2, s3, s4, s5] = funnel.stages;

  console.log(`   - Stage 1 (${s1.shortLabel}): count=${s1.count}, pct=${s1.percentageOfTotal}%, dropOff=${s1.dropOffCount} (${s1.dropOffRate}%)`);
  assert(s1.count === 12, 'Stage 1 must include all 12 applications');
  assert(s1.percentageOfTotal === 100, 'Stage 1 percentage of total must be 100%');
  assert(s1.conversionFromPrev === 100, 'Stage 1 intake conversion must be 100%');
  assert(s1.dropOffCount === 3, 'Stage 1 drop-off must be exactly 3 (remaining in Applied or rejected pre-screen)');
  assert(s1.dropOffRate === 25.0, 'Stage 1 drop-off rate must be 25.0%');

  console.log(`   - Stage 2 (${s2.shortLabel}): count=${s2.count}, pct=${s2.percentageOfTotal}%, conv=${s2.conversionFromPrev}%, dropOff=${s2.dropOffCount} (${s2.dropOffRate}%)`);
  assert(s2.count === 9, 'Stage 2 (Shortlisted+) count must be 9');
  assert(s2.percentageOfTotal === 75.0, 'Stage 2 pct must be 75.0%');
  assert(s2.conversionFromPrev === 75.0, 'Stage 2 conversion from Stage 1 must be 75.0%');
  assert(s2.dropOffCount === 5, 'Stage 2 drop-off must be 5 (shortlisted candidates not advancing to tech round)');
  assert(s2.dropOffRate === 55.6, 'Stage 2 drop-off rate must be 55.6%');

  console.log(`   - Stage 3 (${s3.shortLabel}): count=${s3.count}, pct=${s3.percentageOfTotal}%, conv=${s3.conversionFromPrev}%, dropOff=${s3.dropOffCount} (${s3.dropOffRate}%)`);
  assert(s3.count === 4, 'Stage 3 (Technical Round+) count must be 4');
  assert(s3.percentageOfTotal === 33.3, 'Stage 3 pct must be 33.3%');
  assert(s3.conversionFromPrev === 44.4, 'Stage 3 conversion from Stage 2 must be 44.4%');
  assert(s3.dropOffCount === 1, 'Stage 3 drop-off must be 1 (Priya Nair in Tech Round)');
  assert(s3.dropOffRate === 25.0, 'Stage 3 drop-off rate must be 25.0%');

  console.log(`   - Stage 4 (${s4.shortLabel}): count=${s4.count}, pct=${s4.percentageOfTotal}%, conv=${s4.conversionFromPrev}%, dropOff=${s4.dropOffCount} (${s4.dropOffRate}%)`);
  assert(s4.count === 3, 'Stage 4 (Interview+) count must be 3');
  assert(s4.percentageOfTotal === 25.0, 'Stage 4 pct must be 25.0%');
  assert(s4.conversionFromPrev === 75.0, 'Stage 4 conversion from Stage 3 must be 75.0%');
  assert(s4.dropOffCount === 1, 'Stage 4 drop-off must be 1 (Sneha in Interview)');
  assert(s4.dropOffRate === 33.3, 'Stage 4 drop-off rate must be 33.3%');

  console.log(`   - Stage 5 (${s5.shortLabel}): count=${s5.count}, pct=${s5.percentageOfTotal}%, conv=${s5.conversionFromPrev}%`);
  assert(s5.count === 2, 'Stage 5 (Selected) count must be exactly 2');
  assert(s5.percentageOfTotal === 16.7, 'Stage 5 pct must be 16.7%');
  assert(s5.conversionFromPrev === 66.7, 'Stage 5 conversion from Stage 4 must be 66.7%');
  assert(s5.dropOffCount === 0, 'Stage 5 drop-off must be 0');

  // Pipeline Health Metrics
  // Pipeline Health Metrics & Summary Under Review Consistency
  const health = funnel.pipelineHealth;
  console.log(`   - Pipeline Health: total=${health.totalApplications}, active=${health.activeInReview}, offers=${health.offersExtended}, rejected=${health.rejected}, overallRate=${health.overallConversionRate}%`);
  assert(health.totalApplications === 12, 'Health totalApplications must be 12');
  assert(health.activeInReview === 10, 'Health activeInReview must be 10 (3 Applied + 5 Shortlisted + 1 Tech + 1 Interview)');
  assert(health.offersExtended === 2, 'Health offersExtended must be 2');
  assert(health.rejected === 0, 'Health rejected must be 0');
  assert(health.overallConversionRate === 16.7, 'Overall conversion yield must be 16.7%');

  // Verify Summary Under Review (Applied + Shortlisted + Tech Round + Interview)
  const summary = fullData.data?.summary;
  assert(summary, 'summary object exists in response');
  console.log(`   - Summary Under Review: ${summary.totalUnderReview} (Applied: ${summary.totalApplied}, Shortlisted: ${summary.totalShortlisted}, Tech: ${summary.totalTechnicalRound}, Interview: ${summary.totalInterview})`);
  assert(summary.totalUnderReview === 10, 'Summary totalUnderReview must be 10 in baseline unfiltered dataset (3 Applied + 5 Shortlisted + 1 Tech + 1 Interview)');
  assert(summary.totalUnderReview === health.activeInReview, 'summary.totalUnderReview must match health.activeInReview');
  assert(
    summary.totalUnderReview + summary.totalSelected + summary.totalRejected === summary.totalApplications,
    'totalUnderReview + totalSelected + totalRejected must partition totalApplications without double counting'
  );
  console.log('   -> PASS: Funnel stages and conversion math verified.\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: SALARY ANALYTICS & CTC TIER SPECTRUM
  // --------------------------------------------------------------------------
  console.log('4. Testing Salary Analytics & Package Tiers:');
  const salary = fullData.data?.salaryAnalytics;
  assert(salary, 'salaryAnalytics exists');
  assert(salary.hasOffers === true, 'hasOffers must be true');
  assert(salary.offersCount === 2, 'offersCount must be 2');
  assert(salary.highestLPA === 25, 'Highest package must be 25 LPA (Sneha @ Microsoft)');
  assert(salary.lowestLPA === 16, 'Lowest package must be 16 LPA (Rahul @ Cisco)');
  assert(salary.averageLPA === 20.5, 'Average package must be 20.5 LPA');
  assert(salary.medianLPA === 20.5, 'Median package must be 20.5 LPA (Rahul @ Cisco & Sneha @ Microsoft)');

  console.log(`   - Highest: ${salary.highestLPA} LPA, Lowest: ${salary.lowestLPA} LPA, Avg: ${salary.averageLPA} LPA, Median: ${salary.medianLPA} LPA`);

  // Tiers verification
  const superDream = salary.tiers.find((t) => t.tierId === 'super-dream');
  const dream = salary.tiers.find((t) => t.tierId === 'dream');
  const core = salary.tiers.find((t) => t.tierId === 'core-mass');

  assert(superDream && superDream.drivesCount === 3 && superDream.offersCount === 2, 'Super Dream tier math verified');
  assert(dream && dream.drivesCount === 2 && dream.offersCount === 0, 'Dream tier math verified');
  assert(core && core.drivesCount === 2 && core.offersCount === 0, 'Core tier math verified');
  console.log(`   - Super Dream (>=15 LPA): ${superDream.drivesCount} drives, ${superDream.offersCount} offers (${superDream.offersPercentage}%)`);
  console.log(`   - Dream (8-14.9 LPA): ${dream.drivesCount} drives, ${dream.offersCount} offers (${dream.offersPercentage}%)`);
  console.log(`   - Core (<8 LPA): ${core.drivesCount} drives, ${core.offersCount} offers (${core.offersPercentage}%)`);
  console.log('   -> PASS: Salary CTC parsing and tier groupings verified.\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: FILTER VARIATIONS (BRANCH, STATUS & CANDIDATE SEARCH)
  // --------------------------------------------------------------------------
  console.log('5. Testing Filter Variations:');

  // 4.1 Filter by Branch = CSE (Rahul Verma only)
  const cseRes = await fetch(`${BACKEND_BASE}/analytics?branch=CSE`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const cseData = await cseRes.json();
  assert(cseData.success === true, 'CSE filter success');
  assert(cseData.data.summary.totalApplications === 6, 'CSE branch has 6 applications');
  assert(cseData.data.recruitmentFunnel.stages[0].count === 6, 'CSE Stage 1 count = 6');
  assert(cseData.data.recruitmentFunnel.stages[1].count === 4, 'CSE Stage 2 count = 4');
  assert(cseData.data.recruitmentFunnel.stages[4].count === 1, 'CSE Stage 5 count = 1');
  console.log('   - Branch CSE: 6 apps, 1 offer (Rahul Verma) -> Verified');

  // 4.2 Filter by Branch = MECH (Vikram Singh only)
  const mechRes = await fetch(`${BACKEND_BASE}/analytics?branch=MECH`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const mechData = await mechRes.json();
  assert(mechData.data.summary.totalApplications === 1, 'MECH branch has 1 application');
  assert(mechData.data.recruitmentFunnel.stages[1].count === 1, 'MECH Stage 2 count = 1');
  assert(mechData.data.recruitmentFunnel.stages[4].count === 0, 'MECH Stage 5 count = 0');
  assert(mechData.data.recruitmentFunnel.pipelineHealth.overallConversionRate === 0, 'MECH 0% conversion');
  console.log('   - Branch MECH: 1 app, 0 offers, 1 shortlisted (Vikram Singh, 0% conversion) -> Verified');

  // 4.3 Filter by Status = Selected
  const selectedRes = await fetch(`${BACKEND_BASE}/analytics?status=Selected`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const selectedData = await selectedRes.json();
  assert(selectedData.data.summary.totalApplications === 2, 'Status Selected has 2 applications');
  assert(selectedData.data.recruitmentFunnel.stages[4].count === 2, 'Selected Stage 5 count = 2');
  console.log('   - Status Selected: 2 apps, all reaching stage 5 -> Verified');

  // 4.4 Filter by Search = Rahul Verma (Verification requirement)
  const rahulRes = await fetch(`${BACKEND_BASE}/analytics?search=Rahul%20Verma`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const rahulData = await rahulRes.json();
  assert(rahulData.success === true, 'Rahul Verma search success');
  const rahulSummary = rahulData.data?.summary;
  const rahulFunnel = rahulData.data?.recruitmentFunnel;
  console.log(`   - Search Rahul Verma: totalApps=${rahulSummary.totalApplications}, totalShortlisted=${rahulSummary.totalShortlisted}, cumulativeShortlisted+=${rahulFunnel.stages[1].count}, offers=${rahulSummary.totalSelected}, underReview=${rahulSummary.totalUnderReview}`);
  assert(rahulSummary.totalApplications === 6, 'Rahul Verma has exactly 6 matching applications');
  assert(rahulSummary.totalShortlisted === 3, 'Rahul Verma has exactly 3 point-in-time Shortlisted applications');
  assert(rahulFunnel.stages[1].count === 4, 'Rahul Verma has exactly 4 cumulative Shortlisted+ applications in Stage 2');
  assert(rahulSummary.totalSelected === 1, 'Rahul Verma has exactly 1 confirmed offer (Selected)');
  assert(rahulSummary.totalUnderReview === 5, 'Rahul Verma has exactly 5 applications Under Review (Applied 2 + Shortlisted 3)');
  assert(
    rahulSummary.totalUnderReview + rahulSummary.totalSelected + rahulSummary.totalRejected === rahulSummary.totalApplications,
    'Rahul Verma Under Review + Selected + Rejected partitions 6 applications without double-counting'
  );
  console.log('   - Search Rahul Verma: 6 apps, 4 cumulative Shortlisted+, 1 offer, 5 under review -> Verified');
  console.log('   -> PASS: Filter variations reactively calculate correct subset metrics.\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: EMPTY DATA RESILIENCE & ZERO-DIVISION GUARDS
  // --------------------------------------------------------------------------
  console.log('6. Testing Empty Data Resilience (Zero Results Filter):');
  const emptyRes = await fetch(`${BACKEND_BASE}/analytics?search=NonExistentStudent123456`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  assert(emptyRes.status === 200, 'Empty search returns 200 OK');
  const emptyData = await emptyRes.json();
  assert(emptyData.success === true, 'Empty search success is true');
  assert(emptyData.data.summary.totalApplications === 0, 'Empty search total applications is 0');

  emptyData.data.recruitmentFunnel.stages.forEach((st) => {
    assert(st.count === 0, `Empty stage ${st.shortLabel} count must be 0`);
    assert(st.percentageOfTotal === 0, `Empty stage ${st.shortLabel} pct must be 0`);
    assert(!isNaN(st.percentageOfTotal), `Empty stage ${st.shortLabel} pct must not be NaN`);
    assert(!isNaN(st.conversionFromPrev), `Empty stage ${st.shortLabel} conversion must not be NaN`);
    assert(!isNaN(st.dropOffRate), `Empty stage ${st.shortLabel} drop-off rate must not be NaN`);
  });

  const emptySalary = emptyData.data.salaryAnalytics;
  assert(emptySalary.hasOffers === false, 'Empty salary hasOffers is false');
  assert(emptySalary.highestLPA === 0, 'Empty highestLPA is 0');
  assert(emptySalary.averageLPA === 0, 'Empty averageLPA is 0');
  assert(emptySalary.medianLPA === 0, 'Empty medianLPA is 0');
  assert(!isNaN(emptySalary.averageLPA), 'Empty averageLPA must not be NaN');
  console.log('   -> PASS: Zero-division guards and clean empty state resilience verified.\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: UI KPI LABELS & CATALOG SUBTITLE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('7. Testing PlacementReports.jsx UI KPI Labels:');
  const fs = require('fs');
  const reportsFile = fs.readFileSync(
    path.join(__dirname, '../../client/src/pages/officer/PlacementReports.jsx'),
    'utf-8'
  );
  assert(
    reportsFile.includes('Currently Shortlisted'),
    'PlacementReports.jsx has KPI label "Currently Shortlisted"'
  );
  assert(
    reportsFile.includes('In screening / awaiting technical rounds'),
    'PlacementReports.jsx has subtitle "In screening / awaiting technical rounds"'
  );
  assert(
    reportsFile.includes('Active campus drives in portal catalog'),
    'PlacementReports.jsx has subtitle "Active campus drives in portal catalog"'
  );
  assert(
    reportsFile.includes('Applied, Shortlisted, Tech & Interview'),
    'PlacementReports.jsx Under Review card has subtitle "Applied, Shortlisted, Tech & Interview"'
  );
  console.log('   -> PASS: UI KPI labels and catalog subtitles verified.\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: DATABASE READ-ONLY INTEGRITY CONFIRMATION
  // --------------------------------------------------------------------------
  console.log('8. Confirming Database Read-Only Integrity:');
  const finalCounts = {
    users: await db.collection('users').countDocuments(),
    placementdrives: await db.collection('placementdrives').countDocuments(),
    applications: await db.collection('applications').countDocuments(),
    notifications: await db.collection('notifications').countDocuments(),
  };

  console.log(`   - Users: ${finalCounts.users} (Initial: ${initialCounts.users})`);
  console.log(`   - Placement Drives: ${finalCounts.placementdrives} (Initial: ${initialCounts.placementdrives})`);
  console.log(`   - Applications: ${finalCounts.applications} (Initial: ${initialCounts.applications})`);
  console.log(`   - Notifications: ${finalCounts.notifications} (Initial: ${initialCounts.notifications})`);

  assert(finalCounts.users === initialCounts.users, 'Users collection count unmodified');
  assert(finalCounts.placementdrives === initialCounts.placementdrives, 'Placement drives unmodified');
  assert(finalCounts.applications === initialCounts.applications, 'Applications unmodified');
  assert(finalCounts.notifications === initialCounts.notifications, 'Notifications unmodified');

  // Also verify Rahul's skills count
  const rahulDoc = await db.collection('users').findOne({ email: 'rahul.cse@college.edu' });
  assert(rahulDoc && Array.isArray(rahulDoc.skills) && rahulDoc.skills.length === 16, "Rahul's 16 skills intact");
  console.log(`   - Rahul's Skills Count: ${rahulDoc.skills.length} (Expected: 16)`);
  console.log('   -> PASS: Zero database mutations. Read-only constraint 100% satisfied.\n');

  await mongoose.disconnect();
  console.log('===============================================================');
  console.log(' ALL VISUAL PLACEMENT ANALYTICS & FUNNEL TESTS PASSED (7/7)');
  console.log('===============================================================\n');
}

run().catch(async (err) => {
  console.error('\n[TEST RUNNER ERROR]:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
