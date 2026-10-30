import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:/Users/cmoul/.gemini/antigravity/brain/c173f8db-52f1-4701-8442-e4acccd04bde';
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find((p) => p && fs.existsSync(p));

async function verifyM0() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.toString()));

  // Start vite dev server preview or visit port 5174
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Capture Title Scene
  const titlePath = `${ARTIFACTS_DIR}/dusklight_m0_title.png`;
  await page.screenshot({ path: titlePath });
  console.log('Saved title screenshot to:', titlePath);

  // 2. Click to enter the game
  await page.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 1500));

  // 3. Move player down and right
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.up('KeyD');

  await page.keyboard.down('KeyS');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.up('KeyS');

  await new Promise((r) => setTimeout(r, 500));

  // 4. Capture Game Scene
  const gamePath = `${ARTIFACTS_DIR}/dusklight_m0_gameplay.png`;
  await page.screenshot({ path: gamePath });
  console.log('Saved gameplay screenshot to:', gamePath);

  await browser.close();
}

verifyM0().catch(console.error);
