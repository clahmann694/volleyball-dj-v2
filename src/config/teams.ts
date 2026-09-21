import { TeamId } from '../types';

/** Die Mannschaften, für die aufgelegt wird. */
export const TEAMS: ReadonlyArray<{ id: TeamId; name: string; short: string; color: string }> = [
  { id: 'herren', name: 'Herren 1', short: 'H', color: '#0089c8' },
  { id: 'damen', name: 'Damen 1', short: 'D', color: '#e95055' },
];

export const ALL_TEAM_IDS: TeamId[] = TEAMS.map(t => t.id);

export function teamName(id: TeamId): string {
  return TEAMS.find(t => t.id === id)?.name ?? id;
}
