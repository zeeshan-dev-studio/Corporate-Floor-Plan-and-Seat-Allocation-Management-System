import { nonUsableEntry, ROOM_COLOR, supportEntry, vacantEntry } from './palette';
import { FloorMapModel, LegendEntry, MapRoom, MapSeat } from './types';

// Same programs and colours as the demo data, so the sample lines up with the app out of the box.
const PROGRAMS: LegendEntry[] = [
  { key: 'AMZN', label: 'Amazon', kind: 'program', color: '#f97316', programCode: 'AMZN' },
  { key: 'MCFE', label: 'McAfee', kind: 'program', color: '#ef4444', programCode: 'MCFE' },
  { key: 'TMOB', label: 'T-Mobile', kind: 'program', color: '#ec4899', programCode: 'TMOB' },
  { key: 'WAYF', label: 'Wayfair', kind: 'program', color: '#8b5cf6', programCode: 'WAYF' },
  { key: 'HCG', label: 'Healthcare Global', kind: 'program', color: '#06b6d4', programCode: 'HCG' },
];

const POD_ROWS = [6, 10, 14, 18, 22, 26];
const POD_W = 6;
const POD_H = 2;

// Zone -> the two pod columns -> what each of the six pod rows holds.
const ZONES: Array<{ code: string; cols: number[]; rows: string[][] }> = [
  {
    code: 'A',
    cols: [0, 8],
    rows: [['AMZN', 'AMZN'], ['AMZN', 'AMZN'], ['AMZN', 'AMZN'], ['AMZN', 'MCFE'], ['MCFE', 'MCFE'], ['MCFE', 'SUPPORT']],
  },
  {
    code: 'B',
    cols: [18, 26],
    rows: [['TMOB', 'TMOB'], ['TMOB', 'TMOB'], ['TMOB', 'WAYF'], ['WAYF', 'WAYF'], ['WAYF', 'VACANT'], ['VACANT', 'VACANT']],
  },
  {
    code: 'C',
    cols: [36, 44],
    rows: [['HCG', 'HCG'], ['HCG', 'MCFE'], ['MCFE', 'MCFE'], ['AMZN', 'AMZN'], ['AMZN', 'SUPPORT'], ['SUPPORT', 'VACANT']],
  },
];

// label, row, col, rowSpan, colSpan
const ROOMS: Array<[string, number, number, number, number]> = [
  ['Reception', 0, 0, 4, 6],
  ['Meeting Room 1', 0, 7, 4, 5],
  ['Meeting Room 2', 0, 13, 4, 5],
  ['Training Room', 0, 19, 4, 9],
  ['Cafeteria & Pantry', 0, 29, 4, 12],
  ['Server Room', 0, 42, 4, 5],
  ['Electrical', 0, 48, 4, 4],
  ['Lift Lobby', 0, 52, 5, 6],
  ['Washroom (Men)', 6, 52, 5, 6],
  ['Washroom (Women)', 12, 52, 5, 6],
  ['Stairs & Fire Exit', 18, 52, 5, 6],
  ['Wellness Room', 24, 52, 5, 6],
  ['Board Room', 30, 0, 4, 10],
  ['Huddle Rooms', 30, 11, 4, 6],
  ['Print & Copy', 30, 18, 4, 5],
  ['Storage', 30, 24, 4, 6],
  ['IT Store', 30, 31, 4, 6],
  ['Phone Booths', 30, 38, 4, 6],
  ['Quiet Room', 30, 45, 4, 6],
];

const pad3 = (n: number) => String(n).padStart(3, '0');

/** A believable 58 x 34 cell floor: three zones of desk pods, rooms around the edge, a mix of every category. */
export function buildSampleModel(): FloorMapModel {
  const seats: MapSeat[] = [];
  let podIndex = 0;

  ZONES.forEach((zone) => {
    let n = 0;
    POD_ROWS.forEach((row, ri) => {
      zone.cols.forEach((col, ci) => {
        const podKey = zone.rows[ri][ci];
        for (let i = 0; i < POD_W * POD_H; i++) {
          n++;
          let key = podKey;
          // Real floors are never perfectly full: a couple of empty desks at the end of some pods...
          if (podKey !== 'VACANT' && podKey !== 'SUPPORT' && podIndex % 5 === 2 && i >= 10) key = 'VACANT';
          // ...and the odd broken or taken-out desk.
          if (podKey !== 'VACANT' && (podIndex * 7 + i * 3) % 53 === 0) key = 'NONUSABLE';
          seats.push({
            row: row + Math.floor(i / POD_W),
            col: col + (i % POD_W),
            label: zone.code + '-' + pad3(n),
            legendKey: key,
          });
        }
        podIndex++;
      });
    });
  });

  const rooms: MapRoom[] = ROOMS.map(([label, row, col, rowSpan, colSpan]) => ({
    label,
    row,
    col,
    rowSpan,
    colSpan,
    color: ROOM_COLOR,
  }));

  return {
    title: 'Chennai Campus - Building F2 - Floor 4 (sample map)',
    rows: 34,
    cols: 58,
    legend: [...PROGRAMS, vacantEntry(), nonUsableEntry(), supportEntry()],
    seats,
    rooms,
    warnings: [],
  };
}
