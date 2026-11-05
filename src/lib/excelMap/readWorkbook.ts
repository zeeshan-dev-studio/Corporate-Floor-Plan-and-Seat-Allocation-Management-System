import type ExcelJS from 'exceljs';
import { applyTint, colorDistance, normalizeHex } from './colors';
import { defaultLegend, kindFromText, KnownProgram } from './palette';
import { FloorMapModel, LegendEntry, MapRoom, MapSeat } from './types';

export interface ReadOptions {
  /** Programs already in the app; used for the legend when the workbook has none. */
  knownPrograms?: KnownProgram[];
  /** Force a specific worksheet for the map. */
  sheetName?: string;
  /** Max RGB distance between a cell colour and a legend colour to count as a match. */
  tolerance?: number;
}

// Office theme palette (theme index -> colour), for cells coloured from the Excel colour picker.
const THEME = ['ffffff', '000000', 'e7e6e6', '44546a', '4472c4', 'ed7d31', 'a5a5a5', 'ffc000', '5b9bd5', '70ad47'];
const INDEXED: Record<number, string> = {
  8: '000000', 9: 'ffffff', 10: 'ff0000', 11: '00ff00', 12: '0000ff', 13: 'ffff00', 14: 'ff00ff', 15: '00ffff', 64: '000000',
};

/** Resolves an ExcelJS colour object (argb, theme+tint or indexed) to "#rrggbb". */
export function resolveColor(c: any): string | null {
  if (!c) return null;
  if (typeof c.argb === 'string') return normalizeHex(c.argb);
  if (typeof c.theme === 'number' && THEME[c.theme]) return applyTint('#' + THEME[c.theme], c.tint || 0);
  if (typeof c.indexed === 'number' && INDEXED[c.indexed]) return '#' + INDEXED[c.indexed];
  return null;
}

/** The colour most of a cell's four borders share (Excel stores a shared edge on only one of two cells). */
function borderColor(cell: ExcelJS.Cell): string | null {
  const b: any = cell.border;
  if (!b) return null;
  const votes: Record<string, number> = {};
  let best: string | null = null;
  (['top', 'left', 'bottom', 'right'] as const).forEach((side) => {
    const edge = b[side];
    if (!edge || !edge.style) return;
    const hex = resolveColor(edge.color) || '#000000'; // the automatic border colour is black
    votes[hex] = (votes[hex] || 0) + 1;
    if (!best || votes[hex] > votes[best]) best = hex;
  });
  return best;
}

function fillColor(cell: ExcelJS.Cell): string | null {
  const f: any = cell.fill;
  if (!f || f.type !== 'pattern' || f.pattern !== 'solid') return null;
  return resolveColor(f.fgColor);
}

