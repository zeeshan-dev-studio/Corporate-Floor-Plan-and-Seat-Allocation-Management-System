import { FloorObjectDTO, LayerId, Point, SeatDTO, ZoneDTO } from '@/types/floorplan';

/**
 * Drawing units. The canvas works in plain numbers; 10 of them are one foot, so the 20-unit grid
 * is a 2 ft grid, a 120 x 80 desk is 12 ft x 8 ft and a seat spacing of 45 x 50 is 4.5 ft x 5 ft.
 */
export const PX_PER_FT = 10;
export const SEAT_RADIUS = 10;
/** Default space one seat takes inside a workstation (units). */
export const SEAT_CELL_W = 45;
export const SEAT_CELL_H = 50;

export const LAYER_ORDER: LayerId[] = [
  'rooms',
  'architecture',
  'walls',
  'glass',
  'doors',
  'workstations',
  'furniture',
  'facilities',
  'it',
  'safety',
];

const DEFAULT_LAYER_BY_TYPE: Record<string, LayerId> = {
  room: 'rooms',
  wall: 'architecture',
  glass: 'glass',
  door: 'doors',
  bay: 'workstations',
  furniture: 'furniture',
  facility: 'facilities',
  it: 'it',
  safety: 'safety',
};

/** The layer an object is drawn on (and locked/hidden with). Unknown layer names fall back to the object's type. */
export const layerOf = (o: Pick<FloorObjectDTO, 'layer' | 'type'>): LayerId =>
  LAYER_ORDER.includes(o.layer) ? o.layer : DEFAULT_LAYER_BY_TYPE[o.type] || 'architecture';

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Objects rotate around their own centre. */
export function toWorld(o: Pick<FloorObjectDTO, 'x' | 'y' | 'width' | 'height' | 'rotation'>, lx: number, ly: number): Point {
  const cx = o.width / 2;
  const cy = o.height / 2;
  const r = rad(o.rotation || 0);
  const dx = lx - cx;
  const dy = ly - cy;
  return { x: o.x + cx + dx * Math.cos(r) - dy * Math.sin(r), y: o.y + cy + dx * Math.sin(r) + dy * Math.cos(r) };
}

export function toLocal(o: Pick<FloorObjectDTO, 'x' | 'y' | 'width' | 'height' | 'rotation'>, wx: number, wy: number): Point {
  const cx = o.width / 2;
  const cy = o.height / 2;
  const r = rad(-(o.rotation || 0));
  const dx = wx - (o.x + cx);
  const dy = wy - (o.y + cy);
  return { x: cx + dx * Math.cos(r) - dy * Math.sin(r), y: cy + dx * Math.sin(r) + dy * Math.cos(r) };
}

export const objectCenter = (o: FloorObjectDTO): Point => toWorld(o, o.width / 2, o.height / 2);

/** Axis-aligned bounds of an object on the floor, rotation included. */
export function worldBounds(o: FloorObjectDTO) {
  const corners = [toWorld(o, 0, 0), toWorld(o, o.width, 0), toWorld(o, o.width, o.height), toWorld(o, 0, o.height)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// ---------- Shapes ----------

export type ShapeId = 'rect' | 'circle' | 'L' | 'T' | 'U' | 'corner' | 'polygon';

export const SHAPE_CHOICES: Array<{ id: ShapeId; label: string }> = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'L', label: 'L-shape' },
  { id: 'T', label: 'T-shape' },
  { id: 'U', label: 'U-shape' },
  { id: 'corner', label: 'Cut corner' },
  { id: 'circle', label: 'Round / oval' },
];

export const objectPoints = (o: Pick<FloorObjectDTO, 'geometry'>): Point[] | null => {
  const pts = o.geometry?.points;
  return o.geometry?.shape === 'polygon' && Array.isArray(pts) && pts.length >= 3 ? pts : null;
};

