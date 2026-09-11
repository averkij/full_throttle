import {lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VOICE_SAMPLES} from '../src/voice-samples.js';

export const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

// Only files named here can enter the public site. Add new game assets explicitly.
const modules = [
  'art', 'bunny-effects', 'bunny-quest', 'context-menu', 'debug-mode', 'engine', 'fullscreen', 'game', 'highlight',
  'intro', 'intro-score', 'inventory-cursor', 'narration', 'ru', 'scene-layout',
  'scenery-masks', 'voice-player', 'voice-samples', 'walk-cycle'
];
const artwork = [
  'bunny-props.png', 'proving-ground.png', 'proving-ground-open.png',
  'ben-walk.png', 'blackened-steel.png', 'cabinet.png', 'characters-v2.png',
  'favicon.png', 'forks.png', 'intro-highway.png', 'items-v2.png', 'radio.png',
  'scenes-corley-clean.png', 'scenes-yard-clean.png', 'scenes.png', 'vehicles-v2.png',
  'golos-text.ttf', 'GOLOS-LICENSE.txt', 'oswald-semibold.ttf', 'OSWALD-LICENSE.txt',
  'new-rocker-regular.woff2', 'NEW-ROCKER-LICENSE.txt'
];
const recordings = VOICE_SAMPLES.map(sample => {
  const name = sample.file.replace(/^\.\.\//, '');
  if (!/^assets\/voices\/[a-z0-9-]+\.wav$/.test(name)) {
    throw new Error(`Invalid recording path for ${sample.id}`);
  }
  return name;
});

export const SITE_FILES = Object.freeze([
  'index.html', 'style.css', 'intro.css', '.nojekyll',
  ...modules.map(name => `src/${name}.js`),
  ...artwork.map(name => `assets/${name}`),
  ...recordings
]);

export async function validateSiteFiles() {
  if (new Set(SITE_FILES).size !== SITE_FILES.length) throw new Error('Duplicate site file');
  for (const name of SITE_FILES) {
    const source = path.resolve(ROOT, name);
    if (!source.startsWith(ROOT + path.sep)) throw new Error(`Path outside the project: ${name}`);
    const [info, actual] = await Promise.all([lstat(source), realpath(source)]);
    if (!info.isFile() || info.isSymbolicLink() || !actual.startsWith(ROOT + path.sep)) {
      throw new Error(`Site files must be regular files inside the project: ${name}`);
    }
  }
}
