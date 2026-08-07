/** Shared TTS helper — popup + service worker. */
export function speakText(message: string): void {
  try {
    chrome.tts?.speak(message, {
      enqueue: false,
      rate: 1.05,
      volume: 1.0,
    });
  } catch (err) {
    console.warn('[MindDrift] tts failed', err);
  }
}

export function stopSpeaking(): void {
  try {
    chrome.tts?.stop();
  } catch {
    // ignore
  }
}
