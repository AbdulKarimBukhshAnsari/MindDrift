/** Normalize a URL or hostname to a bare domain key. */
export function normalizeDomain(input: string): string {
  const raw = input.trim();
  if (!raw) return '';

  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (!url.hostname || url.hostname.includes(' ')) return '';
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}
