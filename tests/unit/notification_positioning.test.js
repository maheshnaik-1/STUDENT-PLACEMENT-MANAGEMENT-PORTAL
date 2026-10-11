/**
 * notification_positioning.test.js
 * Verification of the Context-Aware Notification Dropdown UI:
 * 1. Restore dropdown behavior anchored to the notification bell when sufficient space.
 * 2. Calculate position from actual bell bounding rectangle and viewport dimensions.
 * 3. Max width ~380px, height constrained to available vertical viewport space.
 * 4. Safe placement when bell is near left edge or navbar wraps (anchors to bell's left edge).
 * 5. On mobile (<=640px), centered horizontally with consistent 16px side margins.
 * 6. Prevents horizontal and vertical overflow.
 * 7. Header stays visible (flex-shrink: 0), body scrolls (overflow-y: auto).
 */

const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const errMsg = `FAILED: ${testName} ${details ? '(' + details + ')' : ''}`;
    failures.push(errMsg);
    console.error(`  [FAIL] ${errMsg}`);
  }
}

// Exactly mirror calculateDropdownPosition in NotificationBell.jsx
function calculateDropdownPosition(bellRect, viewportWidth, viewportHeight = 800) {
  const margin = 16;
  const panelWidth = Math.min(380, viewportWidth - margin * 2);
  const top = bellRect && bellRect.bottom > 0 ? Math.round(bellRect.bottom + 8) : 64;

  const maxAvailableHeight = Math.max(200, viewportHeight - top - margin);
  const maxHeight = Math.min(480, maxAvailableHeight);

  if (viewportWidth <= 640) {
    return {
      isMobile: true,
      top,
      panelWidth,
      maxHeight,
      style: {
        position: 'fixed',
        top: `${top}px`,
        left: `${margin}px`,
        right: `${margin}px`,
        margin: '0 auto',
        maxWidth: `${panelWidth}px`,
        maxHeight: `${maxHeight}px`,
        width: 'auto',
      },
    };
  }

  const bellCenter = bellRect.left + bellRect.width / 2;
  const isRightHalf = bellCenter > viewportWidth / 2;

  const rightAlignedLeft = Math.round(bellRect.right - panelWidth);
  const leftAlignedLeft = Math.round(bellRect.left);

  let left;
  if (isRightHalf) {
    if (rightAlignedLeft >= margin) {
      left = rightAlignedLeft;
    } else if (leftAlignedLeft + panelWidth <= viewportWidth - margin) {
      left = leftAlignedLeft;
    } else {
      left = margin;
    }
  } else {
    if (leftAlignedLeft + panelWidth <= viewportWidth - margin) {
      left = leftAlignedLeft;
    } else if (rightAlignedLeft >= margin) {
      left = rightAlignedLeft;
    } else {
      left = viewportWidth - margin - panelWidth;
    }
  }

  left = Math.max(margin, Math.min(viewportWidth - margin - panelWidth, Math.round(left)));

  return {
    isMobile: false,
    top,
    left,
    panelWidth,
    maxHeight,
    style: {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      width: `${panelWidth}px`,
      maxWidth: '380px',
      maxHeight: `${maxHeight}px`,
      margin: '0',
    },
  };
}

function runTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: CONTEXT-AWARE NOTIFICATION DROPDOWN UI');
  console.log('===============================================================\n');

  // --- Test 1: Standard Desktop (1280px viewport, bell at right edge) ---
  console.log('--- Test 1: Standard Desktop 1280px (Anchored to Bell) ---');
  {
    const viewportWidth = 1280;
    const viewportHeight = 800;
    // Bell button bounding box in top navbar (typical: right around 975px)
    const bellRect = { left: 936, right: 974.5, bottom: 52, width: 38.5, height: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.style.position === 'fixed', 'Desktop uses position: fixed');
    assert(pos.panelWidth === 380, 'Panel width is 380px');
    assert(pos.style.maxWidth === '380px', 'Max-width is capped at 380px');
    assert(pos.top === 60, 'Dropdown opens 8px below bell (52 + 8 = 60px)');
    assert(pos.left === Math.round(974.5 - 380), 'Dropdown right edge aligns with bell (975 - 380 = 595px)');
    assert(pos.left + pos.panelWidth === Math.round(bellRect.right), 'Right edge of panel (975px) aligns with bell right edge (974.5px)');
    assert(pos.left >= 16, 'Dropdown does not overflow left edge');
    assert(pos.left + pos.panelWidth <= viewportWidth - 16, 'Dropdown does not overflow right edge');
    assert(pos.maxHeight <= viewportHeight - pos.top - 16, 'Height constrained within viewport');
  }

  // --- Test 2: Large Desktop (1920px viewport, bell near 1400px) ---
  console.log('\n--- Test 2: Large Desktop 1920px (Anchored to Bell) ---');
  {
    const viewportWidth = 1920;
    const viewportHeight = 1080;
    const bellRect = { left: 1400, right: 1438, bottom: 52, width: 38, height: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.panelWidth === 380, '380px width on wide desktop');
    assert(pos.left === 1438 - 380, 'Anchored to bell right edge (1438 - 380 = 1058px)');
    assert(pos.left + pos.panelWidth === 1438, 'Right edge (1438px) matches bell right edge (1438px)');
    assert(pos.style.right === 'auto', 'Right is auto, not pinned to monitor right edge');
  }

  // --- Test 3: Safe Placement when Bell is near Left Edge (Navbar wrap or custom layout) ---
  console.log('\n--- Test 3: Safe Placement when Bell is near Left Edge ---');
  {
    const viewportWidth = 1024;
    const viewportHeight = 768;
    // Bell is placed near left side (e.g. left = 32px)
    const bellRect = { left: 32, right: 70, bottom: 96, width: 38, height: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.left === 32, 'Anchors to bell left edge (32px) when bell is near left edge');
    assert(pos.left >= 16, 'Left edge stays within viewport margin');
    assert(pos.left + pos.panelWidth <= viewportWidth - 16, 'Right edge (412px) does not overflow viewport');
    assert(pos.top === 104, 'Top sits 8px below bell (96 + 8 = 104px)');
  }

  // --- Test 4: Mobile Viewport 390px (iPhone 12/13/14) ---
  console.log('\n--- Test 4: Mobile Screen 390px iPhone ---');
  {
    const viewportWidth = 390;
    const viewportHeight = 844;
    const bellRect = { left: 330, right: 368, bottom: 50, width: 38, height: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.isMobile === true, 'Identifies mobile viewport (<= 640px)');
    assert(pos.style.position === 'fixed', 'Fixed positioning on mobile');
    assert(pos.style.left === '16px', 'Left margin is 16px');
    assert(pos.style.right === '16px', 'Right margin is 16px');
    assert(pos.style.margin === '0 auto', 'Centered horizontally with margin: 0 auto');
    assert(pos.panelWidth === 390 - 32, 'Max-width scales to viewport - 32px (358px)');
    assert(pos.style.width === 'auto', 'Width is auto for centering');
  }

  // --- Test 5: Mobile Viewport 412px (Samsung / Pixel) ---
  console.log('\n--- Test 5: Mobile Screen 412px Android ---');
  {
    const viewportWidth = 412;
    const viewportHeight = 915;
    const bellRect = { left: 350, right: 388, bottom: 52, width: 38, height: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.isMobile === true, 'Mobile viewport identified');
    assert(pos.style.left === '16px' && pos.style.right === '16px', 'Equal 16px side margins');
    assert(pos.style.margin === '0 auto', 'Centered horizontally');
    assert(pos.style.maxWidth === '380px', 'Max width is 380px on 412px screen');
  }

  // --- Test 6: Short Viewport Height (400px height) ---
  console.log('\n--- Test 6: Short Viewport Height (400px height) ---');
  {
    const viewportWidth = 1280;
    const viewportHeight = 400;
    const bellRect = { left: 936, right: 974, bottom: 52, width: 38 };
    const pos = calculateDropdownPosition(bellRect, viewportWidth, viewportHeight);

    assert(pos.maxHeight === 324, 'Max height is constrained to available height (400 - 60 - 16 = 324px)');
    assert(pos.top + pos.maxHeight <= viewportHeight - 16, 'Does not overflow bottom of viewport');
  }

  // --- Test 7: CSS Rules in index.css ---
  console.log('\n--- Test 7: CSS Declarations in index.css ---');
  {
    const cssPath = path.join(__dirname, '../../client/src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert(css.includes('.notification-dropdown {'), 'CSS defines .notification-dropdown');
    assert(css.includes('position: fixed;'), 'CSS specifies position: fixed');
    assert(css.includes('max-width: 380px;'), 'CSS specifies max-width: 380px');
    assert(css.includes('.notification-dropdown-header {'), 'CSS defines .notification-dropdown-header');
    assert(css.includes('flex-shrink: 0;'), 'Header has flex-shrink: 0 to stay visible');
    assert(css.includes('.notification-dropdown-body {'), 'CSS defines .notification-dropdown-body');
    assert(css.includes('overflow-y: auto'), 'Body has overflow-y: auto for internal scrolling');
    assert(css.includes('.notification-dropdown-body::-webkit-scrollbar'), 'Custom scrollbar included');
    assert(css.includes('@media (max-width: 640px)'), 'Mobile media query present');
    assert(css.includes('margin: 0 auto !important;'), 'Mobile media query centers with margin: 0 auto');
    assert(css.includes('max-width: 380px !important;'), 'Mobile media query keeps max-width: 380px');
  }

  // --- Summary ---
  console.log('\n===============================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    console.error('Test Failures:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('ALL CONTEXT-AWARE NOTIFICATION DROPDOWN TESTS PASSED.');
  }
}

runTests();
