/**
 * Accepts only QR codes of this app: same origin and /c/claim/<token>.
 * Returns the token or null.
 */
export function claimTokenFromQr(data: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(data.trim());
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const m = /^\/c\/claim\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  return m ? m[1]! : null;
}
