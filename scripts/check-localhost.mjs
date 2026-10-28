import puppeteer from 'puppeteer-core';

// Automatically find Chrome or Edge executable on Windows
import fs from 'fs';
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromePaths.find(p => fs.existsSync(p));

async function check() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  page.on('pageerror', err => {
    errors.push(`PageError: ${err.message}\n${err.stack}`);
  });

  page.on('requestfailed', req => {
    errors.push(`RequestFailed: ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    const response = await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('HTTP Status:', response.status());
  } catch (err) {
    console.log('Navigation error:', err.message);
  }

  console.log('\n--- CONSOLE MESSAGES ---');
  console.log(consoleMessages.join('\n'));

  console.log('\n--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('\nHTML Length:', html.length);
  
  await browser.close();
}

check().catch(console.error);
