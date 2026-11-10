import { localDateString } from '@/lib/dates';
import {
  blankSeat,
  carrySeats,
  defaultZoneOf,
  isDraftId,
  layoutSpecOf,
  newTempId,
  nextSeatIds,
  seatPrefixFor,
  seatSlots,
  worldBounds,
} from '@/lib/floorGeometry';
import { create } from 'zustand';
import {
  FloorObjectDTO,
  SeatDTO,
  ProgramDTO,
  ZoneDTO,
  FloorDTO,
  BuildingDTO,
  LayerId,
  ToolMode,
  ViewMode,
  UserRole,
  RectBounds,
  AuditLogDTO,
  FloorVersionDTO,
  SeatStatus,
  SeatType,
  ObjectProperties,
} from '@/types/floorplan';

export interface LayerState {
  visible: boolean;
  locked: boolean;
  opacity: number;
}

const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  architecture: { visible: true, locked: false, opacity: 1 },
  walls: { visible: true, locked: false, opacity: 1 },
  doors: { visible: true, locked: false, opacity: 1 },
  glass: { visible: true, locked: false, opacity: 1 },
  rooms: { visible: true, locked: false, opacity: 1 },
  workstations: { visible: true, locked: false, opacity: 1 },
  seats: { visible: true, locked: false, opacity: 1 },
  furniture: { visible: true, locked: false, opacity: 1 },
  facilities: { visible: true, locked: false, opacity: 1 },
  it: { visible: true, locked: false, opacity: 1 },
  safety: { visible: true, locked: false, opacity: 1 },
};

interface HistorySnapshot {
  objects: FloorObjectDTO[];
  seats: SeatDTO[];
}

export interface FloorPlanStore {
  // Database Entities
  building: BuildingDTO | null;
  floor: FloorDTO | null;
  zones: ZoneDTO[];
  programs: ProgramDTO[];
  objects: FloorObjectDTO[];
  // Object ids as last loaded from / saved to the database; Save deletes any no longer in `objects`
  persistedObjectIds: string[];
  seats: SeatDTO[];
  // Seats as last loaded from / saved to the database (ids, and a fingerprint of their layout fields)
  persistedSeatIds: string[];
  seatBaseline: Record<string, string>;
  // Unsaved layout edits exist
  isDirty: boolean;
  // Size of the canvas on screen, so new objects can be placed in the middle of what the user sees
  viewport: { width: number; height: number };
  versions: FloorVersionDTO[];
  auditLogs: AuditLogDTO[];
  isLoading: boolean;
  isSaving: boolean;

  // View & Nav
  zoom: number;
  panX: number;
  panY: number;
  viewMode: ViewMode;
  activeTool: ToolMode;
  activeRole: UserRole;
  selectedProgramFilter: string | null;
  selectedStatusFilter: string | null;
  asOfDate: string;

  // Selection
  selectedObjectIds: string[];
  selectedSeatIds: string[];
  hoverObjectId: string | null;
  hoverSeatId: string | null;
  marqueeBox: RectBounds | null;

  // Canvas Settings
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
  showMinimap: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  layers: Record<LayerId, LayerState>;

  // Undo / Redo
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Modals & Panels
  isBulkAssignOpen: boolean;
  isBulkBlockOpen: boolean;
  isBulkUnallocateOpen: boolean;
  isExcelImportOpen: boolean;
  isExcelMapOpen: boolean;
  isExportModalOpen: boolean;
  isVersionModalOpen: boolean;
  isAuditModalOpen: boolean;
  isAnalyticsDrawerOpen: boolean;