export function shapePoints(id: ShapeId, w: number, h: number): Point[] | null {
  switch (id) {
    case 'L':
      return [{ x: 0, y: 0 }, { x: w * 0.5, y: 0 }, { x: w * 0.5, y: h * 0.5 }, { x: w, y: h * 0.5 }, { x: w, y: h }, { x: 0, y: h }];
    case 'T':
      return [
        { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h * 0.35 }, { x: w * 0.65, y: h * 0.35 },
        { x: w * 0.65, y: h }, { x: w * 0.35, y: h }, { x: w * 0.35, y: h * 0.35 }, { x: 0, y: h * 0.35 },
      ];
    case 'U':
      return [
        { x: 0, y: 0 }, { x: w * 0.3, y: 0 }, { x: w * 0.3, y: h * 0.6 }, { x: w * 0.7, y: h * 0.6 },
        { x: w * 0.7, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
      ];
    case 'corner':
      return [{ x: 0, y: 0 }, { x: w * 0.7, y: 0 }, { x: w, y: h * 0.3 }, { x: w, y: h }, { x: 0, y: h }];
    default:
      return null;
  }
}

export const shapeOf = (o: Pick<FloorObjectDTO, 'geometry'>): ShapeId =>
  o.geometry?.shape === 'circle' ? 'circle' : objectPoints(o) ? 'polygon' : 'rect';

/** Geometry for an object that should take the given shape at its current size. */
export function geometryForShape(o: FloorObjectDTO, id: ShapeId): FloorObjectDTO['geometry'] {
  const { points, shape, ...rest } = o.geometry || {};
  void points;
  void shape;
  if (id === 'rect') return { ...rest, shape: 'rect' };
  if (id === 'circle') return { ...rest, shape: 'circle' };
  const pts = shapePoints(id, o.width, o.height);
  return pts ? { ...rest, shape: 'polygon', points: pts } : { ...rest, shape: 'rect' };
}

export function polygonArea(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(pts: Point[]): Point {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

export function pointInPolygon(x: number, y: number, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Floor area in square feet, worked out from the drawn shape (so it never disagrees with the drawing). */
export function objectAreaSqFt(o: FloorObjectDTO): number {
  const pts = objectPoints(o);
  let area: number;
  if (pts) area = polygonArea(pts);
  else if (o.geometry?.shape === 'circle') area = (Math.PI * o.width * o.height) / 4;
  else area = o.width * o.height;
  return Math.round(area / (PX_PER_FT * PX_PER_FT));
}

export const formatFeet = (units: number) => {
  const ft = units / PX_PER_FT;
  return (Math.round(ft * 10) / 10).toString();
};

/** A drawn polygon (world coordinates) as an object box plus local points. */
export function polygonToBox(world: Point[]) {
  const minX = Math.min(...world.map((p) => p.x));
  const minY = Math.min(...world.map((p) => p.y));
  const maxX = Math.max(...world.map((p) => p.x));
  const maxY = Math.max(...world.map((p) => p.y));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    points: world.map((p) => ({ x: p.x - minX, y: p.y - minY })),
  };
}

/** The object after resizing it; polygon points scale with the box. */
export function resizedObject(o: FloorObjectDTO, width: number, height: number): FloorObjectDTO {
  const pts = objectPoints(o);
  if (!pts || o.width <= 0 || o.height <= 0) return { ...o, width, height };
  const sx = width / o.width;
  const sy = height / o.height;
  return { ...o, width, height, geometry: { ...o.geometry, points: pts.map((p) => ({ x: p.x * sx, y: p.y * sy })) } };
}

const insideLocal = (o: FloorObjectDTO, lx: number, ly: number) => {
  const pts = objectPoints(o);
  if (pts) return pointInPolygon(lx, ly, pts);
  if (o.geometry?.shape === 'circle') {
    const nx = (lx - o.width / 2) / (o.width / 2);
    const ny = (ly - o.height / 2) / (o.height / 2);
    return nx * nx + ny * ny <= 1;
  }
  return lx >= 0 && lx <= o.width && ly >= 0 && ly <= o.height;
};

// ---------- Seats inside a workstation ----------

export interface SeatSlot {
  x: number;
  y: number;
  rotation: number;
}

export interface SeatLayoutSpec {
  count: number;
  rows: number;
  cols: number;
  arrangement: 'grid' | 'around';
  facing: 'inward' | 'same';
}

export const layoutSpecOf = (o: FloorObjectDTO): SeatLayoutSpec => {
  const p = o.properties || {};
  const count = Math.max(0, Math.round(p.capacity ?? 0));
  const rows = Math.max(1, Math.round(p.seatRows ?? 1));
  const cols = Math.max(1, Math.round(p.seatCols ?? Math.max(1, Math.ceil(count / rows))));
  return { count, rows, cols, arrangement: p.arrangement || 'grid', facing: p.seatFacing || 'inward' };
};

/** Where each seat of a workstation sits, in floor coordinates. May return fewer than `count` when the shape cannot hold them. */
export function seatSlots(o: FloorObjectDTO, spec: SeatLayoutSpec): SeatSlot[] {
  const local: SeatSlot[] = [];
  const { count, rows, cols } = spec;

  if (spec.arrangement === 'around') {
    const pts = objectPoints(o);
    if (o.geometry?.shape === 'circle') {
      const rx = Math.max(4, o.width / 2 - 16);
      const ry = Math.max(4, o.height / 2 - 16);
      for (let i = 0; i < count; i++) {
        const phi = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, count);
        local.push({ x: o.width / 2 + rx * Math.cos(phi), y: o.height / 2 + ry * Math.sin(phi), rotation: (phi * 180) / Math.PI - 90 });
      }
    } else {
      const base: Point[] = pts || [{ x: 0, y: 0 }, { x: o.width, y: 0 }, { x: o.width, y: o.height }, { x: 0, y: o.height }];
      const c = polygonCentroid(base);
      const ring = base.map((p) => {
        const dx = c.x - p.x;
        const dy = c.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(16, d * 0.4) / d;
        return { x: p.x + dx * k, y: p.y + dy * k };
      });
      const lens = ring.map((p, i) => Math.hypot(ring[(i + 1) % ring.length].x - p.x, ring[(i + 1) % ring.length].y - p.y));
      const perimeter = lens.reduce((s, l) => s + l, 0) || 1;
      for (let i = 0; i < count; i++) {
        let s = ((i + 0.5) * perimeter) / Math.max(1, count);
        let e = 0;
        while (e < lens.length - 1 && s > lens[e]) {
          s -= lens[e];
          e++;
        }
        const a = ring[e];
        const b = ring[(e + 1) % ring.length];
        const t = lens[e] ? s / lens[e] : 0;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        local.push({ x: px, y: py, rotation: (Math.atan2(py - c.y, px - c.x) * 180) / Math.PI - 90 });
      }
    }
  } else {
    const cw = o.width / cols;
    const ch = o.height / rows;
    outer: for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lx = (c + 0.5) * cw;
        const ly = (r + 0.5) * ch;
        if (!insideLocal(o, lx, ly)) continue;
        local.push({ x: lx, y: ly, rotation: spec.facing === 'inward' && rows >= 2 && r < Math.floor(rows / 2) ? 180 : 0 });
        if (local.length >= count) break outer;
      }
    }
  }

  return local.map((s) => {
    const w = toWorld(o, s.x, s.y);
    return { x: w.x, y: w.y, rotation: Math.round((s.rotation + (o.rotation || 0)) * 100) / 100 };
  });
}

