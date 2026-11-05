import { localDateString } from '@/lib/dates';
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
  dimensions: { visible: true, locked: false, opacity: 1 },
  allocation: { visible: true, locked: false, opacity: 1 },
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
  addObject: (obj: FloorObjectDTO) => void;
  deleteSelectedObjects: () => void;
  setSnapToGrid: (val: boolean) => void;
  setShowGrid: (val: boolean) => void;
  setShowRulers: (val: boolean) => void;
  setShowMinimap: (val: boolean) => void;

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

export const useFloorPlanStore = create<FloorPlanStore>((set, get) => ({
  building: null,
  floor: null,
  zones: [],
  programs: [],
  objects: [],
  persistedObjectIds: [],
  seats: [],
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
      const clamped = Math.max(0.15, Math.min(4.0, next));
      return { zoom: clamped };
    });
  },

  setPan: (panX, panY) => set({ panX, panY }),

  resetView: () => set({ zoom: 0.65, panX: 120, panY: 80 }),

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
    const { objects, past } = get();
    set({
      past: [...past.slice(-25), { objects: JSON.parse(JSON.stringify(objects)), seats: [] }],
      future: [],
    });
  },

  undo: () => {
    const { past, future, objects } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ objects: JSON.parse(JSON.stringify(objects)), seats: [] }, ...future],
      objects: prev.objects,
    });
  },

  redo: () => {
    const { past, future, objects } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, { objects: JSON.parse(JSON.stringify(objects)), seats: [] }],
      future: future.slice(1),
      objects: next.objects,
    });
  },

  updateObject: (obj) => {
    get().pushHistory();
    set((state) => ({
      objects: state.objects.map((o) => (o.id === obj.id ? obj : o)),
    }));
  },

  addObject: (obj) => {
    get().pushHistory();
    set((state) => ({
      objects: [...state.objects, obj],
    }));
  },

  deleteSelectedObjects: () => {
    const { selectedObjectIds, objects } = get();
    if (selectedObjectIds.length === 0) return;
    get().pushHistory();
    set({
      objects: objects.filter((o) => !selectedObjectIds.includes(o.id)),
      selectedObjectIds: [],
    });
  },

  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setShowMinimap: (showMinimap) => set({ showMinimap }),

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
          floor: data.floor,
          zones: data.zones,
          programs: data.programs,
          // Allocation actions only change seats, so they keep unsaved layout edits and undo history.
          // Any other load (floor switch, snapshot restore, first load) replaces the layout and clears history.
          ...(opts?.keepLayout
            ? {}
            : {
                objects: data.objects,
                persistedObjectIds: data.objects.map((o: FloorObjectDTO) => o.id),
                past: [],
                future: [],
              }),
          seats: data.seats,
          versions: data.versions,
          isLoading: false,
        });
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
    const { floor, objects, persistedObjectIds, activeRole } = get();
    if (!floor) return;
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
      const remap = (list: FloorObjectDTO[]) =>
        list.map((o) => (idMap.has(o.id) ? { ...o, id: idMap.get(o.id)! } : o));
      set((state) => ({
        isSaving: false,
        objects: remap(state.objects),
        past: state.past.map((h) => ({ ...h, objects: remap(h.objects) })),
        future: state.future.map((h) => ({ ...h, objects: remap(h.objects) })),
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
