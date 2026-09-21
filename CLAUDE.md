# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code reads it as CLAUDE.md, Codex and others as the AGENTS.md symlink) when working with code in this repository.

## Project Overview

Volleyball DJ V2 – a soundboard web app for DJing volleyball matches, built with React + TypeScript + Vite for Mac and iPad (Safari, installable as PWA). It is the TypeScript rewrite of V1 (`~/Volleyball DJ App`, GitHub `clahmann694/volleyball-dj-soundboard`).

The user speaks German; UI strings are German, code/comments/commits are English (comments may be German where they explain domain intent).

### Key Concept: Soundboard with Cue Points
The board is a fixed set of colour-coded **groups** (Scoring, Momentum, Timeouts & Breaks, Fun & Interaction, Game Events). Each group holds **pads** (buttons such as "Ace!", "Block!"). A pad holds 1..n **clips**; clicking a pad plays a random clip, clicking again stops it. Every clip has **cue points** (start/end in seconds) so any full-length song can be turned into a 25-second timeout clip without editing the file.

Two views:
- **DJ view** – the dashboard used during games: pads, side panel for multi-clip pads, transport bar (now playing, fade out, STOP, volume). Space = stop all.
- **Dev view** – setup: rename pads, add/remove pads, import audio files (file picker or drag & drop), set cue points in a waveform editor, export/import the whole setup as a `.vbdj` bundle.

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
- vite-plugin-pwa for the installable app shell

### Data flow
```
BoardContext  (groups → pads → clips, persisted to localStorage)
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
├── types/index.ts            # CuePoint, SoundClip, SoundPad, SoundGroup, BoardConfig
├── config/defaultBoard.ts    # the 23 pads from V1 (no audio – imported by the user)
├── storage/
│   ├── audioStore.ts         # IndexedDB wrapper + persistence/quota helpers
│   └── boardStore.ts         # localStorage load/save
├── contexts/
│   ├── AudioContext.tsx      # play(padId, clip, cueOverride?), stopAll, fadeOut, volume
│   └── BoardContext.tsx      # CRUD for pads/clips, addClipsFromFiles, export/import/reset
├── components/
│   ├── Header.tsx            # title + DJ/Dev toggle
│   ├── dj/                   # DjView, SoundBoard, SoundGroupSection, SoundPad, ClipPanel, TransportBar
│   └── dev/                  # DeveloperView, GroupEditor, PadCard, ClipRow, CuePointEditor, Waveform, BundleControls
├── utils/                    # audioFormat (mime/ext, duration), bundle (zip), waveform (peaks), formatTime, id
└── App.tsx                   # providers, view state, keyboard shortcuts (Space, Escape)
```

## Development Guidelines

### Audio
- All playback goes through `AudioContext` – never instantiate `Howl` elsewhere.
- Blob URLs have no extension, so `format` must be passed to Howler (`howlerFormat()`).
- A clip with `cue.end === null` plays to the end of the file; `clip.duration` is read at import (`readDuration`) and refined by the cue editor (`decodeAudioData`).
- Keep playback exclusive: starting a clip tears down the previous Howl (`teardown()` calls `off()` first so no stale events fire).

### Storage
- Audio files are per device (IndexedDB). Never assume a `fileId` has a blob – handle "missing" gracefully (`play()` shows an error toast).
- Deleting a clip/pad deletes its blob; import/reset call `deleteOrphanFiles`.
- On iPad the app must be added to the home screen, otherwise Safari may evict site data after 7 days without use.

### UI / Corporate Design
- Colours follow the club CI of **VSG Kleinsteinbach** (defined as `vsg.*` in `tailwind.config.js`, sampled from the club logo and the club's "Getränkelager" app): cyan `#009fe3` (logo, active states), blue `#0089c8` (primary buttons), navy `#0d283a → #07101a` (background, like the club splash screen), ice `#9bc3de` (secondary text), red `#e95055`, green `#16a94f`. Dark theme only – decided 2026-09-21 (less glare in the gym).
- The five **group colours stay functional** (pink/orange/green/purple/blue) so the DJ can hit the right row instantly; only chrome (header, buttons, panels, STOP) uses CI colours. Don't recolour groups to cyan.
- Logo sources live in `assets/brand/` (`vsg-logo-cyan.png` = filled shield, `vsg-logo-outline.png`; not deployed). Only `public/brand/vsg-logo-96.png` (header) and the icons ship with the app. App icons are PNGs generated from the filled logo on white (`sips`), matching the club app's icon. Reference them via `import.meta.env.BASE_URL` (GitHub Pages sub-path).
- Group colour is passed as CSS variable `--g`; the `.group-card`, `.pad`, `.badge-num` component classes in `index.css` use `color-mix()` with it. Tailwind utilities for everything else.
- The DJ view must fit without scrolling on iPad landscape (1024×768): keep the compact `@media (max-height: 820px)` rules working when changing pad/group sizes.
- Touch targets ≥ 44px in the DJ view; the STOP button must always be visible (no spacebar on iPad).

### Testing changes
There are no unit tests. Verify in a browser: `npm run dev -- --no-open`, then drive Chrome headless with playwright-core (`channel: 'chrome'`) – import a test file, set a cue, play from the DJ view, reload, check `console` errors. Test tones can be generated with Python's `wave` module and converted with `afconvert`.

## Roadmap
- **Done (Phase 1):** soundboard, cue editor, local import to IndexedDB, bundle export/import, PWA shell.
- **Next:** Tauri desktop build reading a folder from disk (swap `audioStore` behind the same interface), group editing (rename/colour/add), clip reordering, preloading for lower start latency, keyboard shortcuts per pad.
- **Later:** waveform in DJ view, timers (auto-stop after X s), Spotify (needs Premium + online).
