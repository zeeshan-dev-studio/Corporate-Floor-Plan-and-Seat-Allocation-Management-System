import { CellKind, LegendEntry } from './types';

export interface KnownProgram {
  name: string;
  code: string;
  color: string;
}

export const VACANT_COLOR = '#22c55e';
export const NONUSABLE_COLOR = '#6b7280';
export const SUPPORT_COLOR = '#1d4ed8';
export const ROOM_COLOR = '#334155';

/** Program that support seats are booked under unless the legend names another. */
export const SUPPORT_PROGRAM = { code: 'SUPPORT', name: 'Support Functions' };

export function vacantEntry(color = VACANT_COLOR): LegendEntry {
  return { key: 'VACANT', label: 'Vacant', kind: 'vacant', color };
}
export function nonUsableEntry(color = NONUSABLE_COLOR): LegendEntry {
  return { key: 'NONUSABLE', label: 'Non-usable', kind: 'nonusable', color };
}
export function supportEntry(color = SUPPORT_COLOR): LegendEntry {
  return { key: 'SUPPORT', label: 'Support seat', kind: 'support', color, programCode: SUPPORT_PROGRAM.code };
}

/** Legend used when the workbook has no (readable) Legend sheet: every known program plus the three fixed categories. */
export function defaultLegend(programs: KnownProgram[]): LegendEntry[] {
  return [
    ...programs.map<LegendEntry>((p) => ({
      key: p.code.toUpperCase(),
      label: p.name,
      kind: 'program',
      color: p.color,
      programCode: p.code,
    })),
    vacantEntry(),
    nonUsableEntry(),
    supportEntry(),
  ];
}

/** Maps the words people type in a legend (Allocated, Not usable, IT support...) to a category. */
export function kindFromText(text: string): CellKind | null {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;
  if (/non[\s-]?usable|not[\s-]?usable|unusable|blocked|out of (order|service)|damaged|broken/.test(t)) return 'nonusable';
  if (/vacan|free|empty|available|unallocated/.test(t)) return 'vacant';
  if (/support|admin|helpdesk|help desk|\bit\b|\bhr\b|facilit|reserved/.test(t)) return 'support';
  if (/program|alloc|occup|team|client|project/.test(t)) return 'program';
  return null;
}
