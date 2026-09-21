> **Historisch (Stand Phase-1-Prototyp, vor dem Umbau zum Soundboard am 2026-09-21).** Aktuelle Beschreibung: [README.md](README.md) und [CLAUDE.md](CLAUDE.md).

# Volleyball DJ V2 - Project Plan

## Vision
A cross-platform (Mac + iPad) DJ application for managing music during volleyball matches, with scene-based organization and intuitive playback controls.

## User Workflow
1. **Pre-Game Setup**: DJ creates/loads playlists organized by game scenes
2. **During Game**: Quick access to play appropriate music for each scene
3. **Break Management**: Play/pause, volume control, smooth fades between tracks

## Volleyball Game Scenes
Music should be organized around these typical moments:
- **Warm-up** - Energetic, upbeat music (15-20 min)
- **Team Introduction** - Dramatic, hype music (2-3 min)
- **Set Break** - Moderate energy, 3-minute break
- **Timeout** - Quick 30-60 second clips
- **Injury/Technical Timeout** - Calm background music
- **Halftime/Between Matches** - Varied, longer form
- **Victory/Celebration** - High energy, celebration tracks

## Core Features (MVP)

### 1. Scene-Based Library
- Organize music clips by volleyball scenes
- Drag-and-drop assignment to scenes
- Color-coded scene categories

### 2. Playback Controls
- Play/Pause/Stop/Skip
- Volume slider with visual feedback
- Fade in/out with adjustable duration
- Current track info display

### 3. Playlist Management
- Create named playlists per scene
- Reorder tracks
- Save/load playlist configurations
- Quick scene switching

### 4. Audio Support
- Local file support (MP3, WAV, AAC)
- Waveform visualization (future)
- Crossfade between tracks (future)
- Spotify integration (future Phase 2)

## Technical Architecture

### Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Audio Engine**: Howler.js
- **Desktop**: Tauri (Phase 2) or PWA for now
- **State Management**: React Context + useReducer
- **Icons**: Lucide React

### Component Structure
```
src/
├── components/
│   ├── SceneSelector/      # Grid/list of volleyball scenes
│   ├── PlaybackControls/   # Play/pause/skip/volume
│   ├── TrackList/          # Current scene's playlist
│   ├── NowPlaying/         # Current track display
│   ├── VolumeControl/      # Volume slider + fade buttons
│   └── FileManager/        # Import/manage music files
├── contexts/
│   ├── AudioContext.tsx    # Howler.js wrapper, playback state
│   ├── LibraryContext.tsx  # Music library, scenes, playlists
├── hooks/
│   ├── useAudioPlayer.ts   # Playback logic
│   ├── useFade.ts          # Fade in/out logic
├── types/
│   ├── Scene.ts            # Scene definitions
│   ├── Track.ts            # Track metadata
│   └── Playlist.ts         # Playlist structure
└── App.tsx
```

### Data Model

```typescript
type Scene = {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  typicalDuration: number; // seconds
};

type Track = {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  filePath: string;
  sceneId: string;
};

type Playlist = {
  id: string;
  sceneId: string;
  name: string;
  tracks: Track[];
};
```

## Development Phases

### Phase 1: Core MVP (Current)
- [ ] Project setup with Vite + React + TypeScript
- [ ] Basic UI layout with scene selector
- [ ] Audio playback with Howler.js
- [ ] Volume and fade controls
- [ ] Local file management
- [ ] Responsive design for iPad

### Phase 2: Desktop App
- [ ] Tauri integration for Mac app
- [ ] File system access for music library
- [ ] App icon and branding
- [ ] macOS menu bar integration

### Phase 3: Advanced Features
- [ ] Spotify API integration
- [ ] Waveform visualization
- [ ] Crossfade between tracks
- [ ] Keyboard shortcuts
- [ ] Timer integration (auto-stop after X seconds)

### Phase 4: iPad Native
- [ ] iOS/iPadOS build via Tauri Mobile
- [ ] Touch-optimized controls
- [ ] App Store deployment

## Design Principles for Agentic Development

1. **Component Isolation**: Each component should be self-contained and testable
2. **Type Safety**: Use TypeScript for all data structures
3. **Clear Interfaces**: Well-defined props and context APIs
4. **Progressive Enhancement**: Start simple, add features incrementally
5. **Consistent Patterns**: Use same patterns across components for AI predictability

## Next Steps

1. Initialize Vite project with React + TypeScript
2. Set up Tailwind CSS
3. Create basic component structure
4. Implement AudioContext with Howler.js
5. Build SceneSelector component
6. Implement PlaybackControls
