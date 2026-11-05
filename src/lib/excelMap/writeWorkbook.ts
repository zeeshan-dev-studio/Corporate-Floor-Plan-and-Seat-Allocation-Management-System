import ExcelJS from 'exceljs';
import { lighten } from './colors';
import { ROOM_COLOR } from './palette';
import { CellKind, FloorMapModel, KIND_LABEL } from './types';

// Where the map starts on the sheet (1-based): leaves room for a title above and a margin on the left.
export const MAP_ROW0 = 4;
export const MAP_COL0 = 2;

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();

function boxBorder(hex: string, style: ExcelJS.BorderStyle = 'medium'): Partial<ExcelJS.Borders> {
  const edge = { style, color: { argb: argb(hex) } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

/** Fill used inside a seat box: a pale tint of the border colour so the map is readable at a glance. */
function seatFill(hex: string, kind: CellKind): string {
  if (kind === 'vacant') return '#ffffff';
  return lighten(hex, 0.86);
}

/** Builds the same kind of workbook people draw by hand: a Floor Plan sheet of coloured boxes and a Legend sheet. */
export function buildFloorMapWorkbook(model: FloorMapModel): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Floor Plan & Seat Allocation';
  const ws = wb.addWorksheet('Floor Plan', {
    views: [{ showGridLines: false, zoomScale: 90 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  ws.getColumn(1).width = 2;
  for (let c = 0; c < model.cols; c++) ws.getColumn(MAP_COL0 + c).width = 5.4;
  for (let r = 0; r < model.rows; r++) ws.getRow(MAP_ROW0 + r).height = 31;

  ws.getCell(1, 1).value = model.title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  ws.getCell(2, 1).value = 'One coloured box = one seat. The border colour says who it belongs to (see the Legend sheet). Merged boxes are rooms.';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

  const byKey: Record<string, (typeof model.legend)[number]> = {};
  model.legend.forEach((e) => (byKey[e.key] = e));

  // Rooms first: merged, dark border, label centred
  model.rooms.forEach((room) => {
    const r1 = MAP_ROW0 + room.row;
    const c1 = MAP_COL0 + room.col;
    const r2 = r1 + room.rowSpan - 1;
    const c2 = c1 + room.colSpan - 1;
    const colour = room.color || ROOM_COLOR;
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c);
        const edge = { style: 'medium' as ExcelJS.BorderStyle, color: { argb: argb(colour) } };
        cell.border = {
          top: r === r1 ? edge : undefined,
          bottom: r === r2 ? edge : undefined,
          left: c === c1 ? edge : undefined,
          right: c === c2 ? edge : undefined,
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(lighten(colour, 0.92)) } };
      }
    }
    if (r2 > r1 || c2 > c1) ws.mergeCells(r1, c1, r2, c2);
    const master = ws.getCell(r1, c1);
    master.value = room.label || null;
    master.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    master.font = { bold: true, size: 9, color: { argb: argb(colour) } };
  });

  // Seats: one box each
  model.seats.forEach((seat) => {
    const entry = byKey[seat.legendKey];
    if (!entry) return;
    const cell = ws.getCell(MAP_ROW0 + seat.row, MAP_COL0 + seat.col);
    cell.value = seat.label || null;
    cell.border = boxBorder(entry.color);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(seatFill(entry.color, entry.kind)) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
    cell.font = { size: 8, color: { argb: 'FF1E293B' } };
  });

  // Legend sheet
  const lg = wb.addWorksheet('Legend', { views: [{ showGridLines: false }] });
  lg.columns = [
    { width: 10 },
    { width: 11 },
    { width: 28 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
  ];
  lg.getCell(1, 1).value = 'Legend';
  lg.getCell(1, 1).font = { bold: true, size: 14 };
  const header = ['Swatch', 'Hex', 'Meaning', 'Category', 'Program code', 'Seats on map'];
  header.forEach((h, i) => {
    const cell = lg.getCell(3, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle' };
  });

  const counts: Record<string, number> = {};
  model.seats.forEach((s) => (counts[s.legendKey] = (counts[s.legendKey] || 0) + 1));
  model.legend.forEach((e, i) => {
    const r = 4 + i;
    lg.getRow(r).height = 24;
    const sw = lg.getCell(r, 1);
    sw.border = boxBorder(e.color);
    sw.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(seatFill(e.color, e.kind)) } };
    lg.getCell(r, 2).value = e.color.toUpperCase();
    lg.getCell(r, 3).value = e.label;
    lg.getCell(r, 4).value = KIND_LABEL[e.kind];
    lg.getCell(r, 5).value = e.programCode || null;
    lg.getCell(r, 6).value = counts[e.key] || 0;
    for (let c = 2; c <= 6; c++) lg.getCell(r, c).alignment = { vertical: 'middle' };
  });

  const roomRow = 4 + model.legend.length;
  lg.getRow(roomRow).height = 24;
  const rs = lg.getCell(roomRow, 1);
  rs.border = boxBorder(ROOM_COLOR);
  rs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(lighten(ROOM_COLOR, 0.92)) } };
  lg.getCell(roomRow, 2).value = ROOM_COLOR.toUpperCase();
  lg.getCell(roomRow, 3).value = 'Room / facility (merged cells)';
  lg.getCell(roomRow, 4).value = 'Room';
  lg.getCell(roomRow, 6).value = model.rooms.length;
  for (let c = 2; c <= 6; c++) lg.getCell(roomRow, c).alignment = { vertical: 'middle' };

  const notes = [
    'How to read this workbook',
    '1. One bordered cell is one seat. The text in the cell is the seat number, for example A-001.',
    '2. The border colour decides the category. Add a row here for every colour you use.',
    '3. Category is one of: Program, Vacant, Non-usable, Support. Use the Program code column for program rows.',
    '4. A merged, bordered block is a room or facility (meeting room, pantry, lift).',
    '5. Cells with no border and no fill are corridors and are ignored.',
  ];
  notes.forEach((t, i) => {
    const cell = lg.getCell(roomRow + 2 + i, 1);
    cell.value = t;
    cell.font = i === 0 ? { bold: true } : { size: 10, color: { argb: 'FF475569' } };
  });

  return wb;
}

export async function floorMapToBuffer(model: FloorMapModel): Promise<ArrayBuffer> {
  const wb = buildFloorMapWorkbook(model);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
