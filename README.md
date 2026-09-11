# Full Throttle: Байк обреченный

A Russian-language point-and-click fan adventure about a broken motorcycle, a missing gang, and a very bad deal.

Explore five illustrated locations as Ben, repair the bike, collect evidence, and expose Ripburger. This is a small, newly authored adventure inspired by *Full Throttle*, built through an iterative collaboration between a human and coding agents.

**[Play on GitHub Pages](https://averkij.github.io/full_throttle/)** · **[Build a similar game with agents](docs/BUILDING_WITH_AGENTS.md)** · **[Credits](CREDITS.md)**

![The game's illustrated desert highway](assets/intro-highway.png)

## The game

- Five locations, a complete puzzle chain, branching conversations, a journal, hints, and an ending.
- A Smashtorium toy-car puzzle and four toy bunnies to clear the factory minefield.
- Russian text and 236 prerecorded dialogue lines, with different voices for the characters.
- Illustrated backgrounds, transparent character and item sprites, an eight-frame walking animation, and object-shaped highlights.
- An opening cinematic, synthesized music and effects, and a New Rocker title from Google Fonts.
- Mouse, touch, keyboard, fullscreen, and reduced-motion support.
- Local autosave, save-file export/import, and a replay button for spoken lines.

The browser runs the game locally. It downloads static assets as needed and requires no account, backend, AI service, or API key. There is no service worker: reloading still needs access to the site's files.

## Run locally

Use **Node.js 22 or later**. There are no npm dependencies to install.

```sh
git clone https://github.com/averkij/full_throttle.git
cd full_throttle
npm run dev
```

Open **http://127.0.0.1:4173/**. Use HTTP instead of opening `index.html` directly, so modules, audio, and browser storage work normally.

```sh
npm test
npm run check
npm run build
npm run preview
```

The build creates `dist/` from an explicit list of game files. To preview the repository subpath used by GitHub Pages:

```sh
npm run preview -- --base /full_throttle/
```

Then open **http://127.0.0.1:4173/full_throttle/**. Stop the server with Ctrl+C before starting another on the same port.

## Play

| Input | Action |
| --- | --- |
| Click / tap | Walk or interact with an object |
| `1`, `2`, `3`, `4` | Look, use, talk, kick |
| Right-click / touch and hold | Open an object's action menu |
| Select an inventory item, then an object | Use the item |
| `M`, `J`, `H` | Map, journal, hint |
| `F` / the scene's fullscreen button | Toggle fullscreen |
| `Tab`, `Shift+Tab`, `Enter` | Navigate and activate controls |
| `Shift+F10` on a focused object | Open its action menu |
| `Escape` | Close a dialog, deselect an item, skip the intro, or exit fullscreen, depending on the current screen |

Stuck at the beginning? Try kicking the dumpster. The journal and hints can help with the rest. There are no timed puzzles or item-destroying wrong combinations.

Sound starts after a user action. A line plays automatically once per playthrough; the speaker button replays it. Settings include separate speech and reduced-motion controls.

Saves live in the current browser and site origin. To move from localhost to GitHub Pages, use **Меню → Экспорт сохранения**, then import that file on the other site. Renaming the game has not changed the original save keys.

## Deploy your copy on GitHub Pages

The included [workflow](.github/workflows/pages.yml) tests and builds pull requests, and deploys `main` pushes to Pages.

1. Open the repository on GitHub and select **Settings → Pages → Source → GitHub Actions**.
2. Push the prepared commits: `git push origin main`.
3. Open **Actions → Test and deploy game → deploy** and follow the deployment URL.

For this repository the address is **https://averkij.github.io/full_throttle/**. The play link becomes active after the first successful deployment. Forks use their owner's Pages address; update the play link above when forking.

The workflow uses GitHub's built-in deployment permissions. You do not need to create a personal access token or add speech/image service credentials. Only `dist/` is uploaded; source documentation, tests, and development tools stay in the repository. The build recreates `dist/` so old files cannot remain in the deployed output. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

If a deployment fails before publishing, check that Pages is set to **GitHub Actions** and that repository Actions are enabled. A missing font or scene after a successful deployment usually warrants checking the failed request's path and filename case; project Pages uses `/full_throttle/`, and its filenames are case-sensitive.

## Study the implementation

Start with the [agent-building guide](docs/BUILDING_WITH_AGENTS.md). It includes a project brief, staged prompts, architecture, asset workflows, practical lessons, and suggested research experiments.

| Area | Entry point |
| --- | --- |
| Quest rules, state, saves | [src/engine.js](src/engine.js) |
| UI, input, dialogue, game integration | [src/game.js](src/game.js) |
| Canvas rendering and generated artwork | [src/art.js](src/art.js) |
| Sprite placement and scene coordinates | [src/scene-layout.js](src/scene-layout.js) |
| Silhouette picking and highlights | [src/highlight.js](src/highlight.js), [src/scenery-masks.js](src/scenery-masks.js) |
| Walking animation | [src/walk-cycle.js](src/walk-cycle.js) |
| Opening cinematic | [src/intro.js](src/intro.js), [intro.css](intro.css) |
| Voice playback and final recording catalogue | [src/voice-player.js](src/voice-player.js), [src/voice-samples.js](src/voice-samples.js) |
| Russian localization | [src/ru.js](src/ru.js) |
| Complete playthrough and save tests | [tests/engine.test.mjs](tests/engine.test.mjs) |
| Public build and subpath checks | [tests/release.test.mjs](tests/release.test.mjs), [tests/server.test.mjs](tests/server.test.mjs) |
| Files allowed into the deployed game | [scripts/site-files.mjs](scripts/site-files.mjs) |

The public repository includes the finished assets and runtime tests. Image/speech generation tools, credentials, generation receipts, private conversation logs, and superseded voice comparisons are not included. You can run and study the complete game without them.

This is an executable case study for game developers, researchers, and LLM enthusiasts. The guide describes a practical process; it does not claim a controlled model benchmark or guarantee that another generation run will reproduce the same artwork.

## Credits

An unofficial fan project inspired by LucasArts' *Full Throttle*. Full Throttle and its characters belong to their respective owners; this project is not affiliated with Lucasfilm, LucasArts, or Double Fine. Artwork and speech were generated for this project; the repository does not redistribute original game files or recordings. Font licenses and asset provenance are listed in [CREDITS.md](CREDITS.md).
