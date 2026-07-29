import { useEffect, useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { PersonaScreen } from './PersonaScreen';
import { STORAGE_KEYS } from '../shared/constants';
import { storageGet, storageSet } from '../shared/storage';

type PopupView = 'loading' | 'welcome' | 'persona' | 'home';

/**
 * Main extension popup — welcome → persona on first run, then home.
 */
export function PopupApp() {
  const [view, setView] = useState<PopupView>('loading');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const done = await storageGet(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
      if (!cancelled) {
        setView(done ? 'home' : 'welcome');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function finishOnboarding() {
    await storageSet(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    setView('home');
  }

  if (view === 'loading') {
    return <main className="h-full w-full overflow-hidden bg-md-bg" aria-busy="true" />;
  }

  if (view === 'welcome') {
    return <WelcomeScreen onStart={() => setView('persona')} />;
  }

  if (view === 'persona') {
    return <PersonaScreen onContinue={() => void finishOnboarding()} />;
  }

  return (
    <main className="box-border flex h-full w-full flex-col overflow-hidden bg-md-bg p-pad text-md-fg">
      <header className="shrink-0">
        <h1 className="mb-1 text-lg font-semibold tracking-tight">MindDrift</h1>
        <p className="mb-4 text-sm text-md-fg-muted">Catch focus loss in the moment.</p>
      </header>
      <p className="m-0 min-h-0 flex-1 rounded-md border border-dashed border-md-border-subtle bg-md-surface p-4 text-sm text-md-fg-muted">
        Popup UI — implement Feature screens here.
      </p>
    </main>
  );
}
