import fs from 'node:fs';
import path from 'node:path';

// Mirror between civic-blindspot/dist and repo root dist
const rootDist = path.resolve('dist');
const civicDist = path.resolve('civic-blindspot', 'dist');

if (fs.existsSync(civicDist)) {
  fs.cpSync(civicDist, rootDist, { recursive: true, force: true });
  console.log(`[build] Successfully mirrored build output from civic-blindspot/dist to ${rootDist}`);
} else if (fs.existsSync(rootDist)) {
  fs.cpSync(rootDist, civicDist, { recursive: true, force: true });
  console.log(`[build] Successfully mirrored build output from dist to ${civicDist}`);
} else {
  console.error('[build] Error: neither civic-blindspot/dist nor dist was found.');
  process.exit(1);
}