  // Actions
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (panX: number, panY: number) => void;
  resetView: () => void;
  setFloorSize: (width: number, height: number) => void;
  zoomToSeat: (seatId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: ToolMode) => void;
  setActiveRole: (role: UserRole) => void;
  setProgramFilter: (progId: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  setAsOfDate: (dateStr: string) => void;

  // Layer Toggles
  toggleLayer: (layerId: LayerId) => void;
  setLayerLocked: (layerId: LayerId, locked: boolean) => void;
  setLayerOpacity: (layerId: LayerId, opacity: number) => void;

  // Selection Actions
  selectSeat: (seatId: string, multi?: boolean) => void;
  selectSeats: (seatIds: string[]) => void;
  selectObject: (id: string, multi?: boolean) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  setMarqueeBox: (box: RectBounds | null) => void;
  selectSeatsInBox: (box: RectBounds) => void;
  selectSeatsByZone: (zoneId: string) => void;
  selectSeatsByBay: (bayCode: string) => void;
  selectSeatsByProgram: (programId: string) => void;
  selectSeatsByStatus: (status: SeatStatus) => void;
  selectAllSeats: () => void;
  setHoverSeat: (id: string | null) => void;
  setHoverObject: (id: string | null) => void;

  // CAD Operations
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateObject: (obj: FloorObjectDTO) => void;
  /** Apply object changes without an undo step (the caller pushes history once at the start of a drag). */
  updateObjectsLive: (objs: FloorObjectDTO[]) => void;
  moveSeatsLive: (pos: Record<string, { x: number; y: number }>) => void;
  addObject: (obj: FloorObjectDTO) => void;
  /** Add a workstation together with its seats. */
  addBay: (obj: FloorObjectDTO) => void;
  deleteSelectedObjects: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
  alignSelection: (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => void;
  /** Re-lay a workstation's seats after its seat count / rows / columns / arrangement changed. Returns how many seats it now has. */
  regenerateBaySeats: (objectId: string, patch: Partial<ObjectProperties>, geometry?: FloorObjectDTO['geometry']) => number;
  setSelectedSeatType: (type: SeatType) => void;
  addSeatAt: (x: number, y: number) => void;
  setViewport: (width: number, height: number) => void;
  setSnapToGrid: (val: boolean) => void;
  setShowGrid: (val: boolean) => void;
  setShowRulers: (val: boolean) => void;
  setShowMinimap: (val: boolean) => void;
  setLeftPanelOpen: (val: boolean) => void;
  setRightPanelOpen: (val: boolean) => void;

  // Modals Actions
  setBulkAssignOpen: (open: boolean) => void;
  setBulkBlockOpen: (open: boolean) => void;
  setBulkUnallocateOpen: (open: boolean) => void;
  setExcelImportOpen: (open: boolean) => void;
  setExcelMapOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setVersionModalOpen: (open: boolean) => void;
  setAuditModalOpen: (open: boolean) => void;
  setAnalyticsDrawerOpen: (open: boolean) => void;
  closeDialogs: () => void;

  // Network Actions
  loadFloorData: (floorId: string, asOfDate?: string, opts?: { keepLayout?: boolean }) => Promise<void>;
  saveFloorLayout: () => Promise<void>;
  bulkAssignProgram: (programId: string, effectiveDate?: string, shift?: string) => Promise<boolean>;
  bulkRemoveAllocation: () => Promise<boolean>;
  bulkBlockSeats: (reason: string, startDate?: string, endDate?: string, notes?: string) => Promise<boolean>;
  bulkUnblockSeats: () => Promise<boolean>;
  bulkChangeZone: (zoneId: string) => Promise<boolean>;
}

// Modal dialogs, which own the keyboard while open (the capacity drawer is not one of them)
export const isDialogOpen = (s: FloorPlanStore) =>
  s.isBulkAssignOpen ||
  s.isBulkBlockOpen ||
  s.isBulkUnallocateOpen ||
  s.isExcelImportOpen ||
  s.isExcelMapOpen ||
  s.isExportModalOpen ||
  s.isVersionModalOpen ||
  s.isAuditModalOpen;

const LAYOUT_ROLES: UserRole[] = ['Administrator', 'Facility Manager'];

/** The seat fields that belong to the floor layout (what Save writes), as a comparable string. */
const layoutKey = (x: SeatDTO) =>
  JSON.stringify([Math.round(x.x * 100) / 100, Math.round(x.y * 100) / 100, x.rotation, x.floorObjectId || null, x.seatType, x.zoneId || null]);

const baselineOf = (list: SeatDTO[]): Record<string, string> => {
  const out: Record<string, string> = {};
  list.forEach((x) => (out[x.id] = layoutKey(x)));
  return out;
};

const seatForSave = (x: SeatDTO) => ({
  id: x.id,
  seatId: x.seatId,
  zoneId: x.zoneId || null,
  floorObjectId: x.floorObjectId || null,
  bayCode: x.bayCode || null,
  seatType: x.seatType,
  x: x.x,
  y: x.y,
  rotation: x.rotation || 0,
});

/** After a reload for allocation changes: fresh allocation data from the server, layout edits from the editor. */
const mergeSeats = (fresh: SeatDTO[], current: SeatDTO[], persistedIds: string[]): SeatDTO[] => {
  const cur = new Map(current.map((x) => [x.id, x]));
  const removedInEditor = new Set(persistedIds.filter((id) => !cur.has(id)));
  const out = fresh
    .filter((x) => !removedInEditor.has(x.id))
    .map((x) => {
      const c = cur.get(x.id);
      return c ? { ...x, x: c.x, y: c.y, rotation: c.rotation, floorObjectId: c.floorObjectId, seatType: c.seatType } : x;
    });
  current.forEach((x) => isDraftId(x.id) && out.push(x));
  return out;
};

/** Undo/redo: layout fields come from the snapshot, allocation data stays as it is now. */
const restoreSeats = (current: SeatDTO[], snap: SeatDTO[]): SeatDTO[] => {
  const cur = new Map(current.map((x) => [x.id, x]));
  const inSnap = new Set(snap.map((x) => x.id));
  const out = snap.map((x) => {
    const c = cur.get(x.id);
    return c ? { ...c, x: x.x, y: x.y, rotation: x.rotation, floorObjectId: x.floorObjectId, seatType: x.seatType, bayCode: x.bayCode } : x;
  });
  current.forEach((x) => !inSnap.has(x.id) && !isDraftId(x.id) && out.push(x));
  return out;
};

const draftSeatsSelected = (ids: string[]) => {
  if (!ids.some(isDraftId)) return false;
  alert('Some selected seats are new and not saved yet. Press Save first, then allocate them.');
  return true;
};

/** A bay label no other workstation uses: WS-04 becomes WS-05 when WS-04 is taken. */
const uniqueBayLabel = (label: string, objects: FloorObjectDTO[]): string => {
  const taken = new Set(objects.filter((o) => o.type === 'bay').map((o) => (o.properties?.label || '').toLowerCase()));
  if (!label || !taken.has(label.toLowerCase())) return label;
  const stem = label.replace(/\d+$/, '').replace(/[-_ ]+$/, '');
  const width = (label.match(/\d+$/)?.[0] || '').length || 2;
  let max = 0;
  objects.forEach((o) => {
    const l = o.properties?.label || '';
    if (o.type === 'bay' && l.toLowerCase().startsWith(stem.toLowerCase())) {
      const n = parseInt(l.slice(stem.length).replace(/^[-_ ]+/, ''), 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  });
  return `${stem}-${String(max + 1).padStart(width, '0')}`;
};

const confirmLosingAllocations = (list: SeatDTO[], what: string): boolean => {
  const used = list.filter((x) => x.programId || x.employeeName).length;
  if (!used) return true;
  return window.confirm(
    `${what} removes ${list.length} seat${list.length === 1 ? '' : 's'}, ${used} of which ${used === 1 ? 'is' : 'are'} allocated. ` +
      `Their allocations are deleted when you press Save. Continue?`
  );
};

export const useFloorPlanStore = create<FloorPlanStore>((set, get) => ({
  building: null,
  floor: null,
  zones: [],
  programs: [],
  objects: [],
  persistedObjectIds: [],
  seats: [],
  persistedSeatIds: [],
  seatBaseline: {},
  isDirty: false,
  viewport: { width: 1200, height: 800 },
  versions: [],
  auditLogs: [],
  isLoading: false,
  isSaving: false,

  zoom: 0.65,
  panX: 120,
  panY: 80,
  viewMode: 'operational',
  activeTool: 'select',
  activeRole: 'Administrator',
  selectedProgramFilter: null,
  selectedStatusFilter: null,
  asOfDate: localDateString(),

  selectedObjectIds: [],
  selectedSeatIds: [],
  hoverObjectId: null,
  hoverSeatId: null,
  marqueeBox: null,

  snapToGrid: true,
  gridSize: 20,
  showGrid: true,
  showRulers: true,
  showMinimap: true,
  leftPanelOpen: true,
  rightPanelOpen: true,
  layers: DEFAULT_LAYERS,

  past: [],
  future: [],

  isBulkAssignOpen: false,
  isBulkBlockOpen: false,
  isBulkUnallocateOpen: false,
  isExcelImportOpen: false,
  isExcelMapOpen: false,
  isExportModalOpen: false,
  isVersionModalOpen: false,
  isAuditModalOpen: false,
  isAnalyticsDrawerOpen: false,

  setZoom: (val) => {
    set((state) => {
      const next = typeof val === 'function' ? val(state.zoom) : val;
      const clamped = Math.max(0.05, Math.min(4.0, next));
      return { zoom: clamped };
    });
  },

  setPan: (panX, panY) => set({ panX, panY }),

  // Fit the whole floor in the window
  resetView: () => {
    const { viewport, floor } = get();
    const fw = floor?.width || 2800;
    const fh = floor?.height || 1800;
    const zoom = Math.max(0.05, Math.min(1.5, Math.min((viewport.width - 80) / fw, (viewport.height - 80) / fh)));
    set({ zoom, panX: (viewport.width - fw * zoom) / 2, panY: (viewport.height - fh * zoom) / 2 });
  },

  setFloorSize: (width, height) => {
    const { floor, activeRole } = get();
    if (!floor || !LAYOUT_ROLES.includes(activeRole)) return;
    if (![width, height].every((n) => Number.isFinite(n) && n >= 200 && n <= 20000)) return;
    set({ floor: { ...floor, width, height }, isDirty: true });
  },

  zoomToSeat: (seatId) => {
    const { seats } = get();
    const seat = seats.find((s) => s.seatId.toLowerCase() === seatId.toLowerCase());
    if (seat) {
      // Center seat in viewport assuming roughly 1200x800 container
      const targetZoom = 1.6;
      const targetX = 600 - seat.x * targetZoom;
      const targetY = 400 - seat.y * targetZoom;
      set({
        zoom: targetZoom,
        panX: targetX,
        panY: targetY,
        selectedSeatIds: [seat.id],
      });
    }
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setProgramFilter: (selectedProgramFilter) => set({ selectedProgramFilter }),
  setStatusFilter: (selectedStatusFilter) => set({ selectedStatusFilter }),
  setAsOfDate: (asOfDate) => {
    set({ asOfDate });
    const { floor } = get();
    if (floor) {
      get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
    }
  },

  toggleLayer: (layerId) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          visible: !state.layers[layerId].visible,
        },
      },
    })),

  setLayerLocked: (layerId, locked) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          locked,
        },
      },
    })),

  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          opacity,
        },
      },
    })),

  selectSeat: (seatId, multi = false) => {
    set((state) => {
      if (multi) {
        const exists = state.selectedSeatIds.includes(seatId);
        return {
          selectedSeatIds: exists
            ? state.selectedSeatIds.filter((id) => id !== seatId)
            : [...state.selectedSeatIds, seatId],
        };
      }
      return { selectedSeatIds: [seatId], selectedObjectIds: [] };
    });
  },

  selectSeats: (selectedSeatIds) => set({ selectedSeatIds, selectedObjectIds: [] }),

  selectObject: (id, multi = false) => {
    set((state) => {
      if (multi) {
        const exists = state.selectedObjectIds.includes(id);
        return {
          selectedObjectIds: exists
            ? state.selectedObjectIds.filter((oid) => oid !== id)
            : [...state.selectedObjectIds, id],
        };
      }
      return { selectedObjectIds: [id], selectedSeatIds: [] };
    });
  },

  selectObjects: (selectedObjectIds) => set({ selectedObjectIds, selectedSeatIds: [] }),

  clearSelection: () =>
    set({
      selectedSeatIds: [],
      selectedObjectIds: [],
      marqueeBox: null,
      // These dialogs act on the selected seats, so they close with the selection
      isBulkAssignOpen: false,
      isBulkBlockOpen: false,
      isBulkUnallocateOpen: false,
    }),

  setMarqueeBox: (marqueeBox) => set({ marqueeBox }),

  selectSeatsInBox: (box) => {
    const { seats } = get();
    const minX = Math.min(box.x, box.x + box.width);
    const maxX = Math.max(box.x, box.x + box.width);
    const minY = Math.min(box.y, box.y + box.height);
    const maxY = Math.max(box.y, box.y + box.height);

    const hitSeats = seats.filter(
      (s) => s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY
    );
    set({
      selectedSeatIds: hitSeats.map((s) => s.id),
      selectedObjectIds: [],
    });
  },

  selectSeatsByZone: (zoneId) => {
    const { seats } = get();
    const hitSeats = seats.filter((s) => s.zoneId === zoneId);
    set({ selectedSeatIds: hitSeats.map((s) => s.id), selectedObjectIds: [] });
  },

  selectSeatsByBay: (bayCode) => {
    const { seats } = get();
    const hitSeats = seats.filter((s) => s.bayCode === bayCode);
    set({ selectedSeatIds: hitSeats.map((s) => s.id), selectedObjectIds: [] });
  },

  selectSeatsByProgram: (programId) => {
    const { seats } = get();
    const hitSeats = seats.filter((s) => s.programId === programId);
    set({ selectedSeatIds: hitSeats.map((s) => s.id), selectedObjectIds: [] });
  },

  selectSeatsByStatus: (status) => {
    const { seats } = get();
    let hitSeats: SeatDTO[] = [];
    if (status === 'ALLOCATED') {
      hitSeats = seats.filter((s) => s.allocationStatus === 'ALLOCATED' && !s.isBlocked);
    } else if (status === 'BLOCKED') {
      hitSeats = seats.filter((s) => s.isBlocked);
    } else if (status === 'UNALLOCATED') {
      hitSeats = seats.filter((s) => !s.programId && !s.isBlocked);
    } else {
      hitSeats = seats.filter((s) => s.allocationStatus === status);
    }
    set({ selectedSeatIds: hitSeats.map((s) => s.id), selectedObjectIds: [] });
  },

  selectAllSeats: () => {
    const { seats } = get();
    set({ selectedSeatIds: seats.map((s) => s.id), selectedObjectIds: [] });
  },

  setHoverSeat: (hoverSeatId) => set({ hoverSeatId }),
  setHoverObject: (hoverObjectId) => set({ hoverObjectId }),

  pushHistory: () => {
    const { objects, seats, past } = get();
    set({
      past: [...past.slice(-25), { objects: JSON.parse(JSON.stringify(objects)), seats }],
      future: [],
      isDirty: true,
    });
  },

  undo: () => {
    const { past, future, objects, seats } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ objects: JSON.parse(JSON.stringify(objects)), seats }, ...future],
      objects: prev.objects,
      seats: restoreSeats(seats, prev.seats),
      selectedObjectIds: [],
      selectedSeatIds: [],
    });
  },

  redo: () => {
    const { past, future, objects, seats } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, { objects: JSON.parse(JSON.stringify(objects)), seats }],
      future: future.slice(1),
      objects: next.objects,
      seats: restoreSeats(seats, next.seats),
      selectedObjectIds: [],
      selectedSeatIds: [],
    });
  },

  updateObjectsLive: (list) => {
    set((state) => {
      const byId = new Map(list.map((o) => [o.id, o]));
      let seats = state.seats;
      state.objects.forEach((old) => {
        const next = byId.get(old.id);
        if (next && old.type === 'bay') seats = carrySeats(old, next, seats);
      });
      return { objects: state.objects.map((o) => byId.get(o.id) || o), seats };
    });
  },

  moveSeatsLive: (pos) => {
    set((state) => ({
      seats: state.seats.map((x) => (pos[x.id] ? { ...x, x: pos[x.id].x, y: pos[x.id].y } : x)),
    }));
  },

  updateObject: (obj) => {
    get().pushHistory();
    get().updateObjectsLive([obj]);
  },

  addObject: (obj) => {
    get().pushHistory();
    set((state) => ({
      objects: [...state.objects, obj],
    }));
  },

  addBay: (obj) => {
    const st = get();
    if (!st.floor) return;
    st.pushHistory();
    const label = uniqueBayLabel(obj.properties?.label || 'WS-01', st.objects);
    const bay: FloorObjectDTO = { ...obj, properties: { ...obj.properties, label } };
    const slots = seatSlots(bay, layoutSpecOf(bay));
    const zone = defaultZoneOf(st.seats, st.zones);
    const ids = nextSeatIds(st.seats, seatPrefixFor(st.seats, st.building?.code, st.floor.floorNumber), zone?.code || 'A', slots.length);
    const fresh = slots.map((slot, i) => blankSeat(ids[i], st.floor!.id, slot, zone?.id || null, bay.id, label));
    set({
      objects: [...st.objects, { ...bay, properties: { ...bay.properties, capacity: slots.length } }],
      seats: [...st.seats, ...fresh],
      selectedObjectIds: [bay.id],
      selectedSeatIds: [],
    });
  },

  deleteSelection: () => {
    const { selectedObjectIds, selectedSeatIds, objects, seats, activeRole } = get();
    if (!LAYOUT_ROLES.includes(activeRole)) return;
    if (selectedObjectIds.length === 0 && selectedSeatIds.length === 0) return;
    const gone = new Set(selectedSeatIds);
    seats.forEach((x) => x.floorObjectId && selectedObjectIds.includes(x.floorObjectId) && gone.add(x.id));
    const goneSeats = seats.filter((x) => gone.has(x.id));
    if (goneSeats.length && !confirmLosingAllocations(goneSeats, 'Deleting this')) return;
    get().pushHistory();
    set({
      objects: objects.filter((o) => !selectedObjectIds.includes(o.id)),
      seats: seats.filter((x) => !gone.has(x.id)),
      selectedObjectIds: [],
      selectedSeatIds: [],
    });
  },

  deleteSelectedObjects: () => get().deleteSelection(),

  duplicateSelection: () => {
    const st = get();
    if (!LAYOUT_ROLES.includes(st.activeRole) || !st.floor) return;
    const originals = st.objects.filter((o) => st.selectedObjectIds.includes(o.id) && !o.locked);
    if (originals.length === 0) return;
    st.pushHistory();
    const step = st.gridSize * 2;
    const prefix = seatPrefixFor(st.seats, st.building?.code, st.floor.floorNumber);
    const zone = defaultZoneOf(st.seats, st.zones);
    const newObjects: FloorObjectDTO[] = [];
    const newSeats: SeatDTO[] = [];
    let known = [...st.objects];
    originals.forEach((o) => {
      const copy: FloorObjectDTO = JSON.parse(JSON.stringify({ ...o, id: newTempId('obj'), x: o.x + step, y: o.y + step }));
      if (o.type === 'bay') {
        copy.properties.label = uniqueBayLabel(o.properties?.label || 'WS-01', known);
        const own = st.seats.filter((x) => x.floorObjectId === o.id);
        const ids = nextSeatIds([...st.seats, ...newSeats], prefix, zone?.code || 'A', own.length);
        own.forEach((x, i) => {
          newSeats.push({
            ...blankSeat(ids[i], x.floorId, { x: x.x + step, y: x.y + step, rotation: x.rotation }, x.zoneId || zone?.id || null, copy.id, copy.properties.label || null),
            seatType: x.seatType,
          });
        });
      }
      known = [...known, copy];
      newObjects.push(copy);
    });
    set({
      objects: [...st.objects, ...newObjects],
      seats: [...st.seats, ...newSeats],
      selectedObjectIds: newObjects.map((o) => o.id),
      selectedSeatIds: [],
    });
  },

  nudgeSelection: (dx, dy) => {
    const st = get();
    if (!LAYOUT_ROLES.includes(st.activeRole)) return;
    const objs = st.objects.filter((o) => st.selectedObjectIds.includes(o.id) && !o.locked && !st.layers[o.layer as LayerId]?.locked);
    const carried = new Set(
      st.seats.filter((x) => x.floorObjectId && objs.some((o) => o.id === x.floorObjectId)).map((x) => x.id)
    );
    const free = st.seats.filter((x) => st.selectedSeatIds.includes(x.id) && !carried.has(x.id));
    if (objs.length === 0 && free.length === 0) return;
    st.pushHistory();
    st.updateObjectsLive(objs.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy })));
    const pos: Record<string, { x: number; y: number }> = {};
    free.forEach((x) => (pos[x.id] = { x: x.x + dx, y: x.y + dy }));
    st.moveSeatsLive(pos);
  },

  alignSelection: (mode) => {
    const st = get();
    if (!LAYOUT_ROLES.includes(st.activeRole)) return;
    const objs = st.objects.filter((o) => st.selectedObjectIds.includes(o.id) && !o.locked);
    if (objs.length < 2) return;
    const b = objs.map((o) => ({ o, ...worldBounds(o) }));
    const minX = Math.min(...b.map((v) => v.minX));
    const maxX = Math.max(...b.map((v) => v.maxX));
    const minY = Math.min(...b.map((v) => v.minY));
    const maxY = Math.max(...b.map((v) => v.maxY));
    st.pushHistory();
    st.updateObjectsLive(
      b.map(({ o, minX: x0, maxX: x1, minY: y0, maxY: y1 }) => {
        let dx = 0;
        let dy = 0;
        if (mode === 'left') dx = minX - x0;
        else if (mode === 'right') dx = maxX - x1;
        else if (mode === 'centerX') dx = (minX + maxX) / 2 - (x0 + x1) / 2;
        else if (mode === 'top') dy = minY - y0;
        else if (mode === 'bottom') dy = maxY - y1;
        else dy = (minY + maxY) / 2 - (y0 + y1) / 2;
        return { ...o, x: o.x + dx, y: o.y + dy };
      })
    );
  },

  regenerateBaySeats: (objectId, patch, geometry) => {
    const st = get();
    const obj = st.objects.find((o) => o.id === objectId);
    if (!obj || !st.floor || !LAYOUT_ROLES.includes(st.activeRole)) return 0;
    const next: FloorObjectDTO = { ...obj, geometry: geometry ?? obj.geometry, properties: { ...obj.properties, ...patch } };
    const slots = seatSlots(next, layoutSpecOf(next));
    const natural = (a: SeatDTO, b: SeatDTO) => a.seatId.localeCompare(b.seatId, undefined, { numeric: true });
    const own = st.seats.filter((x) => x.floorObjectId === objectId).sort(natural);
    const dropped = own.slice(slots.length);
    if (dropped.length && !confirmLosingAllocations(dropped, 'Reducing the seats')) return own.length;
    st.pushHistory();
    const zone = defaultZoneOf(st.seats, st.zones);
    const extra = Math.max(0, slots.length - own.length);
    const ids = nextSeatIds(st.seats, seatPrefixFor(st.seats, st.building?.code, st.floor.floorNumber), zone?.code || 'A', extra);
    const keepIds = new Set(own.slice(0, slots.length).map((x) => x.id));
    const slotOf = new Map(own.slice(0, slots.length).map((x, i) => [x.id, slots[i]]));
    const label = next.properties.label || null;
    const kept = st.seats
      .filter((x) => x.floorObjectId !== objectId || keepIds.has(x.id))
      .map((x) => {
        const slot = slotOf.get(x.id);
        return slot ? { ...x, x: Math.round(slot.x * 100) / 100, y: Math.round(slot.y * 100) / 100, rotation: slot.rotation, bayCode: label } : x;
      });
    const added = slots.slice(own.length).map((slot, i) => blankSeat(ids[i], st.floor!.id, slot, zone?.id || null, objectId, label));
    set({
      objects: st.objects.map((o) => (o.id === objectId ? { ...next, properties: { ...next.properties, capacity: slots.length } } : o)),
      seats: [...kept, ...added],
    });
    return slots.length;
  },

  setSelectedSeatType: (type) => {
    const st = get();
    if (!LAYOUT_ROLES.includes(st.activeRole) || st.selectedSeatIds.length === 0) return;
    st.pushHistory();
    set({ seats: st.seats.map((x) => (st.selectedSeatIds.includes(x.id) ? { ...x, seatType: type } : x)) });
  },

  addSeatAt: (x, y) => {
    const st = get();
    if (!LAYOUT_ROLES.includes(st.activeRole) || !st.floor) return;
    st.pushHistory();
    const zone = defaultZoneOf(st.seats, st.zones);
    const [id] = nextSeatIds(st.seats, seatPrefixFor(st.seats, st.building?.code, st.floor.floorNumber), zone?.code || 'A', 1);
    const seat = blankSeat(id, st.floor.id, { x, y, rotation: 0 }, zone?.id || null, null, null);
    set({ seats: [...st.seats, seat], selectedSeatIds: [seat.id], selectedObjectIds: [] });
  },

  setViewport: (width, height) => {
    const v = get().viewport;
    if (v.width !== width || v.height !== height) set({ viewport: { width, height } });
  },

  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setShowMinimap: (showMinimap) => set({ showMinimap }),
  // On a narrow window the two panels cannot both fit beside the canvas, so opening one closes the other
  setLeftPanelOpen: (leftPanelOpen) =>
    set(leftPanelOpen && typeof window !== 'undefined' && window.innerWidth < 1100 ? { leftPanelOpen, rightPanelOpen: false } : { leftPanelOpen }),
  setRightPanelOpen: (rightPanelOpen) =>
    set(rightPanelOpen && typeof window !== 'undefined' && window.innerWidth < 1100 ? { rightPanelOpen, leftPanelOpen: false } : { rightPanelOpen }),

  setBulkAssignOpen: (isBulkAssignOpen) => set({ isBulkAssignOpen }),
  setBulkBlockOpen: (isBulkBlockOpen) => set({ isBulkBlockOpen }),
  setBulkUnallocateOpen: (isBulkUnallocateOpen) => set({ isBulkUnallocateOpen }),
  setExcelImportOpen: (isExcelImportOpen) => set({ isExcelImportOpen }),
  setExcelMapOpen: (isExcelMapOpen) => set({ isExcelMapOpen }),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setVersionModalOpen: (isVersionModalOpen) => set({ isVersionModalOpen }),
  setAuditModalOpen: (isAuditModalOpen) => set({ isAuditModalOpen }),
  setAnalyticsDrawerOpen: (isAnalyticsDrawerOpen) => set({ isAnalyticsDrawerOpen }),
  closeDialogs: () =>
    set({
      isBulkAssignOpen: false,
      isBulkBlockOpen: false,
      isBulkUnallocateOpen: false,
      isExcelImportOpen: false,
      isExcelMapOpen: false,
      isExportModalOpen: false,
      isVersionModalOpen: false,
      isAuditModalOpen: false,
    }),

  loadFloorData: async (floorId, asOfDateStr, opts) => {
    try {
      set({ isLoading: true });
      const query = asOfDateStr ? `?asOfDate=${encodeURIComponent(asOfDateStr)}` : '';
      const res = await fetch(`/api/floors/${floorId}${query}`);
      const data = await res.json();
      if (data.success) {
        set({
          building: data.building,
          // Allocation reloads keep an unsaved change to the floor size
          floor: opts?.keepLayout && get().floor?.id === data.floor.id ? { ...data.floor, width: get().floor!.width, height: get().floor!.height } : data.floor,
          zones: data.zones,
          programs: data.programs,
          // Allocation actions only change seats, so they keep unsaved layout edits and undo history.
          // Any other load (floor switch, snapshot restore, first load) replaces the layout and clears history.
          ...(opts?.keepLayout
            ? { seats: mergeSeats(data.seats, get().seats, get().persistedSeatIds) }
            : {
                objects: data.objects,
                persistedObjectIds: data.objects.map((o: FloorObjectDTO) => o.id),
                seats: data.seats,
                persistedSeatIds: data.seats.map((x: SeatDTO) => x.id),
                seatBaseline: baselineOf(data.seats),
                past: [],
                future: [],
                isDirty: false,
              }),
          versions: data.versions,
          isLoading: false,
        });
        // A different floor (or the first load) starts fitted to the window
        if (!opts?.keepLayout && !asOfDateStr) get().resetView();
      } else {
        console.error(data.error);
        set({ isLoading: false });
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  saveFloorLayout: async () => {
    const { floor, objects, seats, persistedObjectIds, persistedSeatIds, seatBaseline, activeRole } = get();
    if (!floor) return;
    const seatPayload = {
      created: seats.filter((x) => isDraftId(x.id)).map(seatForSave),
      updated: seats.filter((x) => !isDraftId(x.id) && seatBaseline[x.id] !== layoutKey(x)).map(seatForSave),
      deletedIds: persistedSeatIds.filter((id) => !seats.some((x) => x.id === id)),
    };
    // Saved objects that are no longer on the plan: deleted, or an add that was undone
    const currentIds = new Set(objects.map((o) => o.id));
    const deletedObjectIds = persistedObjectIds.filter((id) => !currentIds.has(id));
    try {
      set({ isSaving: true });
      const res = await fetch('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BATCH_SAVE',
          floorId: floor.id,
          objects,
          deletedObjectIds,
          seats: seatPayload,
          floorSize: { width: floor.width, height: floor.height },
          user: 'Facility Planner',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        set({ isSaving: false });
        alert(data.error || 'Failed to save the floor layout.');
        return;
      }

      // Swap temporary ids for database ids everywhere, undo history included,
      // so the next save updates these objects instead of creating them again
      const idMap = new Map<string, string>(
        (data.created || []).map((c: { tempId: string; id: string }): [string, string] => [c.tempId, c.id])
      );
      const seatIdMap = new Map<string, string>(
        (data.createdSeats || []).map((c: { tempId: string; id: string }): [string, string] => [c.tempId, c.id])
      );
      const remap = (list: FloorObjectDTO[]) =>
        list.map((o) => (idMap.has(o.id) ? { ...o, id: idMap.get(o.id)! } : o));
      const remapSeats = (list: SeatDTO[]) =>
        list.map((x) => {
          const id = seatIdMap.get(x.id) ?? x.id;
          const bay = x.floorObjectId ? idMap.get(x.floorObjectId) ?? x.floorObjectId : x.floorObjectId;
          return id === x.id && bay === x.floorObjectId ? x : { ...x, id, floorObjectId: bay };
        });
      set((state) => ({
        isSaving: false,
        isDirty: false,
        seats: remapSeats(state.seats),
        persistedSeatIds: remapSeats(state.seats).map((x) => x.id),
        seatBaseline: baselineOf(remapSeats(state.seats)),
        selectedSeatIds: state.selectedSeatIds.map((id) => seatIdMap.get(id) ?? id),
        objects: remap(state.objects),
        past: state.past.map((h) => ({ ...h, objects: remap(h.objects), seats: remapSeats(h.seats) })),
        future: state.future.map((h) => ({ ...h, objects: remap(h.objects), seats: remapSeats(h.seats) })),
        selectedObjectIds: state.selectedObjectIds.map((id) => idMap.get(id) ?? id),
        persistedObjectIds: objects.map((o) => idMap.get(o.id) ?? o.id),
      }));
      alert('Floor plan layout saved successfully!');
    } catch (e) {
      console.error(e);
      set({ isSaving: false });
      alert('Failed to save the floor layout.');
    }
  },

  bulkAssignProgram: async (programId, effectiveDate, shift) => {
    if (draftSeatsSelected(get().selectedSeatIds)) return false;
    const { selectedSeatIds, floor, activeRole, asOfDate } = get();
    if (selectedSeatIds.length === 0 || !floor) return false;
    try {
      const res = await fetch('/api/allocation/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          programId,
          effectiveDate,
          shift,
          user: 'Capacity Planner',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
        set({ isBulkAssignOpen: false });
        return true;
      }
      alert(data.error || 'Failed to allocate program');
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  bulkRemoveAllocation: async () => {
    if (draftSeatsSelected(get().selectedSeatIds)) return false;
    const { selectedSeatIds, floor, activeRole, asOfDate } = get();
    if (selectedSeatIds.length === 0 || !floor) return false;
    try {
      const res = await fetch('/api/allocation/bulk-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          user: 'Capacity Planner',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
        set({ isBulkUnallocateOpen: false });
        return true;
      }
      alert(data.error || 'Failed to remove allocation');
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  bulkBlockSeats: async (reason, startDate, endDate, notes) => {
    if (draftSeatsSelected(get().selectedSeatIds)) return false;
    const { selectedSeatIds, floor, activeRole, asOfDate } = get();
    if (selectedSeatIds.length === 0 || !floor) return false;
    try {
      const res = await fetch('/api/allocation/bulk-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          reason,
          startDate,
          endDate,
          notes,
          user: 'Facility Manager',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
        set({ isBulkBlockOpen: false });
        return true;
      }
      alert(data.error || 'Failed to block seats');
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  bulkUnblockSeats: async () => {
    if (draftSeatsSelected(get().selectedSeatIds)) return false;
    const { selectedSeatIds, floor, activeRole, asOfDate } = get();
    if (selectedSeatIds.length === 0 || !floor) return false;
    try {
      const res = await fetch('/api/allocation/bulk-unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          user: 'Facility Manager',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
        return true;
      }
      alert(data.error || 'Failed to unblock seats');
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  bulkChangeZone: async (zoneId) => {
    if (draftSeatsSelected(get().selectedSeatIds)) return false;
    const { selectedSeatIds, floor, activeRole, asOfDate } = get();
    if (selectedSeatIds.length === 0 || !floor) return false;
    try {
      const res = await fetch('/api/allocation/bulk-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          zoneId,
          user: 'Facility Planner',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await get().loadFloorData(floor.id, asOfDate, { keepLayout: true });
        return true;
      }
      alert(data.error || 'Failed to update zone');
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
}));
