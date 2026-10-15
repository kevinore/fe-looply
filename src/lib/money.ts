/** 42000 → "$42.000" (dot thousands separator, no decimals, no space). */
export function formatCop(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${digits}`;
}
