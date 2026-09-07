import {copyFile, lstat, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ROOT, SITE_FILES, validateSiteFiles} from './site-files.mjs';

await validateSiteFiles();
const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
if (/(?:src|href)="\//.test(html)) throw new Error('Use relative paths for GitHub project Pages.');

// A fresh, explicitly bounded output directory prevents stale files being published.
const output = path.resolve(ROOT, 'dist');
if (path.dirname(output) !== ROOT || path.basename(output) !== 'dist') {
  throw new Error('Refusing to clean a directory outside the build output.');
}
const previous = await lstat(output).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (previous?.isSymbolicLink()) throw new Error('The build directory must not be a symlink.');
await rm(output, {recursive: true, force: true});
for (const name of SITE_FILES) {
  const destination = path.join(output, name);
  await mkdir(path.dirname(destination), {recursive: true});
  await copyFile(path.join(ROOT, name), destination);
}
await writeFile(path.join(output, '404.html'), html);
console.log(`Built ${SITE_FILES.length + 1} public game files in ${output}`);
