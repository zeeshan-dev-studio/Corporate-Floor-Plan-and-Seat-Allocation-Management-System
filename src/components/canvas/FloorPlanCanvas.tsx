'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFloorPlanStore, isDialogOpen } from '@/store/useFloorPlanStore';
import { SeatElement } from './SeatElement';
import { FloorObjectElement } from './FloorObjectElement';
import { Rulers } from './Rulers';
import { MiniMap } from './MiniMap';
import { RectBounds } from '@/types/floorplan';

interface FloorPlanCanvasProps {
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

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
    snapToGrid,
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
    updateObject,
    undo,
    redo,
    deleteSelectedObjects,
    selectAllSeats,
    pushHistory,
    closeDialogs,
  } = useFloorPlanStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  // True between the mouseup that finishes a selection box and the next mousedown
  const marqueeEndedRef = useRef(false);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // An open dialog owns the keyboard: Esc closes it, and canvas shortcuts must not
      // change the selection or layout the dialog is acting on
      if (isDialogOpen(useFloorPlanStore.getState())) {
        if (e.key === 'Escape') closeDialogs();
        return;
      }

      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        selectAllSeats();
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeRole === 'Administrator' || activeRole === 'Facility Manager') {
          deleteSelectedObjects();
        }
      } else if (e.key === 'Escape') {
        clearSelection();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(4.0, prev * 1.2));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => Math.max(0.15, prev / 1.2));
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
  }, [undo, redo, deleteSelectedObjects, clearSelection, selectAllSeats, setZoom, activeRole, closeDialogs]);

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
    const newZoom = Math.max(0.15, Math.min(4.0, zoom * zoomFactor));

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

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      // Middle click or spacebar pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    if (e.button === 0) {
      const { x, y } = screenToFloorCoords(e.clientX, e.clientY);
      marqueeEndedRef.current = false;

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

    if (isSelectingBox) {
      const width = x - boxStart.x;
      const height = y - boxStart.y;
      setMarqueeBox({ x: boxStart.x, y: boxStart.y, width, height });
      return;
    }

    if (draggingObjectId) {
      const obj = objects.find((o) => o.id === draggingObjectId);
      if (obj && !obj.locked) {
        let newX = x - dragOffset.x;
        let newY = y - dragOffset.y;
        if (snapToGrid) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }
        updateObject({ ...obj, x: newX, y: newY });
      }
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

    if (draggingObjectId) {
      setDraggingObjectId(null);
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#181b22] overflow-hidden select-none ${
        isPanning || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
              stroke="#262c38"
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
              stroke="#333b4c"
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
          <rect
            id="cad-canvas-bg"
            x={0}
            y={0}
            width={floorWidth}
            height={floorHeight}
            fill={showGrid ? 'url(#cad-grid-major)' : '#181b22'}
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="8 4"
          />

          {/* 1. ROOMS LAYER */}
          {layers.rooms.visible && (
            <g id="layer-rooms" opacity={layers.rooms.opacity}>
              {objects
                .filter((o) => o.type === 'room')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => {
                      // A selection box dragged inside the room ends with a click on it; keep the box's seats
                      if (!marqueeEndedRef.current) selectObject(id, multi);
                    }}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 2. ARCHITECTURE / WALLS LAYER */}
          {layers.architecture.visible && (
            <g id="layer-architecture" opacity={layers.architecture.opacity}>
              {objects
                .filter((o) => o.type === 'wall' || o.type === 'glass')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 3. DOORS LAYER */}
          {layers.doors.visible && (
            <g id="layer-doors" opacity={layers.doors.opacity}>
              {objects
                .filter((o) => o.type === 'door')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 4. WORKSTATION BAYS & PODS LAYER */}
          {layers.workstations.visible && (
            <g id="layer-workstations" opacity={layers.workstations.opacity}>
              {objects
                .filter((o) => o.type === 'bay')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 5. FURNITURE LAYER */}
          {layers.furniture.visible && (
            <g id="layer-furniture" opacity={layers.furniture.opacity}>
              {objects
                .filter((o) => o.type === 'furniture')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 6. FACILITIES LAYER */}
          {layers.facilities.visible && (
            <g id="layer-facilities" opacity={layers.facilities.opacity}>
              {objects
                .filter((o) => o.type === 'facility')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 7. IT INFRASTRUCTURE LAYER */}
          {layers.it.visible && (
            <g id="layer-it" opacity={layers.it.opacity}>
              {objects
                .filter((o) => o.type === 'it')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 8. SAFETY LAYER */}
          {layers.safety.visible && (
            <g id="layer-safety" opacity={layers.safety.opacity}>
              {objects
                .filter((o) => o.type === 'safety')
                .map((obj) => (
                  <FloorObjectElement
                    key={obj.id}
                    object={obj}
                    isSelected={selectedObjectIds.includes(obj.id)}
                    isHovered={hoverObjectId === obj.id}
                    onSelect={(id, multi) => selectObject(id, multi)}
                    onHover={(id) => setHoverObject(id)}
                  />
                ))}
            </g>
          )}

          {/* 9. PHYSICAL SEATS LAYER (LAYER B) */}
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
                  onSelect={(seatId, multi) => selectSeat(seatId, multi)}
                  onHover={(sId) => setHoverSeat(sId)}
                />
              ))}
            </g>
          )}

          {/* 10. MARQUEE SELECTION RECTANGLE */}
          {marqueeBox && (
            <rect
              data-export-hide="true"
              x={Math.min(marqueeBox.x, marqueeBox.x + marqueeBox.width)}
              y={Math.min(marqueeBox.y, marqueeBox.y + marqueeBox.height)}
              width={Math.abs(marqueeBox.width)}
              height={Math.abs(marqueeBox.height)}
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

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
      {hoverSeatId && (
        (() => {
          const hoveredSeat = seats.find((s) => s.seatId === hoverSeatId);
          if (!hoveredSeat) return null;
          return (
            <div
              className="absolute bg-slate-900/95 border border-slate-700 text-xs text-white p-2.5 rounded-lg shadow-xl backdrop-blur-md pointer-events-none z-30 transition-transform font-sans"
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
                <span className="font-medium" style={{ color: hoveredSeat.programColor || '#94a3b8' }}>
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
