/**
 * Procedural generation for the 32x32 Classic Paw cursor (DESIGN.md Section 6).
 * Hollow-16 palette:
 * - Midnight Ink outline
 * - Fog / Snow paw pads
 * - Amber glint on interactive hover
 */
import fs from 'node:fs';
import path from 'node:path';

// Generate a simple 32x32 PNG or SVG cursor
const svgCursor = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <!-- Classic Paw Pixel Cursor -->
  <!-- Shadow / Outline -->
  <rect x="5" y="5" width="8" height="8" fill="#14172B" />
  <rect x="15" y="3" width="8" height="8" fill="#14172B" />
  <rect x="23" y="9" width="7" height="7" fill="#14172B" />
  <rect x="8" y="13" width="16" height="15" fill="#14172B" rx="2" />

  <!-- Main Paw Pad -->
  <rect x="10" y="15" width="12" height="11" fill="#CFE0DC" />
  <rect x="12" y="17" width="8" height="7" fill="#F5FAFA" />

  <!-- Toe Pads -->
  <rect x="7" y="7" width="4" height="4" fill="#F5FAFA" />
  <rect x="17" y="5" width="4" height="4" fill="#F5FAFA" />
  <rect x="25" y="11" width="3" height="3" fill="#F5FAFA" />

  <!-- Amber spark pointer hotspot -->
  <rect x="4" y="4" width="3" height="3" fill="#F4B942" />
</svg>`;

const cursorPath = path.resolve('dusklight-hollow', 'public', 'cursor-paw.svg');
fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
fs.writeFileSync(cursorPath, svgCursor);
console.log('Created cursor at:', cursorPath);
