import { BrandMark } from '@/components/ui/BrandMark';

/**
 * Settings page — implement:
 * site classifications + notification toggle.
 */
export function OptionsApp() {
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-md-page px-6 py-10 text-md-page-fg">
      <header className="mb-2 flex items-center gap-3">
        <BrandMark size="sm" />
        <h1 className="m-0 text-2xl tracking-tight">MindDrift Settings</h1>
      </header>
      <p className="mb-6 text-md-page-muted">
        Minimal settings for site classifications and notifications.
      </p>
      <p className="m-0 rounded-md border border-dashed border-md-border bg-md-surface p-5 text-md-page-muted">
        Options page — implement settings UI here.
      </p>
    </main>
  );
}
