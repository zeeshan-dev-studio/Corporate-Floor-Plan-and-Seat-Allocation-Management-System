import React from 'react';
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
  const mapWidth = 200;
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

  return (
    <div
      onClick={handleClick}
      className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-1 shadow-2xl backdrop-blur-md cursor-crosshair z-20 overflow-hidden"
      style={{ width: mapWidth + 10, height: mapHeight + 10 }}
    >
      <div className="relative w-full h-full bg-slate-950 rounded border border-slate-800 overflow-hidden">
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
              fill="#475569"
              fillOpacity={0.3}
              stroke="#64748b"
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
      <div className="text-[9px] font-mono text-slate-400 text-center mt-0.5">
        MINIMAP ({Math.round(zoom * 100)}%)
      </div>
    </div>
  );
};
