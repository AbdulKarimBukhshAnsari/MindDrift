import { useEffect, useState } from 'react';
import { MESSAGE_TYPES, STORAGE_KEYS, THRESHOLDS } from '@/constants';
import { loadFocusClusters } from '@/chrome/focusClusters';
import { sendMessage } from '@/chrome/messaging';
import { storageGet, storageSet } from '@/chrome/storage';
import { speakText } from '@/chrome/tts';
import { AddClusterPanel } from '@/components/screens/AddClusterPanel';
import { FocusSettingsPanel } from '@/components/screens/FocusSettingsPanel';
import {
  FOCUS_ALLOWED_MIN,
  canStartFocusWithAllowlist,
} from '@/lib/focusAllowlist';
import { findFocusCluster } from '@/lib/focusClusters';
import {
  addFocusSessionTime,
  completeFocusSession,
  createDefaultFocusSession,
  getRemainingMs,
  pauseFocusSession,
  startFocusSession,
  type FocusSessionLimits,
} from '@/lib/focusSession';
import type { FocusCluster } from '@/types/focusCluster';
import type { FocusSession } from '@/types/focusSession';

const LIMITS: FocusSessionLimits = {
  defaultMs: THRESHOLDS.FOCUS_SESSION_MS,
  maxMs: THRESHOLDS.FOCUS_SESSION_MAX_MS,
  stepMs: THRESHOLDS.FOCUS_SESSION_STEP_MS,
};

const CONGRATS_VOICE =
  'Congratulations. Your focus session is complete. Want to start another?';

type FocusPanel = 'main' | 'settings' | 'add-cluster';

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type FocusScreenProps = {
  taskLabel?: string;
};

/**
 * Focus tab — timer session UI from Stitch Main Popup (Pro Theme).
 * Persists via chrome.storage.local (survives popup close); max 60 min.
 * Start requires an active cluster with ≥3 allowed domains.
 */
