import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {ROOT, SITE_FILES} from '../scripts/site-files.mjs';

async function filesIn(folder, prefix = '') {
  const result = [];
  for (const entry of await readdir(folder, {withFileTypes:true})) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await filesIn(path.join(folder, entry.name), name + '/'));
    else result.push(name);
  }
  return result;
}

test('A clean build removes stale files and publishes only the explicit game manifest', async () => {
  const output = path.join(ROOT, 'dist');
  await mkdir(output, {recursive:true});
  await writeFile(path.join(output, 'stale-development-note.txt'), 'Not part of the public game.');
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {cwd:ROOT, encoding:'utf8', windowsHide:true});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual((await filesIn(output)).sort(), [...SITE_FILES, '404.html'].sort());
  assert.equal(await readFile(path.join(output, '404.html'), 'utf8'), await readFile(path.join(output, 'index.html'), 'utf8'));
});

test('Every runtime module import and stylesheet URL resolves inside the public manifest', async () => {
  const published = new Set(SITE_FILES);
  for (const name of SITE_FILES.filter(name => /\.(?:js|css|html)$/.test(name))) {
    const source = await readFile(path.join(ROOT, name), 'utf8');
    const references = [...source.matchAll(/(?:from\s+|(?:src|href)=|url\(\s*)["']([^"']+)["']/g)];
    for (const [, reference] of references) {
      if (!reference.startsWith('./') && !reference.startsWith('../') && !/^(?:assets|src)\//.test(reference)) continue;
      const local = reference.split(/[?#]/)[0];
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), local, local.endsWith('/') ? 'index.html' : ''));
      assert.ok(published.has(resolved), `${name} references an unpublished file: ${reference}`);
    }
  }
  const game = await readFile(path.join(ROOT, 'src/game.js'), 'utf8');
  assert.doesNotMatch(game, /VOICE_ORIGINALS|voicePreviews|openVoices|data-voice-sample/);
});
