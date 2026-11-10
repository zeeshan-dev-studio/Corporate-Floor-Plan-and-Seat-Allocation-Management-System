import React, { useState } from 'react';
import { ChevronDown, Map as MapIcon } from 'lucide-react';
import { FloorObjectDTO, SeatDTO } from '@/types/floorplan';

interface MiniMapProps {
  floorWidth: number;
  floorHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  objects: FloorObjectDTO[];
  seats: SeatDTO[];
  onNavigate: (floorX: number, floorY: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  floorWidth,
  floorHeight,
  viewportWidth,
  viewportHeight,
  zoom,
  panX,
  panY,
  objects,
  seats,
  onNavigate,
}) => {
  const [open, setOpen] = useState(true);
  const mapWidth = 160;
  const mapHeight = (mapWidth * floorHeight) / floorWidth;

  const scaleX = mapWidth / floorWidth;
  const scaleY = mapHeight / floorHeight;

  // Viewport box in floor coordinates
  const vpFloorX = -panX / zoom;
  const vpFloorY = -panY / zoom;
  const vpFloorW = viewportWidth / zoom;
  const vpFloorH = viewportHeight / zoom;

  // Viewport box in minimap coordinates
  const vpMapX = Math.max(0, vpFloorX * scaleX);
  const vpMapY = Math.max(0, vpFloorY * scaleY);
  const vpMapW = Math.min(mapWidth, vpFloorW * scaleX);
  const vpMapH = Math.min(mapHeight, vpFloorH * scaleY);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const targetFloorX = clickX / scaleX;
    const targetFloorY = clickY / scaleY;
    onNavigate(targetFloorX, targetFloorY);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Show the minimap"
        className="absolute bottom-4 right-8 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-xs font-semibold text-slate-100 shadow-md hover:bg-slate-800"
      >
        <MapIcon className="w-4 h-4" /> Map
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-8 z-20 bg-slate-900 border border-slate-600 rounded-lg shadow-xl overflow-hidden" style={{ width: mapWidth + 10 }}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700 text-[11px] font-semibold text-slate-100">
        <span>Map · {Math.round(zoom * 100)}%</span>
        <button onClick={() => setOpen(false)} title="Hide the minimap" aria-label="Hide minimap" className="p-0.5 rounded hover:bg-slate-700">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    <div
      onClick={handleClick}
      className="p-1 cursor-crosshair"
      style={{ width: mapWidth + 10, height: mapHeight + 10 }}
    >
      <div className="relative w-full h-full bg-slate-950 rounded border border-slate-700 overflow-hidden">
        <svg
          viewBox={`0 0 ${floorWidth} ${floorHeight}`}
          className="w-full h-full opacity-60"
        >
          {/* Objects outlines */}
          {objects.map((obj) => (
            <rect
              key={obj.id}
              x={obj.x}
              y={obj.y}
              width={obj.width}
              height={obj.height}
              fill="#334155"
              fillOpacity={0.3}
              stroke="#0f172a"
              strokeWidth={4}
            />
          ))}

          {/* Seat dots */}
          {seats.map((seat) => (
            <circle
              key={seat.id}
              cx={seat.x}
              cy={seat.y}
              r={12}
              fill={seat.programColor || '#64748b'}
            />
          ))}
        </svg>

        {/* Current Camera Viewport Box */}
        <div
          className="absolute border-2 border-sky-400 bg-sky-400/20 pointer-events-none rounded-sm transition-all duration-75"
          style={{
            left: `${vpMapX}px`,
            top: `${vpMapY}px`,
            width: `${Math.max(12, vpMapW)}px`,
            height: `${Math.max(10, vpMapH)}px`,
          }}
        />
      </div>
    </div>
    </div>
  );
};
