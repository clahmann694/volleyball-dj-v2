# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code reads it as CLAUDE.md, Codex and others as the AGENTS.md symlink) when working with code in this repository.

## Project Overview

Volleyball DJ V2 – a soundboard web app for DJing volleyball matches, built with React + TypeScript + Vite for Mac and iPad (Safari, installable as PWA). It is the TypeScript rewrite of V1 (`~/Volleyball DJ App`, GitHub `clahmann694/volleyball-dj-soundboard`).

The user speaks German; UI strings are German, code/comments/commits are English (comments may be German where they explain domain intent).

### Key Concept: Soundboard with Cue Points
The board is a list of **rows**, each holding any number of **pads** (buttons such as "Ass!", "Block!", "krasser Angriff"). **All pads are the same width** (`--pad-w`); a row never stretches its pads, and a row holding more pads than fit wraps onto the next line (explicitly requested 2026-09-21 – an earlier version stretched pads to fill the row and she rejected it). Rows are the explicit grouping: they force a line break. Arranged by **dragging with the mouse** in the Dev view (v2 flat grid and v1 categories are migrated in `boardStore.migrateBoard`, v2 → rows of 6). Each pad has one of six **colours** (`PAD_COLORS`), an optional one-line **description** shown in small print under the label ("z.B. kurzer Aufschlag, Lob" – so every helper knows which situation a button is for; `.pad3d__desc`, 2-line clamp) and 1..n **clips**; clicking a pad plays a random clip, clicking again stops it. Every clip has **cue points** (start/end in seconds) so any full-length song can be turned into a 25-second timeout clip without editing the file.

**Teams:** the app is used for two teams (`TEAMS` in `src/config/teams.ts`: Herren 1, Damen 1). On every start it asks which one (`TeamPicker`); the DJ view then only shows pads assigned to that team, and rows that end up empty are hidden. A pad carries `teams: TeamId[]` and belongs to one or both – never zero (`setPadTeams` refuses an empty list). The choice is deliberately **asked on every load**, only pre-selected from `vbdj-v2-last-team`: going into a match with the wrong team's buttons is worse than one tap. Switching later: the team chip in the header.

**Playback per pad** (`playback`): `single` = one random clip, then silence (jingles); `loop` = one clip repeats seamlessly until STOP (short clips); `sequence` = all clips in order, looping (warm-up playlist); `shuffle` = endless random order without immediate repeats. **Variety is enforced with a per-pad history, across presses and auto-advance alike**: `AudioContext` keeps the recently started clip ids per pad (`recentClipsOf`, oldest first, capped at 64), and `randomClip(clips, recent)` excludes the youngest `excludeCount(n) = min(n−1, ⌈n/2⌉)` of them – 2 songs alternate, 3 songs cycle through all three, 20 songs never return within 10 presses. Only excluding the last one was not enough (she got A B A on a three-song pad and repeats after 3–4 presses on a 20-song pad, 2026-09-25). If the history names clips that no longer exist and empties the pool, it falls back to all clips. Property-tested in block 10 (`minAbstand` per n). `loop` is handled by Howler itself (`loop: true`, or the third element of the sprite array for a cue range) – restarting the clip from `onend` would leave an audible ~0.2 s gap. **Howler fires `end` on every loop iteration**, so the `onend` handler must return early while looping or it tears the sound down after the first pass. Auto-advance lives in `DjView` (subscribes to `AudioContext.subscribeEnded`, which only fires on natural end – never on STOP/fade). Each clip has a `gain` (0..1) multiplied with the master volume; the cue editor measures the region's RMS level in dBFS and "Angleichen" sets gain to reach `TARGET_DB` (−18) – quieter clips stay at 100 % because Howler cannot boost above 1. Pause/resume keeps the Howler sound id (`soundIdRef`) and calls `play(id)`, which also respects the sprite end. `useWakeLock` keeps the screen on while a team is chosen and the DJ view is open.

