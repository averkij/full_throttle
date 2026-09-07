import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {ROOT, SITE_FILES} from '../scripts/site-files.mjs';
import {VOICE_SAMPLES} from '../src/voice-samples.js';

async function withServer(args, check) {
  const child = spawn(process.execPath, ['scripts/serve.mjs', ...args], {
    cwd: ROOT, env: {...process.env, PORT: '0'}, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 8000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
      child.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+\/\S*/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.stderr.on('data', data => { clearTimeout(timer); reject(new Error(String(data))); });
    });
    await check(base);
  } finally {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
  }
}

test('The public game and every final recording load at a GitHub Pages repository subpath', {timeout:30000}, async () => {
  await withServer(['--base', '/full_throttle/'], async base => {
    const hashes = new Map(VOICE_SAMPLES.map(sample => [sample.file.replace(/^\.\.\//, ''), sample.audioHash]));
    for (const name of SITE_FILES) {
      const response = await fetch(base + name);
      assert.equal(response.status, 200, name);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (name !== '.nojekyll') assert.ok(bytes.length > 0, name);
      if (hashes.has(name)) {
        assert.equal(response.headers.get('content-type'), 'audio/wav');
        assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes.get(name), name);
      }
      if (name.endsWith('.woff2')) assert.equal(response.headers.get('content-type'), 'font/woff2');
      if (name.endsWith('.js')) assert.match(response.headers.get('content-type'), /^text\/javascript/);
    }
    for (const name of ['README.md', 'docs/BUILDING_WITH_AGENTS.md', 'scripts/build.mjs', 'speech/production.json', 'missing.js']) {
      assert.equal((await fetch(base + name)).status, 404, name);
    }
    assert.equal((await fetch(base + '..%2f..%2f.git/config')).status, 403);
    const html = await (await fetch(base)).text();
    assert.match(html, /new-rocker-regular\.woff2/);
    assert.doesNotMatch(html, /(?:src|href)="\//);
  });
});

test('The same game also starts from a domain root', {timeout:15000}, async () => {
  await withServer([], async base => {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + 'src/game.js')).status, 200);
  });
});
