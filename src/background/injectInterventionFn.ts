/**
 * Self-contained page inject for chrome.scripting.executeScript({ func }).
 * Must not close over imports — Chrome serializes only this function body.
 */
export function selfContainedShowIntervention(payload: {
  message: string;
  continueLabel: string;
  goBackLabel: string;
  snoozeLabel: string;
  autoDismissMs: number;
  continueType: string;
  goBackType: string;
  snoozeType: string;
  dismissType: string;
}): void {
  const HOST_ID = 'minddrift-intervention-host';
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:auto;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    #md-root{position:fixed!important;inset:0!important;z-index:2147483646!important;font-family:system-ui,sans-serif!important}
    .md-backdrop{position:absolute;inset:0;background:rgba(5,20,36,.62);backdrop-filter:blur(2px)}
    .md-wrap{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:flex-end;padding:20px;box-sizing:border-box;pointer-events:none}
    .md-card{pointer-events:auto;width:min(30rem,calc(100vw - 2.5rem));box-sizing:border-box;border-radius:14px;border:1px solid rgba(103,111,157,.45);background:#051424;color:#f1f5f9;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,.55)}
    .md-row{display:flex;gap:14px;margin-bottom:18px}
    .md-icon{flex-shrink:0;width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:#f9b17a;color:#051424;font-weight:700}
    .md-brand{margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f9b17a}
    .md-msg{margin:8px 0 0;font-size:18px;font-weight:600;line-height:1.35}
    .md-actions{display:flex;flex-direction:column;gap:10px}
    .md-row-btns{display:flex;gap:10px}
    .md-btn{flex:1;cursor:pointer;border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;font-weight:600;border:1px solid rgba(103,111,157,.45)}
    .md-sec{background:#2d3250;color:#f1f5f9}
    .md-pri{background:#f9b17a;color:#051424;border-color:transparent}
    .md-snooze{width:100%;background:transparent;color:#a8b0c8}
  `;

  const root = document.createElement('div');
  root.id = 'md-root';
  root.innerHTML = `
    <div class="md-backdrop"></div>
    <div class="md-wrap">
      <div class="md-card" role="dialog" aria-modal="true">
        <div class="md-row">
          <span class="md-icon">MD</span>
          <div>
            <p class="md-brand">MindDrift</p>
            <p class="md-msg"></p>
          </div>
        </div>
        <div class="md-actions">
          <div class="md-row-btns">
            <button type="button" class="md-btn md-sec" data-a="c"></button>
            <button type="button" class="md-btn md-pri" data-a="b"></button>
          </div>
          <button type="button" class="md-btn md-snooze" data-a="s"></button>
        </div>
      </div>
    </div>`;

  const msg = root.querySelector('.md-msg');
  if (msg) msg.textContent = payload.message;
  const cBtn = root.querySelector<HTMLButtonElement>('[data-a="c"]');
  const bBtn = root.querySelector<HTMLButtonElement>('[data-a="b"]');
  const sBtn = root.querySelector<HTMLButtonElement>('[data-a="s"]');
  if (cBtn) cBtn.textContent = payload.continueLabel;
  if (bBtn) bBtn.textContent = payload.goBackLabel;
  if (sBtn) sBtn.textContent = payload.snoozeLabel;

  shadow.append(style, root);
  document.documentElement.style.overflow = 'hidden';

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tone = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(start);
      o.stop(start + dur);
    };
    tone(660, ctx.currentTime, 0.15);
    tone(880, ctx.currentTime + 0.12, 0.18);
  } catch {
    // ignore
  }

  const done = (type: string) => {
    window.clearTimeout(timer);
    document.documentElement.style.overflow = '';
    host.remove();
    void chrome.runtime.sendMessage({ type });
  };

  cBtn?.addEventListener('click', () => done(payload.continueType));
  bBtn?.addEventListener('click', () => done(payload.goBackType));
  sBtn?.addEventListener('click', () => done(payload.snoozeType));
  const timer = window.setTimeout(() => done(payload.dismissType), payload.autoDismissMs);
}