export function FocusScreen({ taskLabel = 'Architectural Review' }: FocusScreenProps) {
  const [session, setSession] = useState<FocusSession>(() =>
    createDefaultFocusSession(LIMITS, taskLabel),
  );
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [clusters, setClusters] = useState<FocusCluster[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [panel, setPanel] = useState<FocusPanel>('main');
  const [panelReturn, setPanelReturn] = useState<FocusPanel>('main');
  const [showStartWarning, setShowStartWarning] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remainingMs = getRemainingMs(session, now);
  const running = session.status === 'running';
  const paused = session.status === 'paused';
  const atMax = remainingMs >= LIMITS.maxMs;
  const canStart = canStartFocusWithAllowlist(allowedDomains);
  const inSession = running || paused;
  const activeCluster = findFocusCluster(clusters, activeClusterId);

  async function refreshClusters() {
    const loaded = await loadFocusClusters();
    setClusters(loaded.clusters);
    setActiveClusterId(loaded.activeId);
    const domains = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
    setAllowedDomains(domains);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [stored, loaded] = await Promise.all([
        storageGet<FocusSession | null>(STORAGE_KEYS.FOCUS_SESSION, null),
        loadFocusClusters(),
      ]);
      if (cancelled) return;
      if (stored) {
        setSession(stored);
      } else {
        const initial = createDefaultFocusSession(LIMITS, taskLabel);
        setSession(initial);
        await storageSet(STORAGE_KEYS.FOCUS_SESSION, initial);
      }
      setClusters(loaded.clusters);
      setActiveClusterId(loaded.activeId);
      const domains = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
      if (cancelled) return;
      setAllowedDomains(domains);
      setNow(Date.now());
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [taskLabel]);

  useEffect(() => {
    function onChanged(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) {
      if (area !== 'local') return;
      const sessionChange = changes[STORAGE_KEYS.FOCUS_SESSION];
      if (sessionChange?.newValue !== undefined) {
        setSession(sessionChange.newValue as FocusSession);
        setNow(Date.now());
      }
      const domainsChange = changes[STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS];
      if (domainsChange?.newValue !== undefined) {
        setAllowedDomains(domainsChange.newValue as string[]);
      }
      if (
        changes[STORAGE_KEYS.FOCUS_CLUSTERS] !== undefined ||
        changes[STORAGE_KEYS.ACTIVE_FOCUS_CLUSTER_ID] !== undefined
      ) {
        void refreshClusters();
      }
    }

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!ready || !running || remainingMs > 0) return;
    const done = completeFocusSession(session, LIMITS);
    setSession(done);
    void storageSet(STORAGE_KEYS.FOCUS_SESSION, done);
    setShowCompleteModal(true);
    speakText(CONGRATS_VOICE);
  }, [ready, running, remainingMs, session]);

  async function persist(next: FocusSession) {
    setSession(next);
    setNow(Date.now());
    await storageSet(STORAGE_KEYS.FOCUS_SESSION, next);
  }

  async function finishSession() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      await sendMessage({ type: MESSAGE_TYPES.END_FOCUS_SESSION });
      setGateMessage(null);
      setShowCompleteModal(true);
      speakText(CONGRATS_VOICE);
    } catch {
      const current = await storageGet(
        STORAGE_KEYS.FOCUS_SESSION,
        createDefaultFocusSession(LIMITS, taskLabel),
      );
      await persist(completeFocusSession(current, LIMITS));
      setShowCompleteModal(true);
      speakText(CONGRATS_VOICE);
    } finally {
      setBusy(false);
    }
  }

  async function requestStart() {
    if (!ready || busy) return;

    const domains = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
    setAllowedDomains(domains);

    if (!canStartFocusWithAllowlist(domains)) {
      setGateMessage(
        clusters.length === 0
          ? 'Create a focus cluster with at least 3 websites in Settings.'
          : `Add at least ${FOCUS_ALLOWED_MIN} sites to your cluster before starting (${domains.length}/${FOCUS_ALLOWED_MIN}).`,
      );
      return;
    }

    setGateMessage(null);
    setShowStartWarning(true);
  }

  async function confirmStart() {
    if (busy) return;
    setBusy(true);
    setShowStartWarning(false);
    try {
      const result = await sendMessage<{ ok: boolean; closedTabs: number; reason?: string }>({
        type: MESSAGE_TYPES.START_FOCUS_SESSION,
      });
      if (!result?.ok) {
        setGateMessage(
          result?.reason === 'allowlist'
            ? 'Add at least 3 sites to your cluster in Settings before starting.'
            : 'Could not start focus session. Try again.',
        );
        return;
      }
      setGateMessage(
        result.closedTabs > 0
          ? `Focus started. Closed ${result.closedTabs} off-cluster tab${result.closedTabs === 1 ? '' : 's'}.`
          : null,
      );
    } catch {
      setGateMessage('Could not start focus session. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePause() {
    if (!ready || busy || !running) return;
    const current = await storageGet(
      STORAGE_KEYS.FOCUS_SESSION,
      createDefaultFocusSession(LIMITS, taskLabel),
    );
    await persist(pauseFocusSession(current, Date.now()));
  }

  async function resumeSession() {
    if (!ready || busy || !paused) return;
    const current = await storageGet(
      STORAGE_KEYS.FOCUS_SESSION,
      createDefaultFocusSession(LIMITS, taskLabel),
    );
    await persist(startFocusSession(current, Date.now()));
  }

  async function endSession() {
    await finishSession();
  }

  async function startAnotherSession() {
    setShowCompleteModal(false);
    await requestStart();
  }

  async function addFiveMinutes() {
    if (!ready || atMax || busy) return;
    const current = await storageGet(
      STORAGE_KEYS.FOCUS_SESSION,
      createDefaultFocusSession(LIMITS, taskLabel),
    );
    await persist(addFocusSessionTime(current, LIMITS, Date.now()));
  }

  function openAddCluster(from: FocusPanel) {
    setPanelReturn(from);
    setPanel('add-cluster');
  }

  if (panel === 'add-cluster') {
    return (
      <AddClusterPanel
        onBack={() => setPanel(panelReturn)}
        onSaved={() => {
          void refreshClusters();
        }}
      />
    );
  }

  if (panel === 'settings') {
    return (
      <FocusSettingsPanel
        onBack={() => setPanel('main')}
        onAddCluster={() => openAddCluster('settings')}
      />
    );
  }

  return (
    <div className="relative box-border flex h-full min-h-0 w-full flex-col overflow-hidden px-pad pb-3 pt-1">
      {showStartWarning ? (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center bg-black/55 p-pad backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-start-warning-title"
        >
          <div className="w-full rounded-2xl border border-md-border-subtle bg-md-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p
              id="focus-start-warning-title"
              className="m-0 mb-2 text-base font-semibold tracking-tight text-md-fg"
            >
              Save your work first
            </p>
            <p className="m-0 mb-4 text-sm leading-relaxed text-md-fg-muted">
              Tabs outside your focus cluster will close when the session starts. Save anything
              important on those sites or you may lose unsaved work.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmStart()}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-md-accent px-4 py-3 text-sm font-bold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover disabled:opacity-50"
              >
                I saved · Start focus
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowStartWarning(false)}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-md-border-subtle px-4 py-2.5 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCompleteModal ? (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center bg-black/55 p-pad backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-complete-title"
        >
          <div className="w-full rounded-2xl border border-md-border-subtle bg-md-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p
              id="focus-complete-title"
              className="m-0 mb-2 text-base font-semibold tracking-tight text-md-fg"
            >
              Congrats — session complete
            </p>
            <p className="m-0 mb-4 text-sm leading-relaxed text-md-fg-muted">
              Nice work staying in focus
              {activeCluster ? ` with ${activeCluster.name}` : ''}. Want to start another
              session?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void startAnotherSession()}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-md-accent px-4 py-3 text-sm font-bold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover disabled:opacity-50"
              >
                Start another focus
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowCompleteModal(false)}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-md-border-subtle px-4 py-2.5 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised disabled:opacity-50"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="md-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-md-border-subtle bg-md-surface/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="shrink-0">
            <div className="mb-4 flex w-fit max-w-full items-center gap-2.5 rounded-2xl border border-md-border-subtle bg-md-surface-raised px-3 py-2">
              <span className="rounded-full border border-md-border-subtle bg-md-bg px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-md-fg-muted uppercase">
                Cluster
              </span>
              <span className="truncate text-sm font-semibold text-md-fg">
                {activeCluster?.name ?? 'No cluster'}
              </span>
              {activeCluster ? (
                <span className="shrink-0 text-xs text-md-fg-muted">
                  · {allowedDomains.length}
                </span>
              ) : null}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-md-border-subtle bg-md-surface-raised px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-md-fg-muted uppercase">
                Current task
              </span>
              <span className="text-sm text-md-fg">{session.taskLabel}</span>
            </div>

            <div className="py-2 text-center">
              <p
                className="m-0 font-semibold tracking-tighter text-md-accent text-[3.75rem] leading-none [text-shadow:0_0_28px_color-mix(in_srgb,#f9b17a_35%,transparent)]"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatMs(remainingMs)}
              </p>
              <p className="mt-2 mb-0 text-sm text-md-fg-muted">
                {paused ? 'Session paused.' : 'Stay drifting in deep thought.'}
              </p>
              {gateMessage ? (
                <p className="mt-2 mb-0 text-sm leading-relaxed text-md-accent" role="alert">
                  {gateMessage}{' '}
                  {!canStart ? (
                    <button
                      type="button"
                      onClick={() => setPanel('settings')}
                      className="cursor-pointer font-semibold underline underline-offset-2"
                    >
                      Open Settings
                    </button>
                  ) : null}
                </p>
              ) : !canStart && ready ? (
                <p className="mt-2 mb-0 text-sm text-md-fg-muted">
                  {clusters.length === 0
                    ? 'No focus cluster yet — add one to start.'
                    : `${allowedDomains.length}/${FOCUS_ALLOWED_MIN} sites · finish your cluster to start.`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 pb-0.5">
            {!inSession ? (
              <button
                type="button"
                disabled={!ready || busy || remainingMs <= 0}
                onClick={() => void requestStart()}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-md-accent px-4 py-3.5 text-sm font-bold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayIcon />
                Start Session
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!ready || busy}
                  onClick={() => void (running ? togglePause() : resumeSession())}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-md-accent px-4 py-3.5 text-sm font-bold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? (
                    <>
                      <PauseIcon />
                      Pause Drift
                    </>
                  ) : (
                    <>
                      <PlayIcon />
                      Resume Session
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!ready || busy}
                  onClick={() => void endSession()}
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-md-border-subtle bg-transparent px-4 py-3 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  End Session
                </button>
              </>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={!ready || atMax || busy}
                onClick={() => void addFiveMinutes()}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-md-border-subtle bg-transparent px-3 py-3 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                +5 min
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setGateMessage(null);
                  setPanel('settings');
                }}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-md-border-subtle bg-transparent px-3 py-3 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent disabled:opacity-50"
              >
                Settings
              </button>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => openAddCluster('main')}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-md-border-subtle py-2.5 text-sm font-semibold text-md-fg-muted transition-colors hover:border-md-accent/50 hover:text-md-accent disabled:opacity-50"
            >
              <PlusIcon />
              Add cluster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
