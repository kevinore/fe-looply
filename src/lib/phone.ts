/** Keeps only digits, max 10. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

/** "3101234567" → "310 123 4567", formatting progressively while typing. */
export function formatPhoneInput(raw: string): string {
  const d = phoneDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** UI hint only: 10 digits starting with 3. The backend does the real validation. */
export function isValidColombianMobile(raw: string): boolean {
  return /^3\d{9}$/.test(raw.replace(/\D/g, ''));
}

/** "4567" → "310 ••• 4567" style mask using only the last 4 digits we know. */
export function maskedPhone(last4: string, prefix = '3••'): string {
  return `${prefix} ••• ${last4}`;
}