/** Moves the seats that belong to a workstation along with it (move, rotate, resize). */
export function carrySeats(oldObj: FloorObjectDTO, newObj: FloorObjectDTO, seats: SeatDTO[]): SeatDTO[] {
  const moved =
    oldObj.x !== newObj.x || oldObj.y !== newObj.y || oldObj.width !== newObj.width || oldObj.height !== newObj.height || oldObj.rotation !== newObj.rotation;
  if (!moved) return seats;
  const sx = oldObj.width > 0 ? newObj.width / oldObj.width : 1;
  const sy = oldObj.height > 0 ? newObj.height / oldObj.height : 1;
  const dRot = (newObj.rotation || 0) - (oldObj.rotation || 0);
  return seats.map((s) => {
    if (s.floorObjectId !== oldObj.id) return s;
    const l = toLocal(oldObj, s.x, s.y);
    const w = toWorld(newObj, l.x * sx, l.y * sy);
    return { ...s, x: Math.round(w.x * 100) / 100, y: Math.round(w.y * 100) / 100, rotation: Math.round(((s.rotation || 0) + dRot) * 100) / 100 };
  });
}

// ---------- Seat ids ----------

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** The id prefix of the seats already on the floor (CHN-F03), or one built from the building and floor. */
export function seatPrefixFor(seats: SeatDTO[], buildingCode: string | undefined, floorNumber: number | undefined): string {
  const parts = seats.find((s) => s.seatId.split('-').length >= 3)?.seatId.split('-');
  if (parts) return parts.slice(0, -2).join('-');
  return (buildingCode || 'FL') + '-F' + pad(floorNumber ?? 1, 2);
}

