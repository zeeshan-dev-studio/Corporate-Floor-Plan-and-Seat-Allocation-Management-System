'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFloorPlanStore, isDialogOpen, FloorPlanStore } from '@/store/useFloorPlanStore';
import { SeatElement } from './SeatElement';
import { FloorObjectElement } from './FloorObjectElement';
import { EditHandles, HandleGrab } from './EditHandles';
import { Rulers } from './Rulers';
import { MiniMap } from './MiniMap';
import { DrawToolbar } from './DrawToolbar';
import { FloorObjectDTO, LayerId, Point, ToolMode } from '@/types/floorplan';
import {
  LAYER_ORDER,
  SEAT_CELL_H,
  SEAT_CELL_W,
  layerOf,
  objectPoints,
  polygonToBox,
  resizedObject,
  toLocal,
  toWorld,
  newTempId,
} from '@/lib/floorGeometry';

interface FloorPlanCanvasProps {
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

const LAYOUT_ROLES = ['Administrator', 'Facility Manager'];
const DRAW_TOOLS: ToolMode[] = ['wall', 'glass', 'room', 'polyroom', 'workstation', 'seat'];
const MIN_SIZE = 10;

type Gesture =
  | {
      kind: 'move';
      start: Point;
      objs: Record<string, Point>;
      seats: Record<string, Point>;
      primary: Point;
      moved: boolean;
    }
  | { kind: 'resize'; handle: string; obj: FloorObjectDTO; pushed: boolean }
  | { kind: 'rotate'; obj: FloorObjectDTO; pushed: boolean }
  | { kind: 'vertex'; index: number; obj: FloorObjectDTO; pushed: boolean }
  | { kind: 'draw'; tool: ToolMode; a: Point };

const clientToFloor = (el: HTMLElement | null, st: FloorPlanStore, cx: number, cy: number): Point => {
  const r = el?.getBoundingClientRect();
  return { x: (cx - (r?.left || 0) - st.panX) / st.zoom, y: (cy - (r?.top || 0) - st.panY) / st.zoom };
};

const snapTo = (st: FloorPlanStore, v: number) => (st.snapToGrid ? Math.round(v / st.gridSize) * st.gridSize : v);

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({ svgRef: externalSvgRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = externalSvgRef || internalSvgRef;

  const {
    floor,
    objects,
    seats,
    zoom,
    panX,
    panY,
    viewMode,
    activeTool,
    activeRole,
    selectedProgramFilter,
    selectedStatusFilter,
    selectedSeatIds,
    selectedObjectIds,
    hoverSeatId,
    hoverObjectId,
    marqueeBox,
    gridSize,
    showGrid,
    showRulers,
    showMinimap,
    layers,
    setZoom,
    setPan,
    selectSeat,
    selectObject,
    clearSelection,
    setMarqueeBox,
    selectSeatsInBox,
    setHoverSeat,
    setHoverObject,
    setViewport,
  } = useFloorPlanStore();

  const canEdit = LAYOUT_ROLES.includes(activeRole);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  // Shape being drawn: a drag (wall, glass, room, workstation) or the corners of a polygon room
  const [draft, setDraft] = useState<{ tool: ToolMode; a: Point; b: Point } | null>(null);
  const [polyPts, setPolyPts] = useState<Point[]>([]);
  const [polyCursor, setPolyCursor] = useState<Point | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const polyRef = useRef<Point[]>([]);
  // True between the mouseup that finishes a selection box and the next mousedown
  const marqueeEndedRef = useRef(false);
  // The click that ends a drag must not change the selection
  const suppressClickRef = useRef(false);

  const setPoly = (pts: Point[]) => {
    polyRef.current = pts;
    setPolyPts(pts);
  };

  // Update container size on resize
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const size = { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight };
        // Keep what is in the middle of the view in the middle when a side panel opens or closes
        const last = lastSizeRef.current;
        const resized = last && (last.width !== size.width || last.height !== size.height) && size.width > 0;
        let wasFitted = false;
        if (resized && last) {
          const st = useFloorPlanStore.getState();
          // Was the whole floor fitted to the old size? Then fit it to the new size too.
          const fw = st.floor?.width || 2800;
          const fh = st.floor?.height || 1800;
          const fz = Math.max(0.05, Math.min(1.5, Math.min((last.width - 80) / fw, (last.height - 80) / fh)));
          wasFitted = Math.abs(st.zoom - fz) < 0.002 && Math.abs(st.panX - (last.width - fw * fz) / 2) < 3;
          if (!wasFitted) st.setPan(st.panX + (size.width - last.width) / 2, st.panY + (size.height - last.height) / 2);
        }
        lastSizeRef.current = size;
        setContainerSize(size);
        setViewport(size.width, size.height);
        if (wasFitted) useFloorPlanStore.getState().resetView();
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    // Panels sliding in and out change the canvas size without a window resize
    const ro = typeof ResizeObserver !== 'undefined' && containerRef.current ? new ResizeObserver(updateSize) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateSize);
      ro?.disconnect();
    };
  }, [setViewport]);

  // Drawing tools only exist for roles that may edit the layout
  useEffect(() => {
    if (!canEdit && DRAW_TOOLS.includes(activeTool)) useFloorPlanStore.getState().setActiveTool('select');
  }, [canEdit, activeTool]);

  // Leaving a drawing tool drops a half-drawn shape
  useEffect(() => {
    if (activeTool !== 'polyroom') {
      polyRef.current = [];
      setPolyPts([]);
      setPolyCursor(null);
    }
    if (!DRAW_TOOLS.includes(activeTool)) setDraft(null);
  }, [activeTool]);

  // Warn before the page is closed with unsaved layout edits
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (useFloorPlanStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const finishPolygon = useCallback(() => {
    const pts = polyRef.current;
    const st = useFloorPlanStore.getState();
    if (pts.length >= 3 && st.floor) {
      const box = polygonToBox(pts);
      st.addObject({
        id: newTempId('obj'),
        floorId: st.floor.id,
        type: 'room',
        subType: 'room',
        layer: 'rooms',
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        rotation: 0,
        geometry: { shape: 'polygon', points: box.points },
        properties: { label: 'Room', roomType: 'Room' },
        locked: false,
        hidden: false,
      });
      useFloorPlanStore.getState().selectObject(useFloorPlanStore.getState().objects.slice(-1)[0].id);
      st.setActiveTool('select');
    }
    setPoly([]);
    setPolyCursor(null);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const st = useFloorPlanStore.getState();
      // An open dialog owns the keyboard: Esc closes it, and canvas shortcuts must not
      // change the selection or layout the dialog is acting on
      if (isDialogOpen(st)) {
        if (e.key === 'Escape') st.closeDialogs();
        return;
      }

      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const editor = LAYOUT_ROLES.includes(st.activeRole);

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (mod && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) st.redo();
        else st.undo();
        e.preventDefault();
      } else if (mod && e.key.toLowerCase() === 'y') {
        st.redo();
        e.preventDefault();
      } else if (mod && e.key.toLowerCase() === 'a') {
        st.selectAllSeats();
        e.preventDefault();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (editor) st.duplicateSelection();
      } else if (e.key === 'Enter' && st.activeTool === 'polyroom') {
        finishPolygon();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (st.activeTool === 'polyroom' && polyRef.current.length > 0) {
          setPoly(polyRef.current.slice(0, -1));
        } else if (editor) {
          st.deleteSelection();
        }
      } else if (e.key === 'Escape') {
        if (st.activeTool !== 'select') st.setActiveTool('select');
        gestureRef.current = null;
        setDraft(null);
        setPoly([]);
        st.clearSelection();
      } else if (e.key.startsWith('Arrow') && editor && !mod) {
        if (st.selectedObjectIds.length || st.selectedSeatIds.length) {
          e.preventDefault();
          const step = e.shiftKey ? st.gridSize : e.altKey ? 1 : Math.max(2, st.gridSize / 4);
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          st.nudgeSelection(dx, dy);
        }
      } else if (e.key === '+' || e.key === '=') {
        st.setZoom((prev) => Math.min(4.0, prev * 1.2));
      } else if (e.key === '-' || e.key === '_') {
        st.setZoom((prev) => Math.max(0.05, prev / 1.2));
      } else if (!mod && !e.altKey) {
        const tools: Record<string, ToolMode> = { v: 'select', h: 'pan', w: 'wall', g: 'glass', r: 'room', p: 'polyroom', b: 'workstation', s: 'seat' };
        const tool = tools[e.key.toLowerCase()];
        if (tool && (editor || tool === 'select' || tool === 'pan')) st.setActiveTool(tool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [finishPolygon]);

  // Convert screen coordinates to floor coordinate system
  const screenToFloorCoords = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;
      const floorX = (relativeX - panX) / zoom;
      const floorY = (relativeY - panY) / zoom;
      return { x: floorX, y: floorY };
    },
    [panX, panY, zoom]
  );

  // Wheel Zoom towards mouse cursor
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.05, Math.min(4.0, zoom * zoomFactor));

    // Keep point under mouse steady:
    // mouseX = panX + floorX * zoom => floorX = (mouseX - panX) / zoom
    const floorX = (mouseX - panX) / zoom;
    const floorY = (mouseY - panY) / zoom;

    const newPanX = mouseX - floorX * newZoom;
    const newPanY = mouseY - floorY * newZoom;

    setZoom(newZoom);
    setPan(newPanX, newPanY);
  };

  // React attaches wheel listeners as passive, so preventDefault (which stops the browser page zooming
  // on Ctrl+wheel / pinch) only works on a native non-passive listener.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, panX, panY]);

  // ---------- Drag / resize / rotate / draw gestures (tracked on the window so they survive leaving the canvas) ----------

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const st = useFloorPlanStore.getState();
      const p = clientToFloor(containerRef.current, st, e.clientX, e.clientY);

      if (g.kind === 'draw') {
        let b = { x: snapTo(st, p.x), y: snapTo(st, p.y) };
        if ((g.tool === 'wall' || g.tool === 'glass') && st.snapToGrid) {
          // Straight walls stay straight: lock to horizontal or vertical when nearly so
          const dx = Math.abs(b.x - g.a.x);
          const dy = Math.abs(b.y - g.a.y);
          if (dy < dx * 0.15) b = { x: b.x, y: g.a.y };
          else if (dx < dy * 0.15) b = { x: g.a.x, y: b.y };
        }
        setDraft({ tool: g.tool, a: g.a, b });
        return;
      }

      if (g.kind === 'move') {
        const dx = p.x - g.start.x;
        const dy = p.y - g.start.y;
        if (!g.moved) {
          if (Math.hypot(dx, dy) * st.zoom < 4) return;
          g.moved = true;
          suppressClickRef.current = true;
          st.pushHistory();
        }
        // The grabbed item snaps to the grid; everything else keeps its offset from it
        const ddx = snapTo(st, g.primary.x + dx) - g.primary.x;
        const ddy = snapTo(st, g.primary.y + dy) - g.primary.y;
        const live = st.objects
          .filter((o) => g.objs[o.id])
          .map((o) => ({ ...o, x: g.objs[o.id].x + ddx, y: g.objs[o.id].y + ddy }));
        if (live.length) st.updateObjectsLive(live);
        const seatPos: Record<string, Point> = {};
        Object.entries(g.seats).forEach(([id, s]) => (seatPos[id] = { x: s.x + ddx, y: s.y + ddy }));
        if (Object.keys(seatPos).length) st.moveSeatsLive(seatPos);
        return;
      }

      const o = g.obj;
      if (g.kind === 'rotate') {
        if (!g.pushed) {
          st.pushHistory();
          g.pushed = true;
        }
        const c = toWorld(o, o.width / 2, o.height / 2);
        let deg = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90;
        deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        deg = ((deg % 360) + 360) % 360;
        st.updateObjectsLive([{ ...o, rotation: deg }]);
        return;
      }

      if (g.kind === 'resize') {
        if (!g.pushed) {
          st.pushHistory();
          g.pushed = true;
        }
        const l = toLocal(o, p.x, p.y);
        const h = g.handle;
        const east = h.includes('e');
        const west = h.includes('w');
        const south = h.includes('s');
        const north = h.includes('n');
        const snapLen = (v: number) => Math.max(MIN_SIZE, st.snapToGrid ? Math.max(st.gridSize, Math.round(v / st.gridSize) * st.gridSize) : v);
        const nw = east ? snapLen(l.x) : west ? snapLen(o.width - l.x) : o.width;
        const nh = south ? snapLen(l.y) : north ? snapLen(o.height - l.y) : o.height;
        // The opposite edge stays where it is on the floor, whatever the rotation
        const fx = east ? 0 : west ? o.width : o.width / 2;
        const fy = south ? 0 : north ? o.height : o.height / 2;
        const nfx = east ? 0 : west ? nw : nw / 2;
        const nfy = south ? 0 : north ? nh : nh / 2;
        const fixed = toWorld(o, fx, fy);
        const r = ((o.rotation || 0) * Math.PI) / 180;
        const vx = nfx - nw / 2;
        const vy = nfy - nh / 2;
        const nx = fixed.x - nw / 2 - (vx * Math.cos(r) - vy * Math.sin(r));
        const ny = fixed.y - nh / 2 - (vx * Math.sin(r) + vy * Math.cos(r));
        st.updateObjectsLive([{ ...resizedObject(o, nw, nh), x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 }]);
        return;
      }

      if (g.kind === 'vertex') {
        if (!g.pushed) {
          st.pushHistory();
          g.pushed = true;
        }
        const pts = objectPoints(o);
        if (!pts) return;
        const w = { x: snapTo(st, p.x), y: snapTo(st, p.y) };
        const l = toLocal(o, w.x, w.y);
        const moved = pts.map((q, i) => (i === g.index ? l : q));
        const minX = Math.min(...moved.map((q) => q.x));
        const minY = Math.min(...moved.map((q) => q.y));
        const maxX = Math.max(...moved.map((q) => q.x));
        const maxY = Math.max(...moved.map((q) => q.y));
        const nw = Math.max(1, maxX - minX);
        const nh = Math.max(1, maxY - minY);
        const centre = toWorld(o, minX + nw / 2, minY + nh / 2);
        st.updateObjectsLive([
          {
            ...o,
            x: Math.round((centre.x - nw / 2) * 100) / 100,
            y: Math.round((centre.y - nh / 2) * 100) / 100,
            width: nw,
            height: nh,
            geometry: { ...o.geometry, points: moved.map((q) => ({ x: q.x - minX, y: q.y - minY })) },
          },
        ]);
        // The grabbed corner keeps being the same one; the next move starts from the reshaped object
        const fresh = useFloorPlanStore.getState().objects.find((x) => x.id === o.id);
        if (fresh) g.obj = fresh;
      }
    };

    const onUp = (e: MouseEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      gestureRef.current = null;
      const st = useFloorPlanStore.getState();

      if (g.kind === 'move') {
        if (g.moved) setTimeout(() => (suppressClickRef.current = false), 0);
        return;
      }
      if (g.kind !== 'draw') return;

      const p = clientToFloor(containerRef.current, st, e.clientX, e.clientY);
      const a = g.a;
      let b = { x: snapTo(st, p.x), y: snapTo(st, p.y) };
      if ((g.tool === 'wall' || g.tool === 'glass') && st.snapToGrid) {
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.y - a.y);
        if (dy < dx * 0.15) b = { x: b.x, y: a.y };
        else if (dx < dy * 0.15) b = { x: a.x, y: b.y };
      }
      setDraft(null);
      if (!st.floor) return;
      const base = { id: newTempId('obj'), floorId: st.floor.id, rotation: 0, locked: false, hidden: false };

      if (g.tool === 'wall' || g.tool === 'glass') {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < 20) return;
        const t = g.tool === 'wall' ? 10 : 8;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        st.addObject({
          ...base,
          type: g.tool === 'wall' ? 'wall' : 'glass',
          subType: g.tool === 'wall' ? 'interior' : 'glass',
          layer: g.tool === 'wall' ? 'walls' : 'glass',
          x: cx - len / 2,
          y: cy - t / 2,
          width: len,
          height: t,
          rotation: Math.round(((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) * 10) / 10,
          geometry: g.tool === 'wall' ? { fill: '#1e293b', stroke: '#0f172a', strokeWidth: 1.5 } : { shape: 'rect' },
          properties: { label: g.tool === 'wall' ? 'Wall' : 'Glass partition' },
        });
        useFloorPlanStore.getState().selectObject(base.id);
        useFloorPlanStore.getState().setActiveTool('select');
        return;
      }

      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const width = Math.abs(b.x - a.x);
      const height = Math.abs(b.y - a.y);

      if (g.tool === 'room') {
        if (width < 40 || height < 40) return;
        st.addObject({
          ...base,
          type: 'room',
          subType: 'room',
          layer: 'rooms',
          x,
          y,
          width,
          height,
          geometry: { shape: 'rect' },
          properties: { label: 'Room', roomType: 'Room' },
        });
        useFloorPlanStore.getState().selectObject(base.id);
        useFloorPlanStore.getState().setActiveTool('select');
      } else if (g.tool === 'workstation') {
        if (width < 30 || height < 30) return;
        const cols = Math.max(1, Math.round(width / SEAT_CELL_W));
        const rows = Math.max(1, Math.round(height / SEAT_CELL_H));
        st.addBay({
          ...base,
          type: 'bay',
          subType: 'box',
          layer: 'workstations',
          x,
          y,
          width,
          height,
          geometry: { shape: 'rect' },
          properties: {
            label: 'WS-01',
            tableType: 'Workstation',
            capacity: rows * cols,
            seatRows: rows,
            seatCols: cols,
            arrangement: 'grid',
            seatFacing: 'inward',
          },
        });
        useFloorPlanStore.getState().setActiveTool('select');
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  /** Starts moving whatever is selected (plus the grabbed item) when the pointer then moves. */
  const beginMove = (e: React.MouseEvent, grabbed: { kind: 'obj' | 'seat'; id: string }) => {
    const st = useFloorPlanStore.getState();
    const objs: Record<string, Point> = {};
    const carried = new Set<string>();
    st.objects.forEach((o) => {
      if (!st.selectedObjectIds.includes(o.id) || o.locked || st.layers[layerOf(o)].locked) return;
      objs[o.id] = { x: o.x, y: o.y };
      st.seats.forEach((x) => x.floorObjectId === o.id && carried.add(x.id));
    });
    const seatStarts: Record<string, Point> = {};
    if (!st.layers.seats.locked) {
      st.seats.forEach((x) => {
        if (st.selectedSeatIds.includes(x.id) && !carried.has(x.id)) seatStarts[x.id] = { x: x.x, y: x.y };
      });
    }
    const primary = grabbed.kind === 'obj' ? objs[grabbed.id] : seatStarts[grabbed.id];
    if (!primary) return;
    gestureRef.current = {
      kind: 'move',
      start: clientToFloor(containerRef.current, st, e.clientX, e.clientY),
      objs,
      seats: seatStarts,
      primary,
      moved: false,
    };
  };

  const onObjectPointerDown = (id: string, e: React.MouseEvent) => {
    const st = useFloorPlanStore.getState();
    if (e.button !== 0 || isSpacePressed || st.activeTool !== 'select' || !LAYOUT_ROLES.includes(st.activeRole)) return;
    const obj = st.objects.find((o) => o.id === id);
    if (!obj || obj.locked || st.layers[layerOf(obj)].locked) return;
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    const selected = st.selectedObjectIds.includes(id);
    // Dragging inside an unselected room draws a selection box (to pick its desks); select the room first to move it
    if (obj.type === 'room' && !selected) return;
    if (!selected) useFloorPlanStore.getState().selectObject(id, multi);
    beginMove(e, { kind: 'obj', id });
  };

  const onSeatPointerDown = (id: string, e: React.MouseEvent) => {
    const st = useFloorPlanStore.getState();
    if (e.button !== 0 || isSpacePressed || st.activeTool !== 'select' || !LAYOUT_ROLES.includes(st.activeRole)) return;
    if (!st.selectedSeatIds.includes(id)) useFloorPlanStore.getState().selectSeat(id, e.shiftKey || e.ctrlKey || e.metaKey);
    beginMove(e, { kind: 'seat', id });
  };

  const onGrabHandle = (grab: HandleGrab, e: React.MouseEvent) => {
    const st = useFloorPlanStore.getState();
    const id = st.selectedObjectIds[0];
    const obj = st.objects.find((o) => o.id === id);
    if (!obj || obj.locked) return;
    if (grab.kind === 'resize') gestureRef.current = { kind: 'resize', handle: grab.handle, obj, pushed: false };
    else if (grab.kind === 'rotate') gestureRef.current = { kind: 'rotate', obj, pushed: false };
    else if (grab.kind === 'vertex') {
      const pts = objectPoints(obj);
      if (!pts) return;
      if (e.altKey) {
        if (pts.length > 3) {
          st.updateObject({ ...obj, geometry: { ...obj.geometry, points: pts.filter((_, i) => i !== grab.index) } });
        }
        return;
      }
      gestureRef.current = { kind: 'vertex', index: grab.index, obj, pushed: false };
    } else if (grab.kind === 'addVertex') {
      const pts = objectPoints(obj);
      if (!pts) return;
      const a = pts[grab.after];
      const b = pts[(grab.after + 1) % pts.length];
      const added = [...pts.slice(0, grab.after + 1), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ...pts.slice(grab.after + 1)];
      st.pushHistory();
      const next = { ...obj, geometry: { ...obj.geometry, points: added } };
      st.updateObjectsLive([next]);
      gestureRef.current = { kind: 'vertex', index: grab.after + 1, obj: next, pushed: true };
    }
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (gestureRef.current) return; // an object, seat or handle already took this press

    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      // Middle click or spacebar pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    if (e.button === 0) {
      const { x, y } = screenToFloorCoords(e.clientX, e.clientY);
      marqueeEndedRef.current = false;

      if (canEdit && DRAW_TOOLS.includes(activeTool)) {
        const st = useFloorPlanStore.getState();
        const pt = { x: snapTo(st, x), y: snapTo(st, y) };
        if (activeTool === 'seat') {
          st.addSeatAt(pt.x, pt.y);
        } else if (activeTool === 'polyroom') {
          const pts = polyRef.current;
          if (pts.length >= 3 && Math.hypot(pt.x - pts[0].x, pt.y - pts[0].y) * zoom < 10) finishPolygon();
          else if (!pts.length || Math.hypot(pt.x - pts[pts.length - 1].x, pt.y - pts[pts.length - 1].y) > 1) setPoly([...pts, pt]);
        } else {
          gestureRef.current = { kind: 'draw', tool: activeTool, a: pt };
          setDraft({ tool: activeTool, a: pt, b: pt });
        }
        return;
      }

      // Check if user clicked an object handle or empty area
      const clickedTarget = e.target as SVGElement;
      const isFloorBackground =
        clickedTarget.id === 'cad-canvas-bg' || clickedTarget === svgRef.current;
      // Rooms contain desks, so dragging inside one selects seats (a plain click still selects the room)
      const isInsideRoom = !!clickedTarget.closest('#layer-rooms');

      if (isFloorBackground || isInsideRoom) {
        if (isFloorBackground && !e.shiftKey && !e.ctrlKey) {
          clearSelection();
        }
        // Start marquee box selection
        setIsSelectingBox(true);
        setBoxStart({ x, y });
        setMarqueeBox({ x, y, width: 0, height: 0 });
      }
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // Relative to the canvas, because the tooltip and ruler marker are drawn inside it
    const box = containerRef.current?.getBoundingClientRect();
    setCursorPos({ x: e.clientX - (box?.left || 0), y: e.clientY - (box?.top || 0) });

    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      return;
    }

    const { x, y } = screenToFloorCoords(e.clientX, e.clientY);

    if (activeTool === 'polyroom' && polyRef.current.length) {
      const st = useFloorPlanStore.getState();
      setPolyCursor({ x: snapTo(st, x), y: snapTo(st, y) });
    }

    if (isSelectingBox) {
      const width = x - boxStart.x;
      const height = y - boxStart.y;
      setMarqueeBox({ x: boxStart.x, y: boxStart.y, width, height });
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isSelectingBox && marqueeBox) {
      setIsSelectingBox(false);
      if (Math.abs(marqueeBox.width) > 5 && Math.abs(marqueeBox.height) > 5) {
        selectSeatsInBox(marqueeBox);
        marqueeEndedRef.current = true;
      }
      setMarqueeBox(null);
    }
  };

  // Navigate from minimap
  const handleMinimapNavigate = (targetFloorX: number, targetFloorY: number) => {
    const newPanX = containerSize.width / 2 - targetFloorX * zoom;
    const newPanY = containerSize.height / 2 - targetFloorY * zoom;
    setPan(newPanX, newPanY);
  };

  const floorWidth = floor?.width || 2800;
  const floorHeight = floor?.height || 1800;

  const handleSelectObject = (id: string, multi: boolean) => {
    if (suppressClickRef.current || activeTool !== 'select') return;
    // A selection box dragged inside a room ends with a click on it; keep the box's seats
    const o = objects.find((x) => x.id === id);
    if (o?.type === 'room' && marqueeEndedRef.current) return;
    selectObject(id, multi);
  };

  const renderLayer = (layerId: LayerId) => {
    const layer = layers[layerId];
    if (!layer.visible) return null;
    const list = objects.filter((o) => layerOf(o) === layerId);
    if (!list.length) return <g key={layerId} id={`layer-${layerId}`} />;
    return (
      <g key={layerId} id={`layer-${layerId}`} opacity={layer.opacity}>
        {list.map((obj) => (
          <FloorObjectElement
            key={obj.id}
            object={obj}
            isSelected={selectedObjectIds.includes(obj.id)}
            isHovered={hoverObjectId === obj.id}
            interactive={!layer.locked && activeTool === 'select'}
            onSelect={handleSelectObject}
            onHover={(id) => setHoverObject(id)}
            onPointerDown={onObjectPointerDown}
          />
        ))}
      </g>
    );
  };

  const selectedObject =
    selectedObjectIds.length === 1 && selectedSeatIds.length === 0 ? objects.find((o) => o.id === selectedObjectIds[0]) : undefined;
  const showHandles = !!selectedObject && canEdit && activeTool === 'select' && !selectedObject.locked && !layers[layerOf(selectedObject)].locked && !selectedObject.hidden;

  const cursorClass = isPanning || isSpacePressed || activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : DRAW_TOOLS.includes(activeTool) ? 'cursor-crosshair' : 'cursor-default';

  const previewStroke = '#0369a1';
  const renderDraft = () => {
    if (!draft) return null;
    const { tool, a, b } = draft;
    if (tool === 'wall' || tool === 'glass') {
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={previewStroke} strokeWidth={tool === 'wall' ? 10 : 8} strokeOpacity={0.6} />;
    }
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    const cols = Math.max(1, Math.round(w / SEAT_CELL_W));
    const rows = Math.max(1, Math.round(h / SEAT_CELL_H));
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="rgba(2,132,199,0.15)" stroke={previewStroke} strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={12 / zoom + 2} fill="#0c4a6e">
          {tool === 'workstation' ? `${rows * cols} seats  (${(w / 10).toFixed(1)} x ${(h / 10).toFixed(1)} ft)` : `${(w / 10).toFixed(1)} x ${(h / 10).toFixed(1)} ft`}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#e2e8f0] overflow-hidden select-none ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={() => activeTool === 'polyroom' && finishPolygon()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* CAD Rulers */}
      {showRulers && (
        <Rulers
          width={containerSize.width}
          height={containerSize.height}
          zoom={zoom}
          panX={panX}
          panY={panY}
          cursorX={cursorPos.x}
          cursorY={cursorPos.y}
        />
      )}

      {/* Primary SVG Vector Canvas */}
      <svg
        id="cad-main-svg"
        data-floor-width={floorWidth}
        data-floor-height={floorHeight}
        ref={svgRef}
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Minor CAD Grid (20px) */}
          <pattern
            id="cad-grid-minor"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="#dbe3ee"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Major CAD Grid (100px) */}
          <pattern
            id="cad-grid-major"
            width={gridSize * 5}
            height={gridSize * 5}
            patternUnits="userSpaceOnUse"
          >
            <rect width={gridSize * 5} height={gridSize * 5} fill="url(#cad-grid-minor)" />
            <path
              d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
              fill="none"
              stroke="#b6c2d2"
              strokeWidth="1.2"
            />
          </pattern>

          {/* Blocked seat striped pattern */}
          <pattern
            id="blocked-stripe-pattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="4" />
          </pattern>
        </defs>

        {/* Global Pan and Zoom Transformation Group */}
        <g id="cad-viewport" transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Floor Canvas Background & Grid */}
          <rect x={0} y={0} width={floorWidth} height={floorHeight} fill="#ffffff" pointerEvents="none" />
          <rect
            id="cad-canvas-bg"
            x={0}
            y={0}
            width={floorWidth}
            height={floorHeight}
            fill={showGrid ? 'url(#cad-grid-major)' : '#ffffff'}
            stroke="#0369a1"
            strokeWidth={1.5}
            strokeDasharray="8 4"
          />

          {/* Objects, one group per layer: the layer's visibility, opacity and lock apply to everything on it */}
          {LAYER_ORDER.map(renderLayer)}

          {/* PHYSICAL SEATS LAYER */}
          {layers.seats.visible && (
            <g id="layer-seats" opacity={layers.seats.opacity}>
              {seats.map((seat) => (
                <SeatElement
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatIds.includes(seat.id)}
                  isHovered={hoverSeatId === seat.seatId}
                  viewMode={viewMode}
                  programFilter={selectedProgramFilter}
                  statusFilter={selectedStatusFilter}
                  interactive={!layers.seats.locked && activeTool === 'select'}
                  onSelect={(seatId, multi) => {
                    if (!suppressClickRef.current) selectSeat(seatId, multi);
                  }}
                  onHover={(sId) => setHoverSeat(sId)}
                  onPointerDown={onSeatPointerDown}
                />
              ))}
            </g>
          )}

          {/* Resize / rotate / corner handles */}
          {showHandles && selectedObject && <EditHandles object={selectedObject} zoom={zoom} onGrab={onGrabHandle} />}

          {/* Shape being drawn */}
          <g data-export-hide="true" pointerEvents="none">
            {renderDraft()}
            {polyPts.length > 0 && (
              <g>
                <polyline
                  points={[...polyPts, ...(polyCursor ? [polyCursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(2,132,199,0.14)"
                  stroke={previewStroke}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                {polyPts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={(i === 0 ? 7 : 4) / zoom + 1} fill={i === 0 ? '#f59e0b' : '#fff'} stroke={previewStroke} strokeWidth={1.5} />
                ))}
              </g>
            )}
          </g>

          {/* MARQUEE SELECTION RECTANGLE */}
          {marqueeBox && (
            <rect
              data-export-hide="true"
              x={Math.min(marqueeBox.x, marqueeBox.x + marqueeBox.width)}
              y={Math.min(marqueeBox.y, marqueeBox.y + marqueeBox.height)}
              width={Math.abs(marqueeBox.width)}
              height={Math.abs(marqueeBox.height)}
              fill="rgba(2, 132, 199, 0.15)"
              stroke="#0369a1"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {/* Drawing tools */}
      <DrawToolbar polyPoints={polyPts.length} onFinishPolygon={finishPolygon} />

      {/* MiniMap Navigator */}
      {showMinimap && (
        <MiniMap
          floorWidth={floorWidth}
          floorHeight={floorHeight}
          viewportWidth={containerSize.width}
          viewportHeight={containerSize.height}
          zoom={zoom}
          panX={panX}
          panY={panY}
          objects={objects}
          seats={seats}
          onNavigate={handleMinimapNavigate}
        />
      )}

      {/* Floating Hover Tooltip */}
      {hoverSeatId && !gestureRef.current && (
        (() => {
          const hoveredSeat = seats.find((s) => s.seatId === hoverSeatId);
          if (!hoveredSeat) return null;
          return (
            <div
              className="absolute bg-slate-900/95 border border-slate-700 text-xs text-slate-50 p-2.5 rounded-lg shadow-xl backdrop-blur-md pointer-events-none z-30 transition-transform font-sans"
              style={{
                left: `${cursorPos.x + 15}px`,
                top: `${cursorPos.y + 15}px`,
              }}
            >
              <div className="font-bold text-sky-400 flex items-center justify-between gap-3">
                <span>{hoveredSeat.seatId}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {hoveredSeat.bayCode || 'Seat'}
                </span>
              </div>
              <div className="mt-1 text-slate-300">
                <span className="text-slate-400">Program: </span>
                <span className="font-medium" style={{ color: hoveredSeat.programColor || '#475569' }}>
                  {hoveredSeat.programName || 'Unallocated'}
                </span>
              </div>
              {hoveredSeat.isBlocked ? (
                <div className="mt-1 text-red-400 flex items-center gap-1 font-semibold">
                  <span>⚠ BLOCKED: {hoveredSeat.blockReason || 'General'}</span>
                </div>
              ) : (
                <div className="mt-1 text-slate-400 text-[11px]">
                  Shift: {hoveredSeat.shift || '09:00 - 18:00'}
                </div>
              )}
              {hoveredSeat.employeeName && (
                <div className="mt-0.5 text-slate-400 text-[11px]">
                  Assigned: {hoveredSeat.employeeName}
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
};
