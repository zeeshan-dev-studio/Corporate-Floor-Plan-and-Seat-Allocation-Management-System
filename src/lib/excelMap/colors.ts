export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Accepts "#abc", "abc", "AABBCC", "#AABBCC" and Excel ARGB ("FFAABBCC"). Returns "#rrggbb" or null. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = String(input).trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length === 8) s = s.slice(2);
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return '#' + s.toLowerCase();
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex) || '#000000';
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function colorDistance(a: string, b: string): number {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

/** Excel tint: > 0 lightens towards white, < 0 darkens towards black. */
export function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number) => (tint > 0 ? v + (255 - v) * tint : v * (1 + tint));
  return rgbToHex({ r: f(r), g: f(g), b: f(b) });
}

/** Mix a colour with white; amount 0 = unchanged, 1 = white. */
export function lighten(hex: string, amount: number): string {
  return applyTint(hex, amount);
}

/** Readable text colour (dark or light) for a given background. */
export function textOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0f172a' : '#ffffff';
}
