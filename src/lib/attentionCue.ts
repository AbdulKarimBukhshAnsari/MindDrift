/**
 * Soft attention chime (Web Audio). May be blocked by autoplay policy —
 * pair with chrome.notifications from the service worker for a reliable cue.
 */
export function playAttentionChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const tone = (freq: number, start: number, duration: number, gain = 0.08) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    const t0 = ctx.currentTime;
    tone(660, t0, 0.14, 0.09);
    tone(880, t0 + 0.12, 0.18, 0.07);

    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // Ignore — notification sound is the fallback.
  }
}

/** Light vibration on devices that support it (phones / some laptops). */
export function pulseHaptic(): void {
  try {
    navigator.vibrate?.([40, 30, 40]);
  } catch {
    // Unsupported — ignore.
  }
}
