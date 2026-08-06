import { useEffect, useState } from 'react';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';
import { PersonaScreen } from '@/components/screens/PersonaScreen';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { STORAGE_KEYS } from '@/constants';
import { storageGet, storageSet } from '@/chrome/storage';
import type { PersonaId } from '@/types/persona';

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

  async function finishOnboarding(personaId: PersonaId) {
    await storageSet(STORAGE_KEYS.ACTIVE_PERSONA, personaId);
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
    return <PersonaScreen onContinue={(id) => void finishOnboarding(id)} />;
  }

  return <HomeScreen />;
}
