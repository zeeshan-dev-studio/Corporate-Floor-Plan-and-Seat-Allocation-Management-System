import { FloorMapModel, MapSeat } from './types';

export interface ResolvedSeat {
  seat: MapSeat;
  /** Final permanent seat id, e.g. "CHN-F04-A-001". */
  seatId: string;
  zoneCode: string;
  /** True when the Excel cell had no text and the id was generated. */
  generated: boolean;
  error?: string;
}

const pad3 = (n: number) => String(n).padStart(3, '0');
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Turns the text in each seat cell into final seat ids.
 *   "A-001", "A001", "A 1"  -> <prefix>-A-001   (zone A)
 *   "12"                    -> <prefix>-<defaultZone>-012
 *   "" (empty cell)         -> next free number in the default zone, in reading order
 *   anything else           -> <prefix>-<cleaned text>, in the default zone
 * A label that already starts with the prefix keeps it only once.
 * Duplicate ids are flagged on every offending seat; nothing is renamed silently.
 */
export function resolveSeatIds(model: FloorMapModel, prefix: string, defaultZone = 'A'): ResolvedSeat[] {
  const pfx = clean(prefix);
  const dz = clean(defaultZone) || 'A';
  const ordered = model.seats
    .map((seat, index) => ({ seat, index }))
    .sort((a, b) => a.seat.row - b.seat.row || a.seat.col - b.seat.col);

  const out: ResolvedSeat[] = new Array(model.seats.length);
  const maxByZone: Record<string, number> = {};
  const pending: Array<{ seat: MapSeat; index: number }> = [];

  for (const { seat, index } of ordered) {
    let text = clean(seat.label || '');
    if (pfx && text.startsWith(pfx + '-')) text = text.slice(pfx.length + 1);
    if (!text) {
      pending.push({ seat, index });
      continue;
    }
    let zoneCode = dz;
    let id: string;
    const m = text.match(/^([A-Z]{1,4})-?(\d{1,4})$/);
    if (m) {
      zoneCode = m[1];
      const n = parseInt(m[2], 10);
      id = `${zoneCode}-${pad3(n)}`;
      maxByZone[zoneCode] = Math.max(maxByZone[zoneCode] || 0, n);
    } else if (/^\d{1,4}$/.test(text)) {
      const n = parseInt(text, 10);
      id = `${dz}-${pad3(n)}`;
      maxByZone[dz] = Math.max(maxByZone[dz] || 0, n);
    } else {
      id = text;
    }
    out[index] = { seat, seatId: pfx ? `${pfx}-${id}` : id, zoneCode, generated: false };
  }

  for (const { seat, index } of pending) {
    const n = (maxByZone[dz] || 0) + 1;
    maxByZone[dz] = n;
    out[index] = { seat, seatId: `${pfx ? pfx + '-' : ''}${dz}-${pad3(n)}`, zoneCode: dz, generated: true };
  }

  const count: Record<string, number> = {};
  out.forEach((r) => (count[r.seatId] = (count[r.seatId] || 0) + 1));
  out.forEach((r) => {
    if (count[r.seatId] > 1) r.error = `Seat id ${r.seatId} is used by ${count[r.seatId]} cells`;
  });
  return out;
}
