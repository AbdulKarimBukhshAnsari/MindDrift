export type InterventionDomPayload = {
  message: string;
  continueLabel: string;
  goBackLabel: string;
  snoozeLabel: string;
  /** 0 or negative = sticky (no auto-dismiss). */
  autoDismissMs: number;
  /** Default true. Set false for opt-in Yes/No. */
  showSnooze?: boolean;
};

type InterventionHandlers = {
  onContinue: () => void;
  onGoBack: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
};

const HOST_ID = 'minddrift-intervention-host';

const STYLES = `
  :host, #md-root { all: initial; }
  #md-root {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483646 !important;
    font-family: 'Raleway', 'Segoe UI', system-ui, sans-serif !important;
    pointer-events: auto !important;
  }
  .md-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 20, 36, 0.62);
    backdrop-filter: blur(2px);
  }
  .md-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 20px;
    box-sizing: border-box;
    pointer-events: none;
  }
  .md-card {
    pointer-events: auto;
    width: min(42rem, calc(100vw - 2.5rem));
    box-sizing: border-box;
    border-radius: 14px;
    border: 1px solid rgba(103, 111, 157, 0.45);
    background: #051424;
    color: #f1f5f9;
    padding: 24px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
    animation: md-rise 240ms ease-out;
  }
  @keyframes md-rise {
    from { opacity: 0; transform: translate(8px, -6px); }
    to { opacity: 1; transform: translate(0, 0); }
  }
  .md-row { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
  .md-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    margin-top: 2px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #f9b17a;
    color: #051424;
  }
  .md-brand {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #f9b17a;
  }
  .md-msg {
    margin: 8px 0 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.01em;
    color: #f1f5f9;
  }
  .md-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .md-actions-row {
    display: flex;
    gap: 10px;
  }
  .md-btn {
    flex: 1;
    cursor: pointer;
    border-radius: 10px;
    padding: 12px 14px;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    border: 1px solid rgba(103, 111, 157, 0.45);
  }
  .md-btn-secondary {
    background: #2d3250;
    color: #f1f5f9;
  }
  .md-btn-secondary:hover { background: #363b5c; }
  .md-btn-primary {
    background: #f9b17a;
    color: #051424;
    border-color: transparent;
  }
  .md-btn-primary:hover { background: #ffc093; }
  .md-btn-snooze {
    width: 100%;
    background: transparent;
    color: #a8b0c8;
    border-color: rgba(103, 111, 157, 0.45);
  }
  .md-btn-snooze:hover {
    background: #2d3250;
    color: #f1f5f9;
  }
`;

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const beep = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };
    const t = ctx.currentTime;
    beep(660, t, 0.14, 0.12);
    beep(880, t + 0.12, 0.18, 0.1);
    window.setTimeout(() => void ctx.close(), 700);
  } catch {
    // autoplay may block — OS notification is the backup
  }
}

/**
 * Paint a focus-break modal in a closed Shadow DOM so host-page CSS cannot hide it.
 */
export function mountInterventionDom(
  payload: InterventionDomPayload,
  handlers: InterventionHandlers,
): () => void {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:auto;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLES;

  const root = document.createElement('div');
  root.id = 'md-root';
  root.innerHTML = `
    <div class="md-backdrop" aria-hidden="true"></div>
    <div class="md-wrap">
      <div class="md-card" role="dialog" aria-modal="true" aria-label="Focus break">
        <div class="md-row">
          <span class="md-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M4 8.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M4 12.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M4 16.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          <div>
            <p class="md-brand">MindDrift</p>
            <p class="md-msg"></p>
          </div>
        </div>
        <div class="md-actions">
          <div class="md-actions-row">
            <button type="button" class="md-btn md-btn-secondary" data-action="continue"></button>
            <button type="button" class="md-btn md-btn-primary" data-action="back"></button>
          </div>
          <button type="button" class="md-btn md-btn-snooze" data-action="snooze"></button>
        </div>
      </div>
    </div>
  `;

  const msg = root.querySelector('.md-msg');
  if (msg) msg.textContent = payload.message;
  const continueBtn = root.querySelector<HTMLButtonElement>('[data-action="continue"]');
  const backBtn = root.querySelector<HTMLButtonElement>('[data-action="back"]');
  const snoozeBtn = root.querySelector<HTMLButtonElement>('[data-action="snooze"]');
  if (continueBtn) continueBtn.textContent = payload.continueLabel;
  if (backBtn) backBtn.textContent = payload.goBackLabel;
  if (snoozeBtn) snoozeBtn.textContent = payload.snoozeLabel;
  if (payload.showSnooze === false && snoozeBtn) {
    snoozeBtn.style.display = 'none';
  }

  shadow.append(style, root);

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  playChime();

  let timer: number | undefined;

  const cleanup = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    document.documentElement.style.overflow = prevOverflow;
    host.remove();
  };

  continueBtn?.addEventListener('click', () => {
    cleanup();
    handlers.onContinue();
  });
  backBtn?.addEventListener('click', () => {
    cleanup();
    handlers.onGoBack();
  });
  snoozeBtn?.addEventListener('click', () => {
    cleanup();
    handlers.onSnooze();
  });

  if (payload.autoDismissMs > 0) {
    timer = window.setTimeout(() => {
      cleanup();
      handlers.onDismiss();
    }, payload.autoDismissMs);
  }

  backBtn?.focus();
  return cleanup;
}