function colToNum(letters: string): number {
  return letters.toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

function parseRange(ref: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const m = ref.match(/^\$?([A-Za-z]+)\$?(\d+)(?::\$?([A-Za-z]+)\$?(\d+))?$/);
  if (!m) return null;
  const c1 = colToNum(m[1]);
  const r1 = parseInt(m[2], 10);
  return { r1, c1, r2: m[4] ? parseInt(m[4], 10) : r1, c2: m[3] ? colToNum(m[3]) : c1 };
}

function textOf(cell: ExcelJS.Cell): string {
  try {
    return (cell.text ?? '').toString().replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function nearest(legend: LegendEntry[], hex: string | null, tolerance: number): LegendEntry | null {
  if (!hex) return null;
  let best: LegendEntry | null = null;
  let bestDist = Infinity;
  for (const e of legend) {
    const d = colorDistance(hex, e.color);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best && bestDist <= tolerance ? best : null;
}

/** Reads the Legend sheet: Swatch, Hex, Meaning, Category, Program code. Returns [] when there is no usable one. */
export function readLegend(wb: ExcelJS.Workbook): LegendEntry[] {
  const ws = wb.worksheets.find((s) => /legend|key|colou?r/i.test(s.name));
  if (!ws) return [];

  let headerRow = 0;
  const cols: Record<string, number> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 12) && !headerRow; r++) {
    const found: Record<string, number> = {};
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, c) => {
      const t = textOf(cell).toLowerCase();
      if (/^(meaning|label|name|description)$/.test(t)) found.meaning = c;
      else if (/^(category|type|kind)$/.test(t)) found.category = c;
      else if (/^(hex|colou?r code|colou?r hex)$/.test(t)) found.hex = c;
      else if (/^(swatch|colou?r)$/.test(t)) found.swatch = c;
      else if (/program/.test(t)) found.program = c;
    });
    if (found.meaning && found.category) {
      headerRow = r;
      Object.assign(cols, found);
    }
  }
  if (!headerRow) return [];

  const out: LegendEntry[] = [];
  const keys = new Set<string>();
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const label = textOf(row.getCell(cols.meaning));
    const categoryText = textOf(row.getCell(cols.category));
    if (!label && !categoryText) continue;
    const kind = categoryText ? kindFromText(categoryText) : kindFromText(label);
    if (!kind) continue; // rooms, notes and other rows are not seat categories

    let color: string | null = null;
    if (cols.hex) color = normalizeHex(textOf(row.getCell(cols.hex)));
    if (!color && cols.swatch) {
      const sw = row.getCell(cols.swatch);
      color = borderColor(sw) || fillColor(sw);
    }
    if (!color) continue;

    const programCode = cols.program ? textOf(row.getCell(cols.program)) : '';
    let key = (programCode || label).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || kind.toUpperCase();
    if (kind === 'vacant') key = 'VACANT';
    if (kind === 'nonusable') key = 'NONUSABLE';
    while (keys.has(key)) key += '-2';
    keys.add(key);
    out.push({ key, label: label || categoryText, kind, color, programCode: programCode || undefined });
  }
  return out;
}

/**
 * Reads an Excel floor map. Every bordered (or filled) single cell whose colour matches a legend colour is a seat;
 * every bordered merged range is a room. Anything it cannot place is reported in warnings.
 */
