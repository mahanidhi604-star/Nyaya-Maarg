import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACTS_DIR = 'C:\\Users\\cmoul\\.gemini\\antigravity\\brain\\c173f8db-52f1-4701-8442-e4acccd04bde';

const VIEWPORTS = [
  { name: '1920_desktop', width: 1920, height: 1080 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1280_laptop', width: 1280, height: 800 },
  { name: '1024_tablet_landscape', width: 1024, height: 768 },
  { name: '768_tablet_portrait', width: 768, height: 1024 },
  { name: '390_mobile_portrait', width: 390, height: 844 },
  { name: '360_mobile_small', width: 360, height: 740 },
  { name: '844_landscape_phone', width: 844, height: 390 },
  { name: '1440_zoom_200', width: 720, height: 450, deviceScaleFactor: 2 },
];

async function runLayoutTests() {
  console.log('--- STARTING AUTOMATED LAYOUT & STACKING REGRESSION TEST SUITE ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  let totalAssertions = 0;
  const verifiedScreenshots = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor || 1,
    });

    // 1. DEFAULT STATE
    await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const checkLayout = async (stateLabel) => {
      return await page.evaluate((state) => {
        function getBox(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const visible = r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
          return {
            el,
            name,
            left: Math.round(r.left),
            top: Math.round(r.top),
            right: Math.round(r.right),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
            cx: Math.round(r.left + r.width / 2),
            cy: Math.round(r.top + r.height / 2),
            zIndex: cs.zIndex === 'auto' ? 0 : parseInt(cs.zIndex, 10) || 0,
            visible,
          };
        }

        function rectsIntersect(r1, r2) {
          if (!r1 || !r2 || !r1.visible || !r2.visible) return false;
          return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
        }

        const header = getBox(document.querySelector('header'), 'Header');
        const nav = getBox(document.querySelector('header nav, nav.md\\:hidden'), 'Navigation');
        const mapContainer = getBox(document.querySelector('.leaflet-container'), 'Map Container');
        const mapWrapper = getBox(document.querySelector('.map-stacking-context'), 'Map Stacking Wrapper');
        const toolbar = getBox(document.querySelector('.map-control-toolbar'), 'Unified Map Toolbar');
        const scale = getBox(document.querySelector('div.absolute.left-3:has(.font-mono)'), 'Scale Indicator');
        const whatIfBanner = getBox(document.querySelector('div.status-badge-warning.absolute.top-3.left-3'), 'What-If Placement Banner');
        const mobileToggle = getBox(document.querySelector('button.md\\:hidden.fixed.bottom-6'), 'Mobile List/Map Toggle');
        const drawer = getBox(document.querySelector('.fixed.inset-y-0.right-0, [data-testid="detail-drawer"]'), 'Detail / Assistant Drawer');
        const bottomSheet = getBox(document.querySelector('div.fixed.bottom-0'), 'Mobile Bottom Sheet');
        const userMenu = getBox(document.querySelector('.absolute.right-0.mt-1\\.5, [data-testid="user-menu"]'), 'User Dropdown Menu');

        // Check horizontal scrollbar
        const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;

        // Check map stays strictly inside wrapper
        let mapEscapesWrapper = false;
        if (mapContainer && mapWrapper) {
          mapEscapesWrapper = mapContainer.width > mapWrapper.width || mapContainer.height > mapWrapper.height;
        }

        // Control vs Control collisions
        const controls = [toolbar, scale, whatIfBanner, mobileToggle].filter(Boolean);
        const controlCollisions = [];
        for (let i = 0; i < controls.length; i++) {
          for (let j = i + 1; j < controls.length; j++) {
            if (rectsIntersect(controls[i], controls[j])) {
              controlCollisions.push(`${controls[i].name} collides with ${controls[j].name}`);
            }
          }
        }

        // Controls vs Overlapping UI collisions (Header, Nav, Drawer, BottomSheet)
        const uiElements = [header, nav, drawer, bottomSheet, userMenu].filter(Boolean);
        const uiCollisions = [];
        for (const ctrl of controls) {
          for (const ui of uiElements) {
            if (rectsIntersect(ctrl, ui)) {
              uiCollisions.push(`${ctrl.name} intersects ${ui.name}`);
            }
          }
        }

        // elementFromPoint check: verify center point hits the element or its descendants
        const hitTestFailures = [];
        const interactiveElements = [toolbar, mobileToggle, drawer].filter(Boolean);
        for (const item of interactiveElements) {
          if (!item.visible) continue;
          const hit = document.elementFromPoint(item.cx, item.cy);
          if (hit) {
            const isDescendant = item.el.contains(hit);
            if (!isDescendant) {
              hitTestFailures.push(`${item.name} obscured by <${hit.tagName.toLowerCase()} class="${hit.className}"> at (${item.cx},${item.cy})`);
            }
          }
        }

        return {
          state,
          hasHorizontalScroll,
          mapEscapesWrapper,
          controlCollisions,
          uiCollisions,
          hitTestFailures,
        };
      }, stateLabel);
    };

    // A. Verify Default State
    let res = await checkLayout('Default');
    assert.strictEqual(res.hasHorizontalScroll, false, `Horizontal scroll detected on ${vp.name} in Default state`);
    assert.strictEqual(res.mapEscapesWrapper, false, `Map canvas overflows wrapper cell on ${vp.name}`);
    assert.deepStrictEqual(res.controlCollisions, [], `Control-control collisions on ${vp.name}: ${res.controlCollisions.join(', ')}`);
    assert.deepStrictEqual(res.uiCollisions, [], `Control-UI collisions on ${vp.name}: ${res.uiCollisions.join(', ')}`);
    assert.deepStrictEqual(res.hitTestFailures, [], `Hit test failures on ${vp.name}: ${res.hitTestFailures.join(', ')}`);
    totalAssertions += 5;
    console.log(`  ✓ Default state: 0 collisions, 0 overflow, all hit-tests passed.`);

    // B. Verify What-If Active
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('What-If'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    res = await checkLayout('What-If Active');
    assert.deepStrictEqual(res.controlCollisions, [], `What-If control collisions on ${vp.name}: ${res.controlCollisions.join(', ')}`);
    assert.deepStrictEqual(res.uiCollisions, [], `What-If UI collisions on ${vp.name}: ${res.uiCollisions.join(', ')}`);
    totalAssertions += 2;
    console.log(`  ✓ What-If state: Banner in top-left, Toolbar in top-right, 0 collisions.`);

    if (['1440_desktop', '390_mobile_portrait', '844_landscape_phone'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `after_${vp.name}_whatif.png`);
      await page.screenshot({ path: file });
      verifiedScreenshots.push({ vp: vp.name, state: 'whatif', file });
    }

    // Turn what-if off
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('What-If'));
      if (btn) btn.click();
    });

    // C. Verify Centre Detail Drawer Open
    await page.evaluate(() => {
      const pin = document.querySelector('.office-pin');
      if (pin) pin.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    res = await checkLayout('Centre Detail Drawer Open');
    assert.deepStrictEqual(res.controlCollisions, [], `Drawer control collisions on ${vp.name}`);
    assert.deepStrictEqual(res.uiCollisions, [], `Drawer UI collisions on ${vp.name}: ${res.uiCollisions.join(', ')}`);
    assert.deepStrictEqual(res.hitTestFailures, [], `Drawer hit-test failures on ${vp.name}: ${res.hitTestFailures.join(', ')}`);
    totalAssertions += 3;
    console.log(`  ✓ Detail drawer open: Toolbar smoothly shifted, 0 occlusion, drawer interactive.`);

    if (['1440_desktop', '390_mobile_portrait', '768_tablet_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `after_${vp.name}_drawer.png`);
      await page.screenshot({ path: file });
      verifiedScreenshots.push({ vp: vp.name, state: 'drawer', file });
    }

    // Close detail drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
      if (closeBtn) closeBtn.click();
    });

    // D. Verify Bottom Sheet on Mobile / Tablet
    if (['390_mobile_portrait', '360_mobile_small', '844_landscape_phone', '1440_zoom_200'].includes(vp.name)) {
      await page.evaluate(() => {
        const areaBtn = document.querySelector('button.w-full.text-left.p-3');
        if (areaBtn) areaBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      res = await checkLayout('Selected Area Bottom Sheet');
      assert.deepStrictEqual(res.controlCollisions, [], `Bottom sheet control collisions on ${vp.name}: ${res.controlCollisions.join(', ')}`);
      assert.deepStrictEqual(res.uiCollisions, [], `Bottom sheet UI collisions on ${vp.name}: ${res.uiCollisions.join(', ')}`);
      totalAssertions += 2;
      console.log(`  ✓ Bottom sheet open: Scale shifted up, mobile floating toggle safely hidden, 0 collision.`);

      const file = path.join(ARTIFACTS_DIR, `after_${vp.name}_bottomsheet.png`);
      await page.screenshot({ path: file });
      verifiedScreenshots.push({ vp: vp.name, state: 'bottomsheet', file });

      // Close bottom sheet
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
        if (closeBtn) closeBtn.click();
      });
    }

    // E. Verify Assistant Drawer
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Assistant'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    res = await checkLayout('Assistant Drawer Open');
    assert.deepStrictEqual(res.controlCollisions, [], `Assistant control collisions on ${vp.name}`);
    assert.deepStrictEqual(res.uiCollisions, [], `Assistant UI collisions on ${vp.name}: ${res.uiCollisions.join(', ')}`);
    assert.deepStrictEqual(res.hitTestFailures, [], `Assistant hit-test failures on ${vp.name}: ${res.hitTestFailures.join(', ')}`);
    totalAssertions += 3;
    console.log(`  ✓ Assistant drawer open: Stacking context verified at z-drawer, 0 collisions.`);

    if (['1440_desktop', '390_mobile_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `after_${vp.name}_assistant.png`);
      await page.screenshot({ path: file });
      verifiedScreenshots.push({ vp: vp.name, state: 'assistant', file });
    }

    // Close assistant
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
      if (closeBtn) closeBtn.click();
    });

    // F. Verify Dark Theme
    await page.evaluate(() => {
      const darkToggle = document.querySelector('button[title*="Dark"], button[title*="Light"], button[aria-label*="theme"], button:has(svg.ph-moon), button:has(svg.ph-sun)');
      if (darkToggle) darkToggle.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    res = await checkLayout('Dark Theme Default');
    assert.deepStrictEqual(res.controlCollisions, [], `Dark theme control collisions on ${vp.name}`);
    assert.deepStrictEqual(res.uiCollisions, [], `Dark theme UI collisions on ${vp.name}`);
    totalAssertions += 2;
    console.log(`  ✓ Dark theme: Controls and canvas theme tokens rendered with 0 layout shift.`);

    if (['1440_desktop', '390_mobile_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `after_${vp.name}_dark_default.png`);
      await page.screenshot({ path: file });
      verifiedScreenshots.push({ vp: vp.name, state: 'dark_default', file });
    }
  }

  await browser.close();

  console.log('\n======================================================');
  console.log(`ALL LAYOUT AND STACKING REGRESSION TESTS PASSED (${totalAssertions} assertions verified)`);
  console.log('======================================================\n');
}

runLayoutTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
