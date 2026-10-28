import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = chromePaths.find((p) => fs.existsSync(p));

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  await page.setViewport({ width: 768, height: 1024, isMobile: true });
  await page.goto('http://localhost:5173/explorer', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.history.pushState(null, '', '/explorer?centre=dlsa-mysuru');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await new Promise((r) => setTimeout(r, 1500));

  const debug = await page.evaluate(() => {
    const pin = document.querySelector('.office-pin-selected');
    const drawer = document.querySelector('[role="dialog"], [data-testid="detail-drawer"], .fixed.inset-y-0.right-0, .fixed.bottom-0');
    if (!pin || !drawer) return { error: 'not found', pin: !!pin, drawer: !!drawer };
    const pinRect = pin.getBoundingClientRect();
    const drawerRect = drawer.getBoundingClientRect();
    const intersects = !(
      pinRect.right <= drawerRect.left ||
      pinRect.left >= drawerRect.right ||
      pinRect.bottom <= drawerRect.top ||
      pinRect.top >= drawerRect.bottom
    );
    return {
      pinRect: { left: pinRect.left, right: pinRect.right, top: pinRect.top, bottom: pinRect.bottom, width: pinRect.width, height: pinRect.height },
      drawerRect: { left: drawerRect.left, right: drawerRect.right, top: drawerRect.top, bottom: drawerRect.bottom, width: drawerRect.width, height: drawerRect.height },
      intersects,
      windowW: window.innerWidth,
      drawerActualW: drawerRect.width,
    };
  });
  console.log(JSON.stringify(debug, null, 2));
  await browser.close();
}

run();