export function readFloorMap(wb: ExcelJS.Workbook, opts: ReadOptions = {}): FloorMapModel {
  const tolerance = opts.tolerance ?? 70;
  const warnings: string[] = [];

  const ws =
    (opts.sheetName && wb.getWorksheet(opts.sheetName)) ||
    wb.worksheets.find((s) => /floor|plan|map|layout|seat/i.test(s.name) && !/legend/i.test(s.name)) ||
    wb.worksheets.find((s) => !/legend|key/i.test(s.name)) ||
    wb.worksheets[0];
  if (!ws) throw new Error('The workbook has no worksheets.');

  let legend = readLegend(wb);
  if (!legend.length) {
    legend = defaultLegend(opts.knownPrograms || []);
    warnings.push('No usable Legend sheet was found, so the standard colours and the programs already in the app were used.');
  }

  // Merged ranges that have a border are rooms; their cells are not seats.
  const merged: Array<{ r1: number; c1: number; r2: number; c2: number }> = [];
  const mergeRefs: string[] = (ws as any).model?.merges || [];
  mergeRefs.forEach((ref) => {
    const rg = parseRange(ref);
    if (rg && (rg.r2 > rg.r1 || rg.c2 > rg.c1)) merged.push(rg);
  });
  const inMerge = (r: number, c: number) => merged.find((m) => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2);

  const rooms: Array<{ r: number; c: number; rs: number; cs: number; label: string; color: string }> = [];
  merged.forEach((m) => {
    const votes: Record<string, number> = {};
    let best: string | null = null;
    for (let r = m.r1; r <= m.r2; r++) {
      for (let c = m.c1; c <= m.c2; c++) {
        const hex = borderColor(ws.getCell(r, c));
        if (!hex) continue;
        votes[hex] = (votes[hex] || 0) + 1;
        if (!best || votes[hex] > votes[best]) best = hex;
      }
    }
    if (!best) return; // an unbordered merge is a title or note, not a room
    rooms.push({ r: m.r1, c: m.c1, rs: m.r2 - m.r1 + 1, cs: m.c2 - m.c1 + 1, label: textOf(ws.getCell(m.r1, m.c1)), color: best });
  });

  const seats: Array<{ r: number; c: number; label: string; key: string }> = [];
  const unmatched: string[] = [];
  const unmatchedFilled: string[] = [];
  const lastRow = ws.rowCount;
  const lastCol = ws.columnCount;
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      if (inMerge(r, c)) continue;
      const cell = ws.getCell(r, c);
      const bc = borderColor(cell);
      const fc = fillColor(cell);
      if (!bc && !fc) continue;
      // A coloured border wins; a fill is only trusted when the border does not match (or is absent).
      const hit = nearest(legend, bc, tolerance) || nearest(legend, fc, tolerance);
      if (hit) {
        seats.push({ r, c, label: textOf(cell), key: hit.key });
      } else if (bc) {
        unmatched.push(cell.address);
      } else if (textOf(cell)) {
        unmatchedFilled.push(cell.address);
      }
    }
  }
  const describe = (list: string[], what: string) => {
    const sample = list.slice(0, 6).join(', ') + (list.length > 6 ? ', ...' : '');
    return list.length + (list.length === 1 ? ' ' + what + ' (' : ' ' + what + 's (') + sample + (list.length === 1 ? ') uses a colour' : ') use colours') + ' that is not in the Legend, so ' + (list.length === 1 ? 'it was' : 'they were') + ' skipped.';
  };
  if (unmatched.length) warnings.push(describe(unmatched, 'bordered cell'));
  if (unmatchedFilled.length) warnings.push(describe(unmatchedFilled, 'filled cell with text'));
  const tinyRooms = rooms.filter((x) => x.rs * x.cs <= 2).map((x) => ws.getCell(x.r, x.c).address);
  if (tinyRooms.length) {
    const one = tinyRooms.length === 1;
    warnings.push(
      (one ? 'Merged box ' : 'Merged boxes ') + tinyRooms.slice(0, 6).join(', ') +
        (one ? ' covers only one or two cells and was read as a room. Unmerge it if it is a seat.' : ' cover only one or two cells and were read as rooms. Unmerge them if they are seats.')
    );
  }

  const all = [
    ...seats.map((s) => ({ r: s.r, c: s.c, r2: s.r, c2: s.c })),
    ...rooms.map((x) => ({ r: x.r, c: x.c, r2: x.r + x.rs - 1, c2: x.c + x.cs - 1 })),
  ];
  if (!all.length) {
    return { title: ws.name, rows: 0, cols: 0, legend, seats: [], rooms: [], warnings: [...warnings, 'No coloured cells were found on the map sheet.'] };
  }
  const minR = Math.min(...all.map((a) => a.r));
  const minC = Math.min(...all.map((a) => a.c));
  const maxR = Math.max(...all.map((a) => a.r2));
  const maxC = Math.max(...all.map((a) => a.c2));

  const mapSeats: MapSeat[] = seats.map((s) => ({ row: s.r - minR, col: s.c - minC, label: s.label, legendKey: s.key }));
  const mapRooms: MapRoom[] = rooms.map((x) => ({ row: x.r - minR, col: x.c - minC, rowSpan: x.rs, colSpan: x.cs, label: x.label, color: x.color }));

  // Title: first non-empty text above the map, if the author put one there.
  let title = ws.name;
  for (let r = 1; r < minR && title === ws.name; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const t = textOf(ws.getCell(r, c));
      if (t) {
        title = t;
        break;
      }
    }
  }

  return { title, rows: maxR - minR + 1, cols: maxC - minC + 1, legend, seats: mapSeats, rooms: mapRooms, warnings };
}
