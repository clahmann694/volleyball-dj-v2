# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code reads it as CLAUDE.md, Codex and others as the AGENTS.md symlink) when working with code in this repository.

## Project Overview

Volleyball DJ V2 – a soundboard web app for DJing volleyball matches, built with React + TypeScript + Vite for Mac and iPad (Safari, installable as PWA). It is the TypeScript rewrite of V1 (`~/Volleyball DJ App`, GitHub `clahmann694/volleyball-dj-soundboard`).

The user speaks German; UI strings are German, code/comments/commits are English (comments may be German where they explain domain intent).

### Key Concept: Soundboard with Cue Points
The board is a list of **rows**, each holding any number of **pads** (buttons such as "Ass!", "Block!", "krasser Angriff"). Pads in a row share the width equally, so a row with one pad is one full-width button and a row with four is four quarter-width buttons – the user arranges this freely in the Dev view (requested 2026-09-21; before that: v2 flat grid, v1 fixed categories – both migrated in `boardStore.migrateBoard`, v2 → rows of 6 to preserve the iPad layout). Each pad has one of six **colours** (`PAD_COLORS`) and 1..n **clips**; clicking a pad plays a random clip, clicking again stops it. Every clip has **cue points** (start/end in seconds) so any full-length song can be turned into a 25-second timeout clip without editing the file.

Two views:
- **DJ view** – the dashboard used during games: 3D arcade-style pads (CSS only: `.pad3d` base + `.pad3d__cap`), side panel for multi-clip pads, transport bar (now playing, fade out, STOP, volume). Space = stop all.
- **Dev view** – setup: layout preview, one section per row (⇡ ⇣ reorder rows, "Zeile auflösen" merges pads into the row above, "＋ Neue Zeile"), pads move ← → within a row and ↑ ↓ to the end of the neighbouring row (↓ on the last row creates a new row; a row emptied by a move disappears), rename/recolour, import audio (file picker or drag & drop), cue editor, `.vbdj` export/import.

## Development Commands

```bash
npm install
npm run dev          # Vite dev server on http://localhost:3000 (--no-open to skip browser)
npm run build        # tsc + vite build (+ PWA service worker)
npm run type-check   # tsc --noEmit (strict, noUnusedLocals)
```

## Architecture

### Tech Stack
- React 19 + TypeScript (strict), Vite 7, Tailwind CSS 3.4
- Howler.js for playback (`html5: true`, blob URLs, cue points as Howler **sprites**)
- IndexedDB for audio blobs, localStorage for board config, JSZip for bundles
- vite-plugin-pwa for the installable app shell (registration in `src/registerServiceWorker.ts`, `injectRegister: null`)
- WebCodecs `AudioEncoder` + `mp4-muxer` to keep only the audio track of imported videos

### Data flow
```
BoardContext  (rows → pads → clips, persisted to localStorage; v1/v2 migrated on load)
     │  fileId
     ▼
audioStore    (IndexedDB "vbdj-v2" / store "files": {id, blob, name, type})
     │  blob → object URL
     ▼
AudioContext  (one Howl at a time; exclusive playback; sprite = [start, end-start])
```

### Source layout
```
src/
├── types/index.ts            # CuePoint, SoundClip, SoundPad, BoardRow, BoardConfig (version 3), allPads()
├── config/defaultBoard.ts    # PAD_COLORS, padTextColor(), the 23 default pads (no audio)
├── storage/
│   ├── audioStore.ts         # IndexedDB wrapper + persistence/quota helpers
│   └── boardStore.ts         # localStorage load/save, migrateBoard (v1 groups / v2 flat → v3 rows), export-reminder keys
├── contexts/
│   ├── AudioContext.tsx      # play(padId, clip, cueOverride?), stopAll, fadeOut, volume
│   └── BoardContext.tsx      # rows (add/move/delete), pads (add/update/movePad left|right|up|down/delete), clips, export/import/reset
├── components/
│   ├── Header.tsx            # title + DJ/Dev toggle
│   ├── dj/                   # DjView, SoundBoard (rows), SoundPad (3D button), ClipPanel, TransportBar
│   └── dev/                  # DeveloperView, PadCard, ColorSwatches, ClipRow, CuePointEditor, Waveform, BundleControls
├── utils/                    # audioFormat (mime/ext, duration), audioTranscode (video → AAC/M4A), bundle (zip), waveform (peaks), formatTime, id
└── App.tsx                   # providers, view state, keyboard shortcuts (Space, Escape)
```

