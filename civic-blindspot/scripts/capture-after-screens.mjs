import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\cmoul\\.gemini\\antigravity\\brain\\c173f8db-52f1-4701-8442-e4acccd04bde';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Workflows Library (Dark)
  await page.goto('http://127.0.0.1:5173/?view=workflows', { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_workflows_library_dark.png') });

  // 2. Workflows Detail Stepper (Dark)
  // Click first workflow "View Guided Steps"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('View Guided Steps'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_workflows_detail_dark.png') });

  // 3. Cases Tracker (Dark)
  await page.goto('http://127.0.0.1:5173/?view=cases', { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_cases_list_dark.png') });

  // 4. Cases Detail (Dark)
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div'));
    const card = cards.find(c => c.innerText && c.innerText.includes('View File'));
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_cases_detail_dark.png') });

  // 5. Interpreter (Dark)
  await page.goto('http://127.0.0.1:5173/?view=interpreter', { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 600));
  // Click first quick sample
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sampleBtn = btns.find(b => b.innerText.includes('Bengaluru'));
    if (sampleBtn) sampleBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  // Click breakdown
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Breakdown This Document'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_interpreter_results_dark.png') });

  // 6. MapTiler Overview (Light & Dark)
  await page.goto('http://127.0.0.1:5173/?view=overview', { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_maptiler_overview_light.png') });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_maptiler_overview_dark.png') });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(console.error);
