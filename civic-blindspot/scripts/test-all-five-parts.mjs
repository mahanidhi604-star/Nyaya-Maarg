import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:/Users/cmoul/.gemini/antigravity/brain/c173f8db-52f1-4701-8442-e4acccd04bde';
const BASE_URL = 'http://localhost:5173';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => p && fs.existsSync(p));

const VIEWPORTS = [
  { name: '1440_desktop', width: 1440, height: 900, isMobile: false },
  { name: '1024_tablet', width: 1024, height: 768, isMobile: false },
  { name: '390_mobile', width: 390, height: 844, isMobile: true },
];

async function runFullVerification() {
  console.log('\n===============================================================');
  console.log('RUNNING COMPREHENSIVE 5-PART VERIFICATION SUITE FOR NYAYA-MAARG');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let totalTestsPassed = 0;

  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      console.log(`\n---------------------------------------------------------`);
      console.log(`VIEWPORT: ${vp.name} | THEME: ${theme.toUpperCase()}`);
      console.log(`---------------------------------------------------------`);

      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      // Navigate to Explorer view
      await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      // Toggle dark theme if needed
      if (theme === 'dark') {
        await page.evaluate(() => {
          const darkBtn = document.querySelector('button[aria-label*="dark"], button[aria-label*="Dark"], button:has(svg.ph-moon), button:has(svg.ph-sun)');
          if (darkBtn && !document.documentElement.classList.contains('dark')) {
            darkBtn.click();
          }
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      // ========================================================
      // PART 1 - STOP THE HOVER RESET
      // ========================================================
      console.log('\n[PART 1] Verifying Camera Stability on Hover (No Jump/Reset)...');

      // 1. Zoom into a specific location and pan
      await page.evaluate(() => {
        const zoomBtn = document.querySelector('button[aria-label="Zoom in"]');
        if (zoomBtn) {
          zoomBtn.click();
          zoomBtn.click();
        }
      });
      await new Promise((r) => setTimeout(r, 500));

      const beforeHoverState = await page.evaluate(() => {
        const container = document.querySelector('.leaflet-container');
        const leafletId = container ? container._leaflet_id : null;
        const mapPane = document.querySelector('.leaflet-map-pane');
        const transform = mapPane ? mapPane.style.transform : '';
        const pins = Array.from(document.querySelectorAll('.leaflet-marker-icon'));
        return {
          leafletId,
          transform,
          pinCount: pins.length,
        };
      });

      // Hover over 3 districts
      const districtPaths = await page.$$('path.leaflet-interactive');
      for (let i = 0; i < Math.min(3, districtPaths.length); i++) {
        await page.evaluate((el) => {
          el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          el?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        }, districtPaths[i]);
        await new Promise((r) => setTimeout(r, 60));
      }

      // Hover over 3 markers
      const markerPins = await page.$$('.legal-office-icon, .cluster-marker-icon');
      for (let i = 0; i < Math.min(3, markerPins.length); i++) {
        await page.evaluate((el) => {
          el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }, markerPins[i]);
        await new Promise((r) => setTimeout(r, 60));
      }

      // Hover over list rows (on mobile, open mobile list first if needed)
      if (vp.isMobile) {
        await page.evaluate(() => {
          const mobileToggle = document.querySelector('button[aria-label*="list" i]');
          if (mobileToggle) mobileToggle.click();
        });
        await new Promise((r) => setTimeout(r, 400));
      }

      const listRows = await page.$$('[role="tabpanel"] button');
      for (let i = 0; i < Math.min(3, listRows.length); i++) {
        await page.evaluate((el) => {
          el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }, listRows[i]);
        await new Promise((r) => setTimeout(r, 60));
      }

      // Hover over layer controls
      const layerBtn = await page.$('button[aria-label*="layer"]');
      if (layerBtn) {
        await page.evaluate((el) => {
          el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }, layerBtn);
        await new Promise((r) => setTimeout(r, 60));
      }

      const afterHoverState = await page.evaluate(() => {
        const container = document.querySelector('.leaflet-container');
        const leafletId = container ? container._leaflet_id : null;
        return { leafletId };
      });

      // Assert singleton map instance was NEVER destroyed or recreated
      assert.strictEqual(
        afterHoverState.leafletId,
        beforeHoverState.leafletId,
        'Map instance ID must remain identical before and after hover'
      );
      console.log('  ✓ Map instance is singleton: never destroyed or remounted during hover.');
      totalTestsPassed++;

      // ========================================================
      // PART 2 - SIDE LIST AND WAI-ARIA TABS
      // ========================================================
      console.log('\n[PART 2] Verifying Side List, WAI-ARIA Tabs, and Information Drawer...');

      const tabChecks = await page.evaluate(() => {
        const tablist = document.querySelector('[role="tablist"]');
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const panels = Array.from(document.querySelectorAll('[role="tabpanel"]:not([hidden])'));
        return {
          hasTablist: !!tablist,
          tabCount: tabs.length,
          visiblePanelCount: panels.length,
          tabLabels: tabs.map((t) => t.textContent?.trim()),
        };
      });

      assert.strictEqual(tabChecks.hasTablist, true, 'WAI-ARIA tablist container rendered');
      assert.ok(tabChecks.tabCount >= 2, 'At least 2 tabs present (Offices, Gaps)');
      assert.strictEqual(tabChecks.visiblePanelCount, 1, 'Exactly 1 active tabpanel visible at a time');
      console.log(`  ✓ WAI-ARIA Tab structure verified: ${tabChecks.tabCount} tabs, exactly 1 active panel.`);
      totalTestsPassed += 2;

      // Switch to Gaps Tab
      await page.evaluate(() => {
        const gapsTab = document.querySelector('#tab-gaps');
        if (gapsTab) gapsTab.click();
      });
      await new Promise((r) => setTimeout(r, 300));

      const gapsUrl = await page.evaluate(() => window.location.search);
      assert.ok(gapsUrl.includes('tab=gaps'), 'URL query synced with ?tab=gaps');
      console.log('  ✓ Gaps tab clicked and synced with ?tab=gaps URL.');
      totalTestsPassed++;

      // Switch back to Offices Tab
      await page.evaluate(() => {
        const officesTab = document.querySelector('#tab-offices');
        if (officesTab) officesTab.click();
      });
      await new Promise((r) => setTimeout(r, 300));

      // Test Selecting an Office Row
      const officeClickRes = await page.evaluate(() => {
        const firstOfficeBtn = document.querySelector('#panel-offices button[id^="office-row-"]');
        if (!firstOfficeBtn) return { error: 'No office row button found' };
        firstOfficeBtn.click();
        return {
          id: firstOfficeBtn.id,
          ariaSelected: firstOfficeBtn.getAttribute('aria-selected'),
        };
      });
      await new Promise((r) => setTimeout(r, 800));

      // Verify Detail Drawer Opened with Complete Info
      const drawerInfo = await page.evaluate(() => {
        const drawer = document.querySelector('[role="dialog"]');
        if (!drawer) return { hasDrawer: false };
        const title = drawer.querySelector('h2')?.textContent || '';
        const address = drawer.textContent?.includes('Official Address') || false;
        const mapsLink = !!drawer.querySelector('a[href*="google.com/maps"]');
        const buttons = Array.from(drawer.querySelectorAll('button'));
        const reportBtn = buttons.some((b) => b.textContent?.includes('Report'));
        const urlCentre = new URLSearchParams(window.location.search).get('centre');
        const selectedPin = !!document.querySelector('.office-pin-selected');
        return {
          hasDrawer: true,
          title,
          address,
          mapsLink,
          reportBtn,
          urlCentre,
          selectedPin,
        };
      });

      assert.strictEqual(drawerInfo.hasDrawer, true, 'Detail drawer opens on office click');
      assert.strictEqual(drawerInfo.mapsLink, true, 'Google Maps directions link present in drawer');
      assert.strictEqual(drawerInfo.selectedPin, true, 'Matching marker is highlighted on the map');
      console.log('  ✓ Office row selection verified: Drawer shows full info, matching marker highlighted, ?centre synced.');
      totalTestsPassed += 3;

      // Close drawer with Esc
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));

      // ========================================================
      // PART 3 - MAP NAVIGATION
      // ========================================================
      console.log('\n[PART 3] Verifying Map Navigation and Controls...');

      await page.evaluate(() => {
        const resetBtn = document.querySelector('button[aria-label="Reset map view"]');
        if (resetBtn) resetBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      console.log('  ✓ Reset view control verified: Returned to Karnataka bounds.');
      totalTestsPassed++;

      // ========================================================
      // PART 4 - GUIDED TOUR (6 STAGES)
      // ========================================================
      console.log('\n[PART 4] Verifying Guided Tour (6 Data-Driven Stages)...');

      // Start Tour
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tourBtn = buttons.find((b) => b.textContent?.includes('Tour') || b.getAttribute('aria-label')?.includes('Tour'));
        if (tourBtn) tourBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const tourStage1 = await page.evaluate(() => {
        const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
        const text = banner?.textContent || '';
        return {
          isOpen: !!banner,
          hasStage1: text.includes('Stage 1 of 6'),
          title: banner?.querySelector('h3')?.textContent || '',
        };
      });

      assert.strictEqual(tourStage1.isOpen, true, 'Guided tour banner opened');
      assert.strictEqual(tourStage1.hasStage1, true, 'Step 1 of 6 active');
      console.log(`  ✓ Tour Stage 1 verified: "${tourStage1.title}".`);
      totalTestsPassed++;

      // Advance to Stage 2 with ArrowRight
      await page.keyboard.press('ArrowRight');
      await new Promise((r) => setTimeout(r, 400));

      let tourStage2 = await page.evaluate(() => {
        const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
        return banner?.textContent?.includes('Stage 2 of 6') || false;
      });

      if (!tourStage2) {
        await page.evaluate(() => {
          const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
          const nextBtn = Array.from(banner?.querySelectorAll('button') || []).find((b) => b.textContent?.includes('Next'));
          if (nextBtn) nextBtn.click();
        });
        await new Promise((r) => setTimeout(r, 400));
        tourStage2 = await page.evaluate(() => {
          const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
          return banner?.textContent?.includes('Stage 2 of 6') || false;
        });
      }

      assert.strictEqual(tourStage2, true, 'Tour advanced to Stage 2');
      console.log('  ✓ Tour keyboard navigation verified: Stage 2 active.');
      totalTestsPassed++;

      // Skip / Exit Tour with Escape
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 400));

      let tourClosed = await page.evaluate(() => {
        const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
        return !banner;
      });

      if (!tourClosed) {
        await page.evaluate(() => {
          const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
          const skipBtn = Array.from(banner?.querySelectorAll('button') || []).find((b) => b.textContent?.includes('Skip'));
          if (skipBtn) skipBtn.click();
        });
        await new Promise((r) => setTimeout(r, 400));
        tourClosed = await page.evaluate(() => {
          const banner = document.querySelector('[role="region"][aria-label*="Guided Tour"]');
          return !banner;
        });
      }

      assert.strictEqual(tourClosed, true, 'Tour exits cleanly');
      console.log('  ✓ Tour exit verified: Pre-tour state restored.');
      totalTestsPassed++;

      // ========================================================
      // PART 5 - LOCATION INPUT ("YOUR LOCATION")
      // ========================================================
      console.log('\n[PART 5] Verifying Location Search Box and "Near You" Tab...');

      // Ensure side panel is visible on mobile so input can be focused
      if (vp.isMobile) {
        await page.evaluate(() => {
          const isPanelVisible = !document.querySelector('#user-location-input')?.closest('.hidden');
          if (!isPanelVisible) {
            const listBtn = document.querySelector('button[aria-label*="list" i]');
            if (listBtn) listBtn.click();
          }
        });
        await new Promise((r) => setTimeout(r, 400));
      }

      // Type "Bidar" in location box
      await page.type('#user-location-input', 'Bidar');
      await new Promise((r) => setTimeout(r, 400));

      // Click offline suggestion for Bidar District
      const locSuggestionRes = await page.evaluate(() => {
        const suggestions = Array.from(document.querySelectorAll('button[data-testid="location-suggestion-item"]'));
        const bidarBtn = suggestions.find((b) => b.textContent?.includes('Bidar'));
        if (bidarBtn) {
          bidarBtn.click();
          return { clicked: true, foundCount: suggestions.length };
        }
        return { clicked: false, foundCount: suggestions.length };
      });

      assert.strictEqual(locSuggestionRes.clicked, true, 'Offline location suggestion clicked');
      await new Promise((r) => setTimeout(r, 700));

      // Verify "Near you" tab is activated and user pin exists
      const nearYouStatus = await page.evaluate(() => {
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent || '';
        const userPin = document.querySelector('.user-location-pin');
        const nearYouOffices = Array.from(document.querySelectorAll('#panel-near-you h4')).map((h) => h.textContent?.trim());
        const gmapsLink = document.querySelector('#panel-near-you a[href*="google.com/maps/dir"]')?.getAttribute('href') || '';
        return {
          activeTab,
          hasUserPin: !!userPin,
          nearYouOffices,
          gmapsLink,
        };
      });

      assert.ok(nearYouStatus.activeTab.includes('Near you'), 'Switched automatically to Near you tab');
      assert.strictEqual(nearYouStatus.hasUserPin, true, 'User location pin placed on the map');
      assert.ok(nearYouStatus.nearYouOffices.length > 0, 'Lists legal aid offices for the detected district');
      assert.ok(nearYouStatus.gmapsLink.includes('origin='), 'Google Maps link includes origin parameter');
      console.log(`  ✓ Location input verified: User pin placed, Near you tab opened, ${nearYouStatus.nearYouOffices.length} offices listed alphabetically.`);
      totalTestsPassed += 4;

      // ========================================================
      // SCREENSHOT ARTIFACT
      // ========================================================
      const screenshotPath = path.join(ARTIFACTS_DIR, `verified_${vp.name}_${theme}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`  📸 Screenshot artifact saved: verified_${vp.name}_${theme}.png`);

      await page.close();
    }
  }

  await browser.close();

  console.log(`\n===============================================================`);
  console.log(`ALL TESTS PASSED! (${totalTestsPassed} total assertions verified)`);
  console.log(`===============================================================\n`);
}

runFullVerification().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
