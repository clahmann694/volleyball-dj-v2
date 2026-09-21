import { useCallback, useEffect, useState } from 'react';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { BoardProvider } from './contexts/BoardContext';
import { Header } from './components/Header';
import { DjView } from './components/dj/DjView';
import { DeveloperView } from './components/dev/DeveloperView';
import { ViewMode } from './types';

const VIEW_KEY = 'vbdj-v2-view';

function AppContent() {
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) === 'dev' ? 'dev' : 'dj'));
  const [panelPadId, setPanelPadId] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const { stopAll } = useAudio();

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stopAll]);

  const changeView = useCallback((next: ViewMode) => {
    setView(next);
    setPanelPadId(null);
    setEditingClipId(null);
  }, []);

  return (
    <div className="h-full flex flex-col text-white">
      <Header view={view} onChangeView={changeView} />
      {view === 'dj' ? (
        <DjView panelPadId={panelPadId} onOpenPanel={setPanelPadId} onClosePanel={() => setPanelPadId(null)} />
      ) : (
        <DeveloperView editingClipId={editingClipId} onEditClip={setEditingClipId} onCloseEditor={() => setEditingClipId(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BoardProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </BoardProvider>
  );
}
