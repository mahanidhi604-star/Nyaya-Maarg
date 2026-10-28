import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

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

async function runDiagnosis() {
  console.log('--- STARTING COMPREHENSIVE MAP EXPLORER DIAGNOSIS ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const allFindings = [];
  const capturedScreenshots = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n==================================================`);
    console.log(`EVALUATING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`==================================================`);

    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor || 1,
    });

    // Helper to evaluate bounding boxes and collision
    const checkCollisions = async (stateName) => {
      return await page.evaluate((state) => {
        function getBox(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return {
            name,
            left: Math.round(r.left),
            top: Math.round(r.top),
            right: Math.round(r.right),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
            zIndex: cs.zIndex === 'auto' ? 0 : parseInt(cs.zIndex, 10) || 0,
            visible: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
          };
        }

        function rectsIntersect(r1, r2) {
          if (!r1 || !r2 || !r1.visible || !r2.visible) return false;
          return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
        }

        const header = getBox(document.querySelector('header'), 'Header');
        const nav = getBox(document.querySelector('header nav, nav'), 'Navigation');
        const mapContainer = getBox(document.querySelector('.leaflet-container'), 'Leaflet Map Canvas');
        const mapWrapper = getBox(document.querySelector('.flex-1.relative'), 'Map Wrapper Cell');
        const zoomControl = getBox(document.querySelector('.leaflet-control-zoom'), 'Zoom Controls');
        const scaleControl = getBox(document.querySelector('.leaflet-control-scale'), 'Scale Control');
        const topToolbar = getBox(document.querySelector('div.absolute.top-3.right-3'), 'Orientation / Mode Toolbar');
        const whatIfBanner = getBox(document.querySelector('div.status-badge-warning'), 'What-If Banner');
        const whatIfTopIndicator = getBox(document.querySelector('div.absolute.top-4.left-1\\/2'), 'What-If Top Indicator');
        const mobileToggle = getBox(document.querySelector('button.md\\:hidden.fixed.bottom-6'), 'Mobile List/Map Toggle');
        const rightDrawer = getBox(document.querySelector('.fixed.inset-y-0.right-0, [data-testid="detail-drawer"]'), 'Right Detail Drawer');
        const bottomSheet = getBox(document.querySelector('div.fixed.bottom-0'), 'Mobile Bottom Sheet');
        const userMenu = getBox(document.querySelector('.absolute.right-0.mt-1\\.5, [data-testid="user-menu"]'), 'User Dropdown Menu');
        const sidePanel = getBox(document.querySelector('div.no-print.md\\:relative'), 'Side Filters / Ranking Panel');

        const controls = [zoomControl, scaleControl, topToolbar, whatIfBanner, whatIfTopIndicator, mobileToggle].filter(Boolean);
        const appUIs = [header, nav, rightDrawer, bottomSheet, userMenu].filter(Boolean);

        const overlaps = [];

        // 1. Control vs Control overlaps
        for (let i = 0; i < controls.length; i++) {
          for (let j = i + 1; j < controls.length; j++) {
            if (rectsIntersect(controls[i], controls[j])) {
              overlaps.push({
                type: 'control-control',
                elem1: controls[i].name,
                elem2: controls[j].name,
                box1: controls[i],
                box2: controls[j],
              });
            }
          }
        }

        // 2. Control/Map vs App UI overlaps
        for (const ctrl of controls) {
          for (const ui of appUIs) {
            if (rectsIntersect(ctrl, ui)) {
              overlaps.push({
                type: 'control-ui',
                elem1: ctrl.name,
                elem2: ui.name,
                box1: ctrl,
                box2: ui,
              });
            }
          }
        }

        // 3. District label vs Office Marker collisions
        const labels = Array.from(document.querySelectorAll('.district-label-marker')).map((el, i) => getBox(el, `DistrictLabel_${i}`));
        const pins = Array.from(document.querySelectorAll('.office-pin')).map((el, i) => getBox(el, `OfficePin_${i}`));
        let labelCollisions = 0;
        for (const l of labels) {
          for (const p of pins) {
            if (rectsIntersect(l, p)) labelCollisions++;
          }
        }

        const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
        const mapParentOverflow = window.getComputedStyle(document.querySelector('.flex-1.relative') || document.body).overflow;
        const mapIsolation = window.getComputedStyle(document.querySelector('.flex-1.relative') || document.body).isolation;

        return {
          state,
          overlaps,
          labelCollisions,
          hasHorizontalScroll,
          mapParentOverflow,
          mapIsolation,
          boxSummary: { header, nav, mapContainer, topToolbar, zoomControl, scaleControl, mobileToggle, rightDrawer, bottomSheet }
        };
      }, stateName);
    };

    // State A: Default Explorer
    await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const defaultRes = await checkCollisions('Default');
    defaultRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'Default',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Bounding box collision (${o.elem1} [z:${o.box1.zIndex}] intersects ${o.elem2} [z:${o.box2.zIndex}])`,
      });
    });
    if (defaultRes.labelCollisions > 0) {
      allFindings.push({
        viewport: vp.name,
        state: 'Default',
        elem1: 'District Text Labels',
        elem2: 'Office Markers',
        cause: `${defaultRes.labelCollisions} district text labels collide with office marker pins due to missing collision filtering`,
      });
    }
    if (defaultRes.hasHorizontalScroll) {
      allFindings.push({
        viewport: vp.name,
        state: 'Default',
        elem1: 'Page Body',
        elem2: 'Viewport Window',
        cause: 'Horizontal overflow scrollbar present at viewport',
      });
    }

    if (['1440_desktop', '390_mobile_portrait', '844_landscape_phone', '1440_zoom_200'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_default.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'default', file });
    }

    // State B: What-If Active
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('What-If'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const whatIfRes = await checkCollisions('What-If Simulator Active');
    whatIfRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'What-If Active',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Horizontal/vertical overlap with what-if banner or indicator (${o.elem1} vs ${o.elem2})`,
      });
    });

    if (['1440_desktop', '390_mobile_portrait', '844_landscape_phone'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_whatif.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'whatif', file });
    }

    // Turn what-if off
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('What-If'));
      if (btn) btn.click();
    });

    // State C: Centre Detail Drawer Open
    await page.evaluate(() => {
      const pin = document.querySelector('.office-pin');
      if (pin) pin.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const drawerRes = await checkCollisions('Centre Detail Drawer Open');
    drawerRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'Centre Detail Drawer Open',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Sliding drawer overlaps map control or header (${o.elem1} vs ${o.elem2})`,
      });
    });

    if (['1440_desktop', '390_mobile_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_drawer.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'drawer', file });
    }

    // Close drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
      if (closeBtn) closeBtn.click();
    });

    // State D: Selected Area Bottom Sheet (on mobile/tablet)
    await page.evaluate(() => {
      const areaBtn = document.querySelector('button.w-full.text-left.p-3');
      if (areaBtn) areaBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const sheetRes = await checkCollisions('Selected Area Bottom Sheet');
    sheetRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'Selected Area Bottom Sheet',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Bottom sheet covers lower controls (${o.elem1} vs ${o.elem2})`,
      });
    });

    if (['390_mobile_portrait', '360_mobile_small', '844_landscape_phone'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_bottomsheet.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'bottomsheet', file });
    }

    // Close sheet
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
      if (closeBtn) closeBtn.click();
    });

    // State E: Assistant Panel Open
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Assistant'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const assistantRes = await checkCollisions('Assistant Panel Open');
    assistantRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'Assistant Panel Open',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Assistant slide-over panel overlaps map controls (${o.elem1} vs ${o.elem2})`,
      });
    });

    if (['1440_desktop', '390_mobile_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_assistant.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'assistant', file });
    }

    // Close assistant
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button:has(svg.ph-x)');
      if (closeBtn) closeBtn.click();
    });

    // State F: User Menu / Nav Dropdown Open
    await page.evaluate(() => {
      const menuBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('My legal help'));
      if (menuBtn) menuBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const menuRes = await checkCollisions('Nav Menu Open');
    menuRes.overlaps.forEach(o => {
      allFindings.push({
        viewport: vp.name,
        state: 'Nav Menu Open',
        elem1: o.elem1,
        elem2: o.elem2,
        cause: `Dropdown menu z-index or stacking overlap with map elements`,
      });
    });

    // Close menu
    await page.evaluate(() => {
      const menuBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('My legal help'));
      if (menuBtn) menuBtn.click();
    });

    // State G: Dark Theme
    await page.evaluate(() => {
      const darkToggle = document.querySelector('button[title*="Dark"], button[title*="Light"], button[aria-label*="theme"], button:has(svg.ph-moon), button:has(svg.ph-sun)');
      if (darkToggle) darkToggle.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    if (['1440_desktop', '390_mobile_portrait'].includes(vp.name)) {
      const file = path.join(ARTIFACTS_DIR, `diag_${vp.name}_dark_theme.png`);
      await page.screenshot({ path: file });
      capturedScreenshots.push({ vp: vp.name, state: 'dark_theme', file });
    }
  }

  await browser.close();

  // Deduplicate findings
  const uniqueFindings = [];
  const seen = new Set();
  for (const f of allFindings) {
    const key = `${f.viewport}|${f.state}|${f.elem1}|${f.elem2}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFindings.push(f);
    }
  }

  console.log(`\n======================================================`);
  console.log(`DIAGNOSIS COMPLETE: Found ${uniqueFindings.length} unique layout & overlap defects`);
  console.log(`======================================================\n`);

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'diagnosis_findings_summary.json'),
    JSON.stringify({ findings: uniqueFindings, capturedScreenshots }, null, 2)
  );

  return uniqueFindings;
}

runDiagnosis().catch(err => {
  console.error('Diagnosis error:', err);
  process.exit(1);
});
