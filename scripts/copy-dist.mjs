import fs from 'node:fs';
import path from 'node:path';

const rootDist = path.resolve('dist');
const subDist = path.resolve('dusklight-hollow', 'dist');

if (fs.existsSync(subDist)) {
  fs.cpSync(subDist, rootDist, { recursive: true, force: true });
  console.log(`[build] Successfully mirrored build output from dusklight-hollow/dist to ${rootDist}`);
} else if (fs.existsSync(rootDist)) {
  fs.cpSync(rootDist, subDist, { recursive: true, force: true });
  console.log(`[build] Successfully mirrored build output from dist to ${subDist}`);
} else {
  console.error('[build] Error: neither dusklight-hollow/dist nor dist was found.');
  process.exit(1);
}
