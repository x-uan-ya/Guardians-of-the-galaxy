# How to Play video: recording tools

The video on the How to Play page (`public/tutorial/how-to-play.webm`) is not a
screen recording made by hand. A script plays the real game, adds captions, a
cursor and highlights, records the screen and encodes it to WebM. That means it
can be re-made whenever the game's screens change.

These tools are **not part of the app**: they have their own `package.json`, are
never imported by `src/`, and are not installed by the root `npm install`.

## When to re-record

Re-record after you change the screens the video shows: Mission Select, character
setup, the dashboard (bunker, supplies, Mission Tablet), emergencies, routine
actions, the Log tab or the Badges page.

The script finds buttons by their visible text (for example "Confirm Mission",
"Launch Run", "Ask Mission Controller", "End Sol", "Badges"). If you rename one,
update the matching text in `record.mjs`.

## Steps

You need Node 18+ and Google Chrome (or Chromium).

```bash
# 1. Start the game in another terminal (from the project root)
npm run dev                        # http://localhost:5173/

# 2. Install the tools (once)
cd tools/tutorial-video
npm install

# 3. Record, encode, check
npm run record                     # plays the game, writes out/frames + out/marks.json
npm run encode -- 500000 24        # bitrate (bits/s) and frames per second
npm run verify                     # plays the result in Chrome: length, seeking, frames
```

Then publish it:

1. Copy `out/how-to-play.webm` and `out/poster.jpg` into `public/tutorial/`.
2. Copy the chapter start times from `out/marks.json` into
   `src/features/how-to-play/tutorialChapters.ts` (and edit the chapter text if
   the captions changed).

`out/` is git-ignored. A good result is about 2 minutes and under 10 MB.

## Settings

| Variable | Default | Use |
| --- | --- | --- |
| `CHROME_PATH` | `C:\Program Files\Google\Chrome\Application\chrome.exe` | Path to Chrome/Chromium (set it on macOS/Linux) |
| `GAME_URL` | `http://localhost:5173/` | Where the game is running |

The recording uses a throw-away demo account in the browser's local storage; it
does not touch your own saved games.

## How it works

- `record.mjs` drives Chrome with Puppeteer and records the page with Chrome's
  screencast. Captions, the highlight ring, the cursor and title cards are
  drawn into the page itself, so they end up in the video.
- `encode.mjs` + `enc.html` rebuild a smooth video from the recorded frames with
  the browser's WebCodecs encoder (VP9, falling back to VP8) and `webm-muxer`.
  Keyframes are spaced 6 seconds apart to keep the file small.
- `verify.mjs` loads the finished file in Chrome and checks it has a duration,
  is fully seekable and plays forward.
