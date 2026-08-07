import { useState } from 'react';
import { FocusScreen } from '@/components/screens/FocusScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { PopupBrandHeader } from '@/components/ui/PopupBrandHeader';
import { PopupNavBar, type PopupNavId } from '@/components/ui/PopupNavBar';

/**
 * Main popup shell after onboarding — Pro Theme layout from Stitch.
 */
export function HomeScreen() {
  const [activeNav, setActiveNav] = useState<PopupNavId>('focus');

  return (
    <main className="box-border flex h-full w-full flex-col overflow-hidden bg-md-bg text-md-fg">
      <PopupBrandHeader />
      <section className="min-h-0 flex-1 overflow-hidden" aria-label={activeNav}>
        {activeNav === 'focus' ? <FocusScreen /> : null}
        {activeNav === 'profile' ? <ProfileScreen /> : null}
      </section>
      <PopupNavBar active={activeNav} onChange={setActiveNav} />
    </main>
  );
}
