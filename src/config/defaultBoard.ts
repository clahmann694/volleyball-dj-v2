import { BoardConfig, SoundPad } from '../types';

// Startbelegung: die 23 Buttons aus der V1 (ohne Audiodateien - die werden importiert)
const pad = (id: string, name: string, icon: string): SoundPad => ({ id, name, icon, clips: [] });

export const DEFAULT_BOARD: BoardConfig = {
  version: 1,
  groups: [
    {
      id: 'scoring',
      name: 'Scoring',
      icon: '🏐',
      color: '#ff2d55',
      pads: [
        pad('ace', 'Ace!', '🎯'),
        pad('block', 'Block!', '🧱'),
        pad('kill', 'Kill!', '💥'),
        pad('point', 'Point!', '✨'),
        pad('set-point', 'Set Point', '🔥'),
      ],
    },
    {
      id: 'momentum',
      name: 'Momentum',
      icon: '🔥',
      color: '#ff9500',
      pads: [
        pad('lets-go', "Let's Go!", '👏'),
        pad('air-horn', 'Air Horn', '📯'),
        pad('drum-roll', 'Drum Roll', '🥁'),
        pad('crowd-cheer', 'Crowd Cheer', '👥'),
        pad('siren', 'Siren', '🚨'),
      ],
    },
    {
      id: 'timeouts',
      name: 'Timeouts & Breaks',
      icon: '⏱️',
      color: '#30d158',
      pads: [
        pad('timeout-beat', 'Timeout Beat', '🎵'),
        pad('hype-track', 'Hype Track', '🎧'),
        pad('walk-on', 'Walk-On', '🚶'),
        pad('halftime', 'Halftime', '🌟'),
      ],
    },
    {
      id: 'fun',
      name: 'Fun & Interaction',
      icon: '🎉',
      color: '#bf5af2',
      pads: [
        pad('buzzer', 'Buzzer', '🔔'),
        pad('fail', 'Wah Wah', '😅'),
        pad('applause', 'Applause', '👏'),
        pad('defense', 'Defense!', '🛡️'),
        pad('boo', 'Boo!', '👻'),
      ],
    },
    {
      id: 'events',
      name: 'Game Events',
      icon: '📋',
      color: '#0a84ff',
      pads: [
        pad('whistle', 'Whistle', '📣'),
        pad('substitution', 'Sub', '🔄'),
        pad('challenge', 'Challenge', '🏴'),
        pad('game-start', 'Game Start', '🎬'),
      ],
    },
  ],
};
