import { normalizeHex } from './colors';
import { FloorMapModel } from './types';

export const LIMITS = { seats: 3000, rooms: 300, cells: 400, legend: 60 };

/** Structural checks on a map that came from the browser. Returns a list of problems (empty = fine). */
export function validateModel(m: any): string[] {
  const errors: string[] = [];
  if (!m || typeof m !== 'object') return ['The floor map is missing.'];
  const int = (v: any) => Number.isInteger(v);

  if (!int(m.rows) || !int(m.cols) || m.rows < 1 || m.cols < 1 || m.rows > LIMITS.cells || m.cols > LIMITS.cells) {
    errors.push('The map size is not valid (1 to ' + LIMITS.cells + ' rows and columns).');
  }
  if (!Array.isArray(m.legend) || !m.legend.length || m.legend.length > LIMITS.legend) {
    errors.push('The legend is missing or too large.');
  }
  if (!Array.isArray(m.seats) || !m.seats.length) errors.push('The map has no seats.');
  if (Array.isArray(m.seats) && m.seats.length > LIMITS.seats) errors.push('The map has more than ' + LIMITS.seats + ' seats.');
  if (!Array.isArray(m.rooms) || m.rooms.length > LIMITS.rooms) errors.push('The room list is missing or too large.');
  if (errors.length) return errors;

  const keys = new Set<string>();
  (m.legend as any[]).forEach((e) => {
    if (!e || typeof e.key !== 'string' || !e.key || keys.has(e.key)) errors.push('Legend keys must be unique.');
    else keys.add(e.key);
    if (!e || !['program', 'vacant', 'nonusable', 'support'].includes(e.kind)) errors.push('A legend entry has an unknown category.');
    if (!e || !normalizeHex(e.color)) errors.push('A legend entry has an invalid colour.');
  });

  const taken = new Set<string>();
  for (const s of m.seats as any[]) {
    if (!s || !int(s.row) || !int(s.col) || s.row < 0 || s.col < 0 || s.row >= m.rows || s.col >= m.cols) {
      errors.push('A seat is outside the map.');
      break;
    }
    if (!keys.has(s.legendKey)) {
      errors.push('A seat uses a legend entry that does not exist.');
      break;
    }
    if (typeof s.label !== 'string' || s.label.length > 30) {
      errors.push('A seat number is longer than 30 characters.');
      break;
    }
    const k = s.row + ',' + s.col;
    if (taken.has(k)) {
      errors.push('Two seats share the same cell.');
      break;
    }
    taken.add(k);
  }
  for (const r of m.rooms as any[]) {
    if (!r || !int(r.row) || !int(r.col) || !int(r.rowSpan) || !int(r.colSpan) || r.rowSpan < 1 || r.colSpan < 1 ||
        r.row < 0 || r.col < 0 || r.row + r.rowSpan > m.rows || r.col + r.colSpan > m.cols) {
      errors.push('A room is outside the map.');
      break;
    }
  }
  return errors;
}

export type ValidModel = FloorMapModel;
