import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TeamId } from '../types';
import { ALL_TEAM_IDS } from '../config/teams';

/**
 * Welche Mannschaft gerade aufgelegt wird. Beim Start ist nichts gewaehlt -
 * dann fragt die App (TeamPicker). Die letzte Wahl wird nur als Vorauswahl
 * gemerkt, gefragt wird trotzdem bei jedem Oeffnen: Mit den falschen Buttons
 * ins Spiel zu gehen waere schlimmer als ein Fingertipp.
 */

const LAST_KEY = 'vbdj-v2-last-team';

interface TeamContextType {
  team: TeamId | null;
  setTeam: (team: TeamId) => void;
  /** Auswahl erneut zeigen (Wechsel waehrend des Spieltags) */
  clearTeam: () => void;
  lastTeam: TeamId | null;
}

const TeamCtx = createContext<TeamContextType | undefined>(undefined);

function readLast(): TeamId | null {
  const v = localStorage.getItem(LAST_KEY);
  return v && (ALL_TEAM_IDS as string[]).includes(v) ? (v as TeamId) : null;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeamState] = useState<TeamId | null>(null);
  const [lastTeam, setLastTeam] = useState<TeamId | null>(readLast);

  const setTeam = useCallback((next: TeamId) => {
    setTeamState(next);
    setLastTeam(next);
    try {
      localStorage.setItem(LAST_KEY, next);
    } catch {
      /* egal */
    }
  }, []);

  const clearTeam = useCallback(() => setTeamState(null), []);

  const value = useMemo(() => ({ team, setTeam, clearTeam, lastTeam }), [team, setTeam, clearTeam, lastTeam]);
  return <TeamCtx.Provider value={value}>{children}</TeamCtx.Provider>;
}

export function useTeam(): TeamContextType {
  const ctx = useContext(TeamCtx);
  if (!ctx) throw new Error('useTeam muss innerhalb von TeamProvider verwendet werden');
  return ctx;
}