/** The zone new seats go into: the zone most seats already use. */
export function defaultZoneOf(seats: SeatDTO[], zones: ZoneDTO[]): ZoneDTO | null {
  const counts = new Map<string, number>();
  seats.forEach((s) => s.zoneId && counts.set(s.zoneId, (counts.get(s.zoneId) || 0) + 1));
  let best: string | null = null;
  counts.forEach((n, id) => {
    if (best === null || n > (counts.get(best) || 0)) best = id;
  });
  return zones.find((z) => z.id === best) || zones[0] || null;
}

/** The next `n` free seat ids in a zone, e.g. CHN-F03-A-129, CHN-F03-A-130. */
export function nextSeatIds(seats: SeatDTO[], prefix: string, zoneCode: string, n: number): string[] {
  const head = `${prefix}-${zoneCode}-`.toUpperCase();
  let max = 0;
  seats.forEach((s) => {
    const id = s.seatId.toUpperCase();
    if (id.startsWith(head)) {
      const num = parseInt(id.slice(head.length), 10);
      if (Number.isFinite(num)) max = Math.max(max, num);
    }
  });
  return Array.from({ length: n }, (_, i) => `${prefix}-${zoneCode}-${pad(max + i + 1, 3)}`);
}

export const newTempId = (kind: 'obj' | 'seat') => `temp-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function blankSeat(seatId: string, floorId: string, slot: SeatSlot, zoneId: string | null, floorObjectId: string | null, bayCode: string | null): SeatDTO {
  return {
    id: newTempId('seat'),
    seatId,
    floorId,
    zoneId,
    floorObjectId,
    bayCode,
    seatType: 'standard',
    x: Math.round(slot.x * 100) / 100,
    y: Math.round(slot.y * 100) / 100,
    rotation: slot.rotation,
    programId: null,
    programName: null,
    programCode: null,
    programColor: null,
    allocationStatus: 'UNALLOCATED',
    shift: null,
    employeeName: null,
    employeeId: null,
    effectiveDate: null,
    endDate: null,
    isBlocked: false,
  };
}

export const isDraftId = (id: string) => id.startsWith('temp-');

export interface BenchTile {
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
}

/** Longest run of seats on one bench before an aisle is needed. */
export const MAX_BENCH_COLS = 8;
/** Gap between benches: 6 ft along a row, 5 ft between rows. */
export const BENCH_AISLE_X = 60;
export const BENCH_AISLE_Y = 50;
export const MAX_TILES = 80;

/**
 * Fills a drawn area the way a BPO floor is laid out: benches of up to 8 seats a side, two rows
 * facing each other (one row if the area is shallow), with aisles between benches. A small box
 * gives a single bench; a large one gives as many benches as fit.
 */
export function tileBenches(x: number, y: number, w: number, h: number): BenchTile[] {
  const rows = h < SEAT_CELL_H * 1.5 ? 1 : 2;
  const depth = rows * SEAT_CELL_H;
  const tiles: BenchTile[] = [];
  for (let cy = y; cy + depth <= y + h + 1 && tiles.length < MAX_TILES; cy += depth + BENCH_AISLE_Y) {
    for (let cx = x; tiles.length < MAX_TILES; ) {
      const remaining = x + w - cx;
      const cols = Math.min(MAX_BENCH_COLS, Math.floor((remaining + 1) / SEAT_CELL_W));
      if (cols < 1) break;
      tiles.push({ x: cx, y: cy, width: cols * SEAT_CELL_W, height: depth, rows, cols });
      cx += cols * SEAT_CELL_W + BENCH_AISLE_X;
    }
  }
  // Too small for even one bench: still make the smallest one so the click is not wasted
  if (tiles.length === 0) tiles.push({ x, y, width: SEAT_CELL_W, height: SEAT_CELL_H, rows: 1, cols: 1 });
  return tiles;
}
