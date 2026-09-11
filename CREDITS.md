# Credits and asset provenance

Project by [averkij](https://github.com/averkij), developed with coding agents and generative image and speech tools.

## Inspiration

This is an unofficial fan adventure inspired by *Full Throttle*, originally developed by LucasArts. Ben, Mo, Ripburger, the setting, and the Full Throttle name refer to that work. The puzzle sequence and dialogue in this short adventure were authored for this project.

Full Throttle and its characters belong to their respective owners. This project is not affiliated with Lucasfilm, LucasArts, or Double Fine. The [official Full Throttle Remastered page](https://www.doublefine.com/games/full-throttle-remastered) describes the commercial game.

## Artwork and sound

- The background paintings, highway opening, interface texture, portraits, sprites, and walking frames were generated and prepared for this game. No original game asset files or screenshots are bundled.
- The electrical cabinet has separate closed, open, and powered states. The collectible fork is separate from the cleaned background, so taking it removes its visible image.
- All 236 Russian dialogue recordings were generated during development using Gemini 3.1 Flash TTS through OpenRouter. The browser plays the resulting local WAV files; it does not contact a synthesis provider.
- Character voices were kept consistent: Ben — Algenib, Mo — Kore, bartender — Puck, guard — Charon; terminal lines use Iapetus. These are synthetic performances, not recordings of the original cast.
- Music and effects are synthesized by the game's JavaScript. No commercial soundtrack files are included.

The image-generation tool did not expose a precise model identifier in the available development records. The public guide therefore describes the workflow without attributing those images to an unverified model version.

## Fonts

| Font | Use | Source | Bundled license |
| --- | --- | --- | --- |
| Golos Text | Russian dialogue and interface copy | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/golostext) | [SIL OFL](assets/GOLOS-LICENSE.txt) |
| Oswald | Condensed headings and buttons | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/oswald) | [SIL OFL](assets/OSWALD-LICENSE.txt) |
| New Rocker | Full Throttle opening title | [Google Fonts](https://fonts.google.com/specimen/New+Rocker) | [SIL OFL](assets/NEW-ROCKER-LICENSE.txt) |

All fonts are served locally. New Rocker's Latin WOFF2 was obtained from the [Google Fonts CSS endpoint](https://fonts.googleapis.com/css2?family=New+Rocker&display=swap).

Font licenses apply to their respective font files. This notice does not grant rights to the Full Throttle franchise or its characters.
