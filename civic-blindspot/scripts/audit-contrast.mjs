import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getLuminance(r, g, b) {
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b);
}

function getContrast(rgb1, rgb2) {
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

async function audit() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const routes = ['workflows', 'cases', 'interpreter'];
  const viewports = [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' }
  ];

  const issues = [];

  for (const theme of ['light', 'dark']) {
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const r of routes) {
        await page.goto(`http://127.0.0.1:5173/?view=${r}`, { waitUntil: 'networkidle2' });
        
        // Set theme
        await page.evaluate((th) => {
          if (th === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        await new Promise(res => setTimeout(res, 300));

        const elements = await page.evaluate(() => {
          const results = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
            const text = (node.innerText || '').trim();
            const tag = node.tagName.toLowerCase();
            const isText = (tag === 'p' || tag === 'span' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'label' || tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select') && text.length > 0 && text.length < 150;
            if (!isText) continue;

            const style = window.getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;

            // Find background by walking up
            let bg = style.backgroundColor;
            let curr = node;
            while ((!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && curr.parentElement) {
              curr = curr.parentElement;
              bg = window.getComputedStyle(curr).backgroundColor;
            }

            results.push({
              tag,
              text: text.slice(0, 40),
              fg: style.color,
              bg: bg || 'rgb(255, 255, 255)',
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              className: node.className || '',
            });
          }
          return results;
        });

        for (const el of elements) {
          const fgRgb = parseRgb(el.fg);
          const bgRgb = parseRgb(el.bg);
          if (fgRgb && bgRgb) {
            const ratio = getContrast(fgRgb, bgRgb);
            const isLarge = parseFloat(el.fontSize) >= 24 || (parseFloat(el.fontSize) >= 18.66 && parseInt(el.fontWeight, 10) >= 700);
            const target = isLarge ? 3.0 : 4.5;
            if (ratio < target) {
              issues.push({
                route: r,
                theme,
                viewport: vp.name,
                element: `${el.tag}: "${el.text}"`,
                fg: el.fg,
                bg: el.bg,
                ratio: ratio.toFixed(2),
                target: target.toFixed(1),
                className: el.className
              });
            }
          }
        }
      }
    }
  }

  await browser.close();
  console.log(JSON.stringify(issues, null, 2));
}

audit().catch(console.error);

