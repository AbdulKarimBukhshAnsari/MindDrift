/**
 * Self-contained focus timer pill for chrome.scripting.executeScript.
 * Must not close over imports — Chrome serializes only this function body.
 * Used to seed the overlay on tabs that already had the content script sleeping
 * or were open before a session started.
 */
export function selfContainedFocusTimer(session: {
  status: 'idle' | 'running' | 'paused';
  endsAt: number | null;
  remainingMs: number;
}): void {
  const HOST_ID = 'minddrift-focus-timer-host';

  function remainingMs(now = Date.now()): number {
    if (session.status === 'running' && session.endsAt != null) {
      return Math.max(0, session.endsAt - now);
    }
    return Math.max(0, session.remainingMs);
  }

  function format(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  if (session.status !== 'running' && session.status !== 'paused') {
    document.getElementById(HOST_ID)?.remove();
    return;
  }

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'all:initial;position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483640;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .md-timer{pointer-events:none;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;border:1px solid rgba(103,111,157,.45);background:rgba(5,20,36,.92);color:#f1f5f9;box-shadow:0 10px 28px rgba(0,0,0,.45);backdrop-filter:blur(10px);font-family:system-ui,sans-serif}
      .md-brand{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f9b17a}
      .md-time{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em;color:#f9b17a;min-width:3.25rem;text-align:center}
      .md-status{font-size:11px;font-weight:600;color:#a8b0c8}
      .md-dot{width:7px;height:7px;border-radius:999px;background:#f9b17a;box-shadow:0 0 10px rgba(249,177,122,.7)}
      .md-dot[data-paused="true"]{background:#a8b0c8;box-shadow:none}
    `;
    const root = document.createElement('div');
    root.className = 'md-timer';
    root.setAttribute('role', 'status');
    root.innerHTML =
      '<span class="md-dot" data-paused="false"></span><span class="md-brand">MindDrift</span><span class="md-time">00:00</span><span class="md-status">Focus</span>';
    shadow.append(style, root);
    document.documentElement.appendChild(host);
  }

  const timeEl = host.shadowRoot?.querySelector('.md-time');
  const statusEl = host.shadowRoot?.querySelector('.md-status');
  const dot = host.shadowRoot?.querySelector('.md-dot');
  const key = '__minddriftFocusTick';
  const prev = (window as unknown as Record<string, number | undefined>)[key];
  if (prev) window.clearInterval(prev);

  const paint = () => {
    if (!document.getElementById(HOST_ID)) return;
    if (session.status !== 'running' && session.status !== 'paused') {
      document.getElementById(HOST_ID)?.remove();
      return;
    }
    if (timeEl) timeEl.textContent = format(remainingMs());
    if (statusEl) statusEl.textContent = session.status === 'paused' ? 'Paused' : 'Focus';
    if (dot) dot.setAttribute('data-paused', session.status === 'paused' ? 'true' : 'false');
  };

  paint();
  if (session.status === 'running') {
    (window as unknown as Record<string, number | undefined>)[key] = window.setInterval(
      paint,
      250,
    );
  }
}
