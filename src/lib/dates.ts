/** Today (or the given date) as YYYY-MM-DD in the user's local time zone. toISOString() uses UTC and is a day off in the evening in the Americas or the early morning in Asia. */
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
