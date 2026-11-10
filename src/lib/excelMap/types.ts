// Shared model for an Excel-drawn floor map: one bordered cell = one seat,
// merged bordered ranges = rooms. Used by the reader, writer, HTML view,
// editor and the import API.

export type CellKind = 'program' | 'vacant' | 'nonusable' | 'support';

export interface LegendEntry {
  /** Stable id that seats point at, e.g. "RDUK", "VACANT". */
  key: string;
  /** What the legend says, e.g. "Duck" or "IT Helpdesk". */
  label: string;
  kind: CellKind;
  /** Border colour used in Excel, "#rrggbb". */
  color: string;
  /** kind = program: the program's code (or name) in the app. kind = support: optional program to book support seats under. */
  programCode?: string;
}

export interface MapSeat {
  /** 0-based position in the trimmed grid. */
  row: number;
  col: number;
  /** Text in the Excel cell, e.g. "A-001". May be empty. */
  label: string;
  legendKey: string;
}

export interface MapRoom {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  label: string;
  /** Border colour "#rrggbb". */
  color: string;
}

export interface FloorMapModel {
  title: string;
  rows: number;
  cols: number;
  legend: LegendEntry[];
  seats: MapSeat[];
  rooms: MapRoom[];
  /** Things the reader could not interpret; shown to the user, never silently dropped. */
  warnings: string[];
}

export const KIND_LABEL: Record<CellKind, string> = {
  program: 'Program',
  vacant: 'Vacant',
  nonusable: 'Non-usable',
  support: 'Support',
};
