import { useCallback, useEffect, useState } from 'react';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { BoardProvider } from './contexts/BoardContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { Header } from './components/Header';
import { TeamPicker } from './components/TeamPicker';
import { ConfirmDevDialog } from './components/ConfirmDevDialog';
import { DevLockDialog } from './components/DevLockDialog';
import { isLocked, isUnlockedHere } from './utils/devLock';
import { DjView } from './components/dj/DjView';
import { DeveloperView } from './components/dev/DeveloperView';
import { ViewMode } from './types';
import { useWakeLock } from './hooks/useWakeLock';

function AppContent() {
  // Immer in der DJ-Ansicht starten - wie die Mannschaftsfrage bei jedem Start.
  // Frueher kam die zuletzt offene Ansicht wieder; wer zuletzt in Dev war, landete
  // beim naechsten Laden ohne Rueckfrage dort (Beschwerde 2026-09-25).
  const [view, setView] = useState<ViewMode>('dj');
  const [panelPadId, setPanelPadId] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  // Sicherheitsabfrage bzw. Sperrbildschirm vor dem Wechsel in die Dev-Ansicht
  const [askDev, setAskDev] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const { stopAll } = useAudio();
  const { team } = useTeam();

  // Im Spielbetrieb darf sich das iPad nicht sperren
  useWakeLock(!!team && view === 'dj');


  // Leertaste = Panik-Stopp, Escape = Panel/Editor schliessen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        stopAll();
      }
      if (e.key === 'Escape') {
        setPanelPadId(null);
        setEditingClipId(null);
        setAskDev(false);
        setAskPassword(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stopAll]);

  // Laufenden Sound stoppen, wenn die Mannschaft gewechselt wird
  useEffect(() => {
    if (!team) stopAll();
  }, [team, stopAll]);

  const applyView = useCallback((next: ViewMode) => {
    setView(next);
    setPanelPadId(null);
    setEditingClipId(null);
    setAskDev(false);
    setAskPassword(false);
  }, []);

  // Von DJ nach Dev nur nach Bestaetigung - dort kann man alles loeschen
  const changeView = useCallback(
    (next: ViewMode) => {
      if (next === 'dev' && view === 'dj') {
        // Eingebautes Passwort: Sperrbildschirm statt Rückfrage, bis dieses
        // Gerät einmal entsperrt wurde (merkt sich der Browser)
        if (isLocked() && !isUnlockedHere()) setAskPassword(true);
        else setAskDev(true);
      } else applyView(next);
    },
    [view, applyView]
  );

  // Ohne gewaehlte Mannschaft zuerst fragen
  if (!team) return <TeamPicker />;

  return (
    <div className="h-full flex flex-col text-white">
      {askDev && <ConfirmDevDialog onConfirm={() => applyView('dev')} onCancel={() => setAskDev(false)} />}
      {askPassword && (
        <DevLockDialog
          onUnlock={() => applyView('dev')}
          onCancel={() => setAskPassword(false)}
        />
      )}
      <Header view={view} onChangeView={changeView} />
      {view === 'dj' ? (
        <DjView panelPadId={panelPadId} onOpenPanel={setPanelPadId} onClosePanel={() => setPanelPadId(null)} onGoToDev={() => changeView('dev')} />
      ) : (
        <DeveloperView editingClipId={editingClipId} onEditClip={setEditingClipId} onCloseEditor={() => setEditingClipId(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BoardProvider>
      <TeamProvider>
        <AudioProvider>
          <AppContent />
        </AudioProvider>
      </TeamProvider>
    </BoardProvider>
  );
}