## Development Guidelines

### Audio
- All playback goes through `AudioContext` – never instantiate `Howl` elsewhere.
- Blob URLs have no extension, so `format` must be passed to Howler (`howlerFormat()`).
- **Video files are accepted** (mp4/mov/m4v/webm) because the user downloads Instagram reels with a downloader app. `accept` includes `video/*` types so the iPad file picker offers the Photos library.
- **Import strips video and compresses lossless audio** (`utils/audioTranscode.ts`, decided 2026-09-21 to save storage: an SD reel is ~3.5 MB, its audio 0.45 MB; HD reels 25 MB). Pipeline: `decodeAudioData` → WebCodecs `AudioEncoder` (AAC-LC 128 kbit/s, `bitrateMode: 'constant'`) → `mp4-muxer` → `.m4a`. `shouldCompress()` decides (video, wav/aiff/flac, or > 256 kbit/s); mp3/m4a/ogg are stored untouched. If `AudioEncoder` is missing or fails, the original file is stored – never block an import.
- **Gotcha (cost half a day of debugging – don't regress):** browsers disagree about `EncodedAudioChunkMetadata.decoderConfig.description`. Chrome gives the 2-byte AudioSpecificConfig, **Safari gives a full ES_Descriptor (starts `03 80 80 80`)**. Feeding Safari's to mp4-muxer double-wraps the esds and Safari then refuses its own file (MediaError code 4, ffprobe: "Audio object type 0"). We therefore build the ASC ourselves (`audioSpecificConfig()`) and ignore browser metadata. Safari also defaults to VBR (file 4× smaller for tones) – hence `bitrateMode: 'constant'`.
- AAC adds ~44 ms encoder priming at the start (measured: tone at 5.000 s lands at 5.044 s). Irrelevant because cue points are set on the transcoded file, but don't "fix" it by trimming.
- Testing real Safari: Playwright can't drive it, but a tiny node server + `open -a Safari http://localhost:PORT` + `fetch('/result', {method:'POST'})` works; the module can be imported straight from the Vite dev server (`http://localhost:3000/src/utils/x.ts`, CORS allows localhost origins).
- A clip with `cue.end === null` plays to the end of the file; `clip.duration` is read at import (`readDuration`) and refined by the cue editor (`decodeAudioData`).
- Keep playback exclusive: starting a clip tears down the previous Howl (`teardown()` calls `off()` first so no stale events fire).

### Storage – the user's data lives ONLY in her browsers
The user has real sounds and cue points in Safari on her MacBook and iPhone/iPad, stored per origin
(`clahmann694.github.io`). Nothing on the dev server (`localhost:3000`, a different origin) or in headless-Chrome
tests can touch that. What CAN destroy her data – never do these without an explicit, separate confirmation:
- renaming the IndexedDB (`vbdj-v2` / store `files`), the localStorage keys (`vbdj-v2-board`, `vbdj-v2-last-export`,
  `vbdj-v2-last-change`), or the GitHub Pages URL/repo name (new origin = empty storage from the app's view);
- a data-model bump without a tested `migrateBoard` path (test with a real fixture of the previous version; the
  loader writes `vbdj-v2-board.backup-v<N>-<date>` before migrating – keep that);
- "Zurücksetzen" and bundle import replace everything on that device (both `window.confirm`).
The Dev view shows an export-reminder (amber when changed since last export); the `.vbdj` export is her only
backup – keep export/import backwards compatible.

- Audio files are per device (IndexedDB). Never assume a `fileId` has a blob – handle "missing" gracefully (`play()` shows an error toast).
- Deleting a clip/pad deletes its blob; import/reset call `deleteOrphanFiles`.
- The bundle import `<input type=file>` has **no `accept` attribute on purpose**: iOS maps `accept` extensions to UTIs and greys out files with unknown extensions such as `.vbdj` in the picker (found on the user's iPhone 2026-09-21). Validate after reading instead. Don't rename bundles to `.zip` either – Safari on macOS auto-expands "safe" downloads and the user loses the file.
- On iPad the app must be added to the home screen, otherwise Safari may evict site data after 7 days without use.

### UI / Corporate Design
- Colours follow the club CI of **VSG Kleinsteinbach** (defined as `vsg.*` in `tailwind.config.js`, sampled from the club logo and the club's "Getränkelager" app): cyan `#009fe3` (logo, active states), blue `#0089c8` (primary buttons), navy `#0d283a → #07101a` (background, like the club splash screen), ice `#9bc3de` (secondary text), red `#e95055`, green `#16a94f`. Dark theme only – decided 2026-09-21 (less glare in the gym).
- Pads use the six **arcade colours** from the user's reference renders (`PAD_COLORS`: red `#e00000`, orange `#fb6203`, yellow `#fedc05`, green `#10cc1c`, blue `#0a45f8`, purple `#8f0af0`); `padTextColor()` picks dark text on yellow. Only chrome (header, buttons, panels, STOP) uses CI colours. Don't recolour pads to cyan.
- Logo sources live in `assets/brand/` (`vsg-logo-cyan.png` = filled shield, `vsg-logo-outline.png`; not deployed). Only `public/brand/vsg-logo-96.png` (header) and the icons ship with the app. App icons are PNGs generated from the filled logo on white (`sips`), matching the club app's icon. Reference them via `import.meta.env.BASE_URL` (GitHub Pages sub-path).
- Pad colour is passed as CSS variable `--c` (text colour `--t`) on `.pad-wrap`; `.pad3d*` and `.badge-num` in `index.css` derive every shade with `color-mix()`. Defaults for `--c/--t` live on `.pad-wrap`, never on `.pad3d` (they would override the inline values). Tailwind utilities for everything else.
- **Never use percentage padding on the vertical axis of `.pad3d__cap`** – percentages resolve against the element's *width*, so a full-width pad (one pad per row) got 60 px top/bottom padding and the label collapsed to 0 px (found 2026-09-21). Vertical padding is in px, horizontal may stay in %; the cap uses `display: grid; place-content: center` so the label keeps its intrinsic height.
- Pad labels must survive long German words ("Trommelwirbel", "krasser Angriff"): 2-line clamp, `hyphens: auto` (index.html has `lang="de"`), font size in `cqw` via `container-type: inline-size` on `.pad-wrap`.
- DJ layout: `.board-rows` is a flex column, each `.board-row` is `flex: 1 1 0` (min 84px, max 190px) and its pads `flex: 1 1 0` – no aspect ratio, pads fill the row. Empty rows are hidden in the DJ view. With ≤ 5 rows everything fits on iPad landscape; more rows scroll. Don't make rows shorter than 72px – pads are tapped in a hurry.
- Touch targets ≥ 44px in the DJ view; the STOP button must always be visible (no spacebar on iPad).

### Deployment / service worker
- **A deploy does not reach an open browser by itself.** The precaching service worker serves the cached build; measured with two real builds on 2026-09-21, the user needed **two** reloads to see a new version – once to install the new worker, once to be served by it. That is what made her believe a feature was missing.
- `registerServiceWorker()` therefore reloads the page once on `controllerchange`, guarded by `navigator.serviceWorker.controller` having existed before (so a first visit never reloads). Verified: one user reload picks up the new build, no reload loop, first visit reloads zero times.
- **Deliberately no periodic `registration.update()`**: a reload during a match would cut the music. Updates are only checked when the page is opened.
- The Dev view prints the build timestamp (`__BUILD_TIME__`, defined in `vite.config.ts`) – ask the user for it when a feature "is missing".
- To test caching behaviour: build twice into two folders, serve them with a tiny node server that reads the current folder from a file, swap the file, and drive Chrome (see scratchpad `swtest/`). Waiting 1.5 s after a reload is too short – the worker needs a few seconds to install.

### Testing changes
There are no unit tests. Verify in a browser: `npm run dev -- --no-open`, then drive Chrome headless with playwright-core (`channel: 'chrome'`) – import a test file, set a cue, play from the DJ view, reload, check `console` errors. Test tones can be generated with Python's `wave` module and converted with `afconvert`.

## Roadmap
- **Done (Phase 1):** soundboard, cue editor, local import to IndexedDB, bundle export/import, PWA shell.
- **Next:** Tauri desktop build reading a folder from disk (swap `audioStore` behind the same interface), group editing (rename/colour/add), clip reordering, preloading for lower start latency, keyboard shortcuts per pad.
- **Later:** waveform in DJ view, timers (auto-stop after X s), Spotify (needs Premium + online).
