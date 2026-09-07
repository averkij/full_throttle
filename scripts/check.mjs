import {readFile, readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {ROOT, SITE_FILES, validateSiteFiles} from './site-files.mjs';

await validateSiteFiles();
let checked = 0;
for (const folder of ['src', 'scripts', 'tests']) {
  for (const name of await readdir(path.join(ROOT, folder))) {
    if (!/\.(?:mjs|js)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(ROOT, folder, name)], {
      stdio: 'inherit', windowsHide: true
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
    checked++;
  }
}
const credentials = [
  /sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
for (const name of SITE_FILES.filter(name => /\.(?:js|html|css|txt)$/.test(name))) {
  const source = await readFile(path.join(ROOT, name), 'utf8');
  if (credentials.some(pattern => pattern.test(source))) {
    throw new Error(`Potential credential in ${name}; inspect locally before publishing.`);
  }
}
console.log(`Checked ${checked} JavaScript files and ${SITE_FILES.length} public file paths.`);
