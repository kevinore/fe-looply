const TZ = 'America/Bogota';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.replace(/\./g, '').replace(/,/g, '');
/** Short formats: "30 de sept de 2026" → "30 sep 2026" (es-CO adds "de" and "sept"). */
const compact = (s: string) => clean(s).replace(/ de /g, ' ').replace(/\bsept\b/g, 'sep');

/** "Domingo 27 sep" */
export function shortWeekdayDate(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: TZ }).format(date);
  const rest = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: TZ }).format(date);
  return compact(`${cap(weekday)} ${rest}`);
}

/** "Domingo 4 de octubre" */
export function longWeekdayDate(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? parseLocalDate(d) : d;
  const s = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(date);
  return cap(clean(s));
}

/** "12 nov" */
export function shortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return compact(new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: TZ }).format(date));
}

/** "2 ene 2027" */
export function shortDateYear(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return compact(new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(date));
}

/** "10:43" */
export function timeHM(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(date);
}

/** Whole days from now until `d` (0 if past). */
export function daysUntil(d: Date | string, now = new Date()): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));
}

/** "YYYY-MM-DD" as a Date at local noon (avoids timezone day shifts). */
export function parseLocalDate(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T12:00:00-05:00`);
}

/** Today in Bogotá as "YYYY-MM-DD". */
export function todayYmd(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(now));
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