**The app always starts in the DJ view** (2026-09-25). It used to restore the last open view from `vbdj-v2-view`; whoever had left it in Dev landed there on the next load without any question – she noticed this right after the password lock shipped. Same reasoning as asking for the team on every start. The key is no longer read or written.

Switching **DJ → Dev asks for confirmation** (`ConfirmDevDialog`, focus on "Abbrechen", Escape cancels) because the Dev view can change and delete everything – requested 2026-09-21 so nobody lands there by accident during a match. Dev → DJ needs no confirmation.

**Password lock on the Dev view – built into the app** (`utils/devLock.ts`, `DevLockDialog`, `dev/DevLockSettings`, `scripts/set-dev-password.mjs`; requested 2026-09-25: "if I send someone the GitHub link they may only look at DJ"). The salt + SHA-256 hash live in `src/config/devLock.json` (committed – the repo is public, which is exactly why only a hash is stored) and are compiled in, so the lock applies on **every device that opens the URL**. `npm run set-password` (interactive, hidden input; `--password X --hint Y` for scripts; `--clear` removes the lock) rewrites that file – then commit and deploy. Once a device has entered the password correctly it remembers that in `vbdj-v2-dev-unlocked` (stores the *hash*, so a new password re-locks every device); from then on DJ → Dev shows only `ConfirmDevDialog` again. The restored view on load also checks this – a stored `vbdj-v2-view = dev` must not skip the lock. "Dieses Gerät wieder sperren" in the Dev view clears the marker (before handing over the iPad). **Deliberately no escape hatch in the dialog** (after three wrong attempts it only says the password can't be changed here) – an in-app reset would let any visitor click past the lock; she changes it in the project. **It is a deterrent, not security** – the app has no server, anyone with dev tools can set the marker; the UI says so. Also worth repeating to her: nobody who opens the link can touch *her* data anyway – every visitor gets their own empty copy in their own browser. The tests don't know the real password: `tests/run.mjs` spawns Vite with `VITE_DEV_LOCK_SALT/HASH/HINT` for a test password (same hash construction as the script), block 1b marks the device unlocked, block 10b tests the fresh-device path (lock screen, wrong passwords, no bypass, marker survives reload, re-lock).

Two views:
- **DJ view** – the dashboard used during games: 3D arcade-style pads (CSS only: `.pad3d` base + `.pad3d__cap`), side panel for multi-clip pads, transport bar (now playing, fade out, STOP, volume). Space = stop all.
- **Dev view** – setup: a team switch (Beide / Herren 1 / Damen 1), a full-width **arrangement editor** (`LayoutEditor`) where pads are dragged into place, plus one settings card per pad (name, colour, team chips, sounds, cue) and `.vbdj` export/import. Per-pad arrow buttons were removed – she found them cumbersome.

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
- IndexedDB for audio blobs, localStorage for board config, JSZip for bundles (lazy-loaded – Dev view only; same for mp4-muxer, keeps the DJ bundle at ~290 kB)
- vite-plugin-pwa for the installable app shell (registration in `src/registerServiceWorker.ts`, `injectRegister: null`)
- WebCodecs `AudioEncoder` + `mp4-muxer` to keep only the audio track of imported videos

### Data flow
```
BoardContext  (rows → pads → clips, persisted to localStorage; v1–v3 migrated on load)
TeamContext   (which team is playing; null → TeamPicker blocks the app)
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
├── types/index.ts            # CuePoint, SoundClip, SoundPad, TeamId, BoardRow, BoardConfig (version 4), allPads(), padsForTeam()
├── config/teams.ts           # TEAMS (Herren 1 / Damen 1), ALL_TEAM_IDS
├── config/defaultBoard.ts    # PAD_COLORS, padTextColor(), the 23 default pads (no audio)
├── storage/
│   ├── audioStore.ts         # IndexedDB wrapper + persistence/quota helpers
│   └── boardStore.ts         # localStorage load/save, migrateBoard (v1 groups / v2 flat / v3 rows → v4 with teams), export-reminder keys
├── contexts/
│   ├── AudioContext.tsx      # play(padId, clip, cueOverride?), stopAll, fadeOut, volume
│   └── BoardContext.tsx      # rows (add/move/delete), pads (add/update/movePad left|right|up|down/delete), clips, export/import/reset
├── components/
│   ├── Header.tsx            # title, team chip (click = switch), DJ/Dev toggle
│   ├── TeamPicker.tsx        # start question "Für wen legst du auf?"
│   ├── ConfirmDevDialog.tsx  # "Wirklich zur Entwickler-Ansicht?"
│   ├── dj/                   # DjView, SoundBoard (rows), SoundPad (3D button), ClipPanel, TransportBar
│   └── dev/                  # DeveloperView, LayoutEditor (drag & drop), PadCard, ColorSwatches, ClipRow, CuePointEditor, Waveform, BundleControls
├── hooks/useWakeLock.ts      # screen stays on during the match
├── utils/devLock.ts          # built-in Dev password (hash from src/config/devLock.json, env override for tests)
├── config/devLock.json       # salt + hash of the Dev password – set via `npm run set-password`, never the plaintext
├── utils/                    # audioFormat, audioTranscode (video → AAC/M4A), mp4Demux (lossless AAC extraction), bundle (zip, lazy JSZip), waveform (peaks + RMS level), playback (first/next/random clip), formatTime, id
└── tests/ (repo root)        # run.mjs (e2e suite, `npm test`), fixtures.mjs (WAV generator)
└── App.tsx                   # providers, view state, keyboard shortcuts (Space, Escape)
```

## Development Guidelines

### Audio
- All playback goes through `AudioContext` – never instantiate `Howl` elsewhere.
- Blob URLs have no extension, so `format` must be passed to Howler (`howlerFormat()`).
- **Video files are accepted** (mp4/mov/m4v/webm) because the user downloads Instagram reels with a downloader app. `accept` includes `video/*` types so the iPad file picker offers the Photos library.
- **Import strips video and compresses lossless audio** (`utils/audioTranscode.ts`). For videos the AAC track is first **copied bit-for-bit** (`remuxAudioTrack` → `utils/mp4Demux.ts`, a minimal moov/stbl parser feeding `mp4-muxer.addAudioChunkRaw`): verified on the user's 29 real reels – md5 of the raw AAC stream equals ffmpeg's `-c:a copy` with `-ignore_editlist 1`. The output ignores the source edit list (typically `media_time` 512–1024 samples of encoder priming, ≤ 23 ms of near-silence at the start) – accepted, not a quality issue. Handles both layouts of the audio sample description: ISO MP4 uses version 0 (child boxes at +28, `esds` directly), **QuickTime/iOS `.mov` uses version 1** (+16 extra bytes, `esds` nested in a `wave` box) – screen recordings are `.mov`, so this path matters (fixed 2026-09-22, covered by an ffmpeg-gated test). Sample rate and channel count come from the AudioSpecificConfig, not the container. Fragmented MP4s (`moof`), non-AAC audio or anything unexpected return null and fall back to re-encoding. The re-encode pipeline (`transcodeToAac`: `decodeAudioData` → WebCodecs `AudioEncoder`, AAC-LC 128 kbit/s, `bitrateMode: 'constant'` → `mp4-muxer`) remains for WAV/AIFF/FLAC and exotic videos. `shouldCompress()` decides: video and wav/aiff/flac are converted; **mp3/m4a/aac/ogg/opus are never re-encoded regardless of bitrate** (a 320 kbit/s MP3 or iTunes 256k AAC must stay byte-identical – an earlier > 256 kbit/s heuristic wrongly downsampled those, fixed 2026-09-21); the bitrate safety net (> 400 kbit/s) only applies to unknown formats. The user asked explicitly whether import degrades quality – the answer must stay "no for compressed files". If `AudioEncoder` is missing or fails, the original file is stored – never block an import.
- A clip can be **copied to another pad** (`copyClipToPad`) – the copy keeps the same `fileId`, so the audio exists once in IndexedDB. Therefore `deleteClip`, `deletePad` and `replaceClipFile` only delete a blob when `filesUsedElsewhere()` says nobody else references it, and the bundle writes each `fileId` once. **Never go back to unconditional `deleteFile` on a clip** – it would silently break every copy.
- The clip order only matters in `sequence` mode, so the ↑ ↓ buttons are **only rendered for that mode** – she asked for them to go because her pads play randomly.
- **"⟲ Ersetzen" on a clip row replaces the audio file** (`replaceClipFile`: same `prepareFile` path as import, new blob, old blob deleted) while keeping name, cue points and gain – added so she could re-import reels losslessly without redoing her cue points. A cue end beyond the new duration is reset to "bis Ende".
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
  `vbdj-v2-last-change`; `vbdj-v2-dev-unlocked` only remembers that the Dev password was entered on this device), or the GitHub Pages URL/repo name (new origin = empty storage from the app's view);
- a data-model bump without a tested `migrateBoard` path (test with a real fixture of the previous version; the
  loader writes `vbdj-v2-board.backup-v<N>-<date>` before migrating – keep that);
- "Zurücksetzen" and bundle import replace everything on that device (both `window.confirm`).
The Dev view shows an export-reminder (amber when changed since last export); the `.vbdj` export is her only
backup – keep export/import backwards compatible.
With no sounds anywhere, the **Dev view shows `EmptyState` instead of the editor**: just "load a setup (.vbdj)" and
"show the buttons". 23 empty default pads plus every setting were confusing on a fresh device (her words, 2026-09-23).
`showBoard` is local state, so the editor is one click away and the empty state returns after a reload while still empty.
A device with no sounds at all gets a banner in the DJ view explaining that sounds are per device and how to
transfer a bundle (she once AirDropped the *link* to the iPad and thought the app had lost her buttons – 2026-09-21).
**Updates are only picked up on page load.** A tab open for hours stays on its build; that is intended (no periodic
`update()` – it would reload mid-match and the new worker would evict the old lazy chunks). Lazy imports therefore
catch failures: `bundle.ts` throws a "bitte neu laden" error, `audioTranscode.ts` falls back to storing the original.

- Audio files are per device (IndexedDB). Never assume a `fileId` has a blob – handle "missing" gracefully (`play()` shows an error toast).
- Deleting a clip/pad deletes its blob; import/reset call `deleteOrphanFiles`.
- **Bundle import must stay reachable without the Dev password** (`components/ImportBundleButton.tsx`, requested 2026-09-25: "the app must be usable without the password"). It is rendered in the DJ view's no-sounds banner, on the `TeamPicker` start screen (subtle link – the natural setup moment, seen on every start) and in the Dev `EmptyState`; `BundleControls` keeps its own handler with the flash messages. The shared button asks `window.confirm` only when the device already has sounds. Don't move import back behind the lock.
- The bundle import `<input type=file>` has **no `accept` attribute on purpose**: iOS maps `accept` extensions to UTIs and greys out files with unknown extensions such as `.vbdj` in the picker (found on the user's iPhone 2026-09-21). Validate after reading instead. Don't rename bundles to `.zip` either – Safari on macOS auto-expands "safe" downloads and the user loses the file.
- On iPad the app must be added to the home screen, otherwise Safari may evict site data after 7 days without use.

### UI / Corporate Design
- Colours follow the club CI of **VSG Kleinsteinbach** (defined as `vsg.*` in `tailwind.config.js`, sampled from the club logo and the club's "Getränkelager" app): cyan `#009fe3` (logo, active states), blue `#0089c8` (primary buttons), navy `#0d283a → #07101a` (background, like the club splash screen), ice `#9bc3de` (secondary text), red `#e95055`, green `#16a94f`. Dark theme only – decided 2026-09-21 (less glare in the gym).
- Pads use the seven **arcade colours** from the user's reference renders (`PAD_COLORS`: red `#e00000`, orange `#fb6203`, yellow `#fedc05`, green `#10cc1c`, light blue `#0093d8`, blue `#0a45f8`, purple `#8f0af0`); `padTextColor()` picks dark text on yellow. Only chrome (header, buttons, panels, STOP) uses CI colours. Don't recolour pads to cyan.
- Logo sources live in `assets/brand/` (`vsg-logo-cyan.png` = filled shield, `vsg-logo-outline.png`; not deployed). Only `public/brand/vsg-logo-96.png` (header) and the icons ship with the app. App icons are PNGs generated from the filled logo on white (`sips`), matching the club app's icon. Reference them via `import.meta.env.BASE_URL` (GitHub Pages sub-path).
- Pad colour is passed as CSS variable `--c` (text colour `--t`) on `.pad-wrap`; `.pad3d*` and `.badge-num` in `index.css` derive every shade with `color-mix()`. Defaults for `--c/--t` live on `.pad-wrap`, never on `.pad3d` (they would override the inline values). Tailwind utilities for everything else.
- **Never use percentage padding on the vertical axis of `.pad3d__cap`** – percentages resolve against the element's *width*, so a full-width pad (one pad per row) got 60 px top/bottom padding and the label collapsed to 0 px (found 2026-09-21). Vertical padding is in px, horizontal may stay in %; the cap uses `display: grid; place-content: center` so the label keeps its intrinsic height.
- Pad labels must survive long German words ("Trommelwirbel", "krasser Angriff"): 2-line clamp, `hyphens: auto` (index.html has `lang="de"`), font size in `cqw` via `container-type: inline-size` on `.pad-wrap`.
- DJ layout: `.board-rows` sets `--pad-w: clamp(140px, 14vw, 190px)`; `.board-row` is `flex-wrap: wrap` and `.pad-wrap` has that fixed width with `aspect-ratio: 3/2`. **Never give pads `flex: 1`** – equal width is a requirement, not a detail. Empty rows are hidden in the DJ view. On iPad landscape ~6 pads per line.
- `.pad3d--paused` (on top of `--active`) switches the pulse off; paused pads stay marked active because the sound will resume.
- The arrangement editor uses the same `--pad-w`, so its wrapping matches the real board. It is rendered full-width (outside the `max-w-4xl` column) for that reason.
- In a team-filtered editor view the drop index refers to the **visible** pads; `realIndex()` maps it back to the real position so hidden pads of the other team are not reordered. Tested – don't simplify this away.
- Drag & drop uses **pointer events**, not the HTML5 drag API, because the latter does not work on iOS Safari. Hit-testing compares the pointer against each tile's rect (`y` inside the tile's line and `x` past its centre, or the whole line above) so it also works for wrapped rows. Tiles are focusable and arrow keys move them – keep that fallback.
- Touch targets ≥ 44px in the DJ view; the STOP button must always be visible (no spacebar on iPad).
- **Mobile platform rules** (applied 2026-09-25 after auditing against Emil Kowalski's `mobile-native` skill; the remaining items — tap highlight, `touch-action: manipulation`, `user-select`, `overscroll-behavior`, `:active` feedback — were already in place):
  - **Hover only where hover exists**: `.pad3d`/`.btn-stop` hover rules sit inside `@media (hover: hover) and (pointer: fine)` and Tailwind has `future.hoverOnlyWhenSupported`. Without it the hover state sticks on iPad after a tap and the pad stays brightened. Verified: rules active with a mouse, inactive under emulated `hover: none / pointer: coarse`.
  - **Inputs are 16px on coarse pointers** (`@media (pointer: coarse)`). iOS Safari zooms the page when a field below 16px gets focus and never zooms back; the pad description field was 14px. Never "fix" this with `user-scalable=no` – that breaks zoom for everyone.
  - **Safe areas**: `.safe-top` (header), `.safe-bottom` (transport bar), `.safe-x` (header, transport bar, board) use `env(safe-area-inset-*, 0px)`. Needed because `index.html` sets `viewport-fit=cover` and `black-translucent`, so an installed app paints under the status bar and home indicator. Zero on desktop, so nothing changes there.
- **Motion** (applied 2026-09-25 from the same author's `emil-design-eng` / `apple-design` skills): `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and `--ease-in-out` live on `:root`; the pad transitions use them. Things that appear **rarely** fade in – `.anim-fade` (backdrops), `.anim-dialog` (scale 0.96 → 1, for ConfirmDevDialog and the cue editor), `.anim-rise` (TeamPicker content), `.anim-panel` (ClipPanel), `.anim-toast` (error in the transport bar), all 160–240 ms with `--ease-out`.
- **The pads themselves stay unanimated beyond their 80 ms press feedback**: the frequency rule says anything seen 100+ times a day gets no animation. The playing pad's pulse is kept because it is *state indication*, an explicitly valid purpose – don't remove it, and don't add more motion to the board.
- `@media (prefers-reduced-motion: reduce)` blanket-disables animations and transitions (including the pulse). Verified with Playwright's `reducedMotion: 'reduce'`.

### Browser support (measured 2026-09-23 on the user's Mac)
- **Safari 26 and Chrome 153: everything works** – those are her devices (Mac + iPad) and the test runner.
- **Firefox**: playback, import (including the lossless video path – it needs no WebCodecs), cue points and storage all work. Missing on older versions: `wakeLock` (screen sleeps) and, before Firefox 113, `color-mix()` and container queries.
- **`color-mix()` must stay inside `@supports (color: color-mix(in srgb, red 50%, blue))`.** A plain two-declaration fallback does **not** work here: a value containing `var()` is only validated at computed-value time, and an invalid result resets the property instead of falling back to the previous declaration – the pads rendered fully transparent in Firefox 107. The base rules therefore use flat `background: var(--c)`; the glossy gradients live in the `@supports` block.

### Deployment / service worker
- **A deploy does not reach an open browser by itself.** The precaching service worker serves the cached build; measured with two real builds on 2026-09-21, the user needed **two** reloads to see a new version – once to install the new worker, once to be served by it. That is what made her believe a feature was missing.
- `registerServiceWorker()` therefore reloads the page once on `controllerchange`, guarded by `navigator.serviceWorker.controller` having existed before (so a first visit never reloads). Verified: one user reload picks up the new build, no reload loop, first visit reloads zero times.
- **Deliberately no periodic `registration.update()`**: a reload during a match would cut the music. Updates are only checked when the page is opened.
- The Dev view prints the build timestamp (`__BUILD_TIME__`, defined in `vite.config.ts`) – ask the user for it when a feature "is missing".
- To test caching behaviour: build twice into two folders, serve them with a tiny node server that reads the current folder from a file, swap the file, and drive Chrome (see scratchpad `swtest/`). Waiting 1.5 s after a reload is too short – the worker needs a few seconds to install.

### Testing changes
**`npm test`** runs `tests/run.mjs`: it starts Vite on port 3100 (or uses `BASE_URL`), generates WAV test tones itself (`tests/fixtures.mjs`, no ffmpeg needed), drives the installed Chrome headless via `playwright-core` (`channel: 'chrome'`, no browser download) and checks migration, team picker, import, playback modes with real timing, pause/resume, per-clip gain, clip reorder/move, drag & drop, export/import. Exit code 1 on failure. Run it before every commit that touches playback or the data model; extend it when adding features. `clickPad()` prints the DOM state (what is on top, overlays, scroll position) when a pad click times out. If runs abort with click timeouts, check for leftover dev servers and open browser windows from manual testing first – three aborts in a row disappeared once those were closed. Real Safari can be tested with a tiny node server + `open -a Safari` (see the transcode gotcha above).

## Roadmap
- **Done:** soundboard, drag & drop rows, two teams, cue editor with level meter, per-clip volume, playback modes (single/sequence/shuffle), pause/resume, wake lock, video import with audio extraction, bundle export/import, PWA with self-updating shell, e2e tests.
- **Next:** start latency (~0.2–1 s; preload short clips via Web Audio instead of `html5: true`), keyboard shortcuts per pad, countdown for timeouts, fade-in/crossfade, configurable teams, undo for delete.
- **Later:** Tauri desktop build reading a folder from disk (swap `audioStore` behind the same interface), zoom in the cue editor, Spotify (needs Premium + online).
