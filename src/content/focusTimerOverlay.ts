import { STORAGE_KEYS } from '@/constants';
import { getRemainingMs } from '@/lib/focusSession';
import type { FocusSession } from '@/types/focusSession';

const HOST_ID = 'minddrift-focus-timer-host';

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Floating focus countdown — shown on every injectable page while a session
 * is running or paused, until the user ends focus.
 */
export function initFocusTimerOverlay(): void {
  let session: FocusSession | null = null;
  let tickId: number | null = null;
  let host: HTMLElement | null = null;
  let timeEl: HTMLElement | null = null;
  let statusEl: HTMLElement | null = null;

  function ensureDom() {
    if (host?.isConnected) return;
    document.getElementById(HOST_ID)?.remove();

    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'all:initial;position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483640;pointer-events:none;';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .md-timer {
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(103, 111, 157, 0.45);
        background: rgba(5, 20, 36, 0.92);
        color: #f1f5f9;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(10px);
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .md-brand {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #f9b17a;
      }
      .md-time {
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        color: #f9b17a;
        min-width: 3.25rem;
        text-align: center;
      }
      .md-status {
        font-size: 11px;
        font-weight: 600;
        color: #a8b0c8;
      }
      .md-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #f9b17a;
        box-shadow: 0 0 10px rgba(249, 177, 122, 0.7);
      }
      .md-dot[data-paused="true"] {
        background: #a8b0c8;
        box-shadow: none;
      }
    `;

    const root = document.createElement('div');
    root.className = 'md-timer';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.innerHTML = `
      <span class="md-dot" data-paused="false" aria-hidden="true"></span>
      <span class="md-brand">MindDrift</span>
      <span class="md-time">00:00</span>
      <span class="md-status">Focus</span>
    `;

    shadow.append(style, root);
    (document.documentElement || document.body).appendChild(host);

    timeEl = root.querySelector('.md-time');
    statusEl = root.querySelector('.md-status');
  }

  function hide() {
    if (tickId !== null) {
      window.clearInterval(tickId);
      tickId = null;
    }
    host?.remove();
    host = null;
    timeEl = null;
    statusEl = null;
  }

  function paint() {
    if (!session || (session.status !== 'running' && session.status !== 'paused')) {
      hide();
      return;
    }

    ensureDom();
    const remaining = getRemainingMs(session);
    const paused = session.status === 'paused';
    if (timeEl) timeEl.textContent = formatMs(remaining);
    if (statusEl) statusEl.textContent = paused ? 'Paused' : 'Focus';
    const dot = host?.shadowRoot?.querySelector('.md-dot');
    if (dot) dot.setAttribute('data-paused', paused ? 'true' : 'false');

    if (session.status === 'running' && tickId === null) {
      tickId = window.setInterval(() => paint(), 250);
    }
    if (session.status === 'paused' && tickId !== null) {
      window.clearInterval(tickId);
      tickId = null;
    }
  }

  function apply(next: FocusSession | null) {
    session = next;
    paint();
  }

  void chrome.storage.local.get(STORAGE_KEYS.FOCUS_SESSION).then((result) => {
    apply((result[STORAGE_KEYS.FOCUS_SESSION] as FocusSession | undefined) ?? null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes[STORAGE_KEYS.FOCUS_SESSION];
    if (!change) return;
    apply((change.newValue as FocusSession | undefined) ?? null);
  });
}
