import React from 'react';
import { FloorObjectDTO } from '@/types/floorplan';
import { FurnitureArt } from './FurnitureArt';
import { objectAreaSqFt, objectPoints, polygonCentroid } from '@/lib/floorGeometry';

interface FloorObjectElementProps {
  object: FloorObjectDTO;
  isSelected: boolean;
  isHovered: boolean;
  /** False when the object or its layer is locked: it is drawn but cannot be clicked or dragged. */
  interactive?: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onHover: (id: string | null) => void;
  onPointerDown?: (id: string, e: React.MouseEvent) => void;
}

const FURNITURE_ART = new Set(['confTable', 'sofa', 'cabinet', 'plant']);

/** Text colour that stays readable on a fill: dark text on light or see-through fills, white on dark ones. */
const inkFor = (fill: string | undefined, dark = '#0f172a', light = '#ffffff'): string => {
  if (!fill || fill === 'none') return dark;
  let r = 255, g = 255, b = 255, a = 1;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(fill);
  const rgb = /^rgba?\(([^)]+)\)/i.exec(fill);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else if (rgb) {
    const n = rgb[1].split(',').map((x) => parseFloat(x));
    [r, g, b] = n; a = n.length > 3 ? n[3] : 1;
  }
  r = r * a + 255 * (1 - a); g = g * a + 255 * (1 - a); b = b * a + 255 * (1 - a);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? dark : light;
};

/** The outline of a room / workstation / furniture piece: rectangle, ellipse or polygon. */
const Outline: React.FC<{
  object: FloorObjectDTO;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx?: number;
}> = ({ object, fill, stroke, strokeWidth, rx = 2 }) => {
  const pts = objectPoints(object);
  if (pts) {
    return (
      <polygon
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }
  if (object.geometry?.shape === 'circle') {
    return (
      <ellipse
        cx={object.width / 2}
        cy={object.height / 2}
        rx={object.width / 2}
        ry={object.height / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return <rect width={object.width} height={object.height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={rx} />;
};

export const FloorObjectElement: React.FC<FloorObjectElementProps> = React.memo(
  ({ object, isSelected, isHovered, interactive = true, onSelect, onHover, onPointerDown }) => {
    if (object.hidden) return null;

    const { x, y, width, height, rotation, type, subType, geometry, properties } = object;
    const label = properties?.label || '';
    const roomType = properties?.roomType || '';

    // Render specialized graphics based on type and subType
    return (
      <g
        id={`obj-${object.id}`}
        transform={`translate(${x}, ${y}) rotate(${rotation}, ${width / 2}, ${height / 2})`}
        className={`select-none transition-colors ${interactive ? 'cursor-pointer' : 'pointer-events-none'}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(object.id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        onMouseDown={(e) => onPointerDown?.(object.id, e)}
        onMouseEnter={() => onHover(object.id)}
        onMouseLeave={() => onHover(null)}
      >

        {/* 1. ROOM / SPACE: rectangle, L/T/U-shape, ellipse or any drawn polygon */}
        {type === 'room' && (() => {
          const pts = objectPoints(object);
          const centre = pts ? polygonCentroid(pts) : { x: width / 2, y: Math.min(height / 2, 40) };
          const area = objectAreaSqFt(object);
          const size = Math.max(9, Math.min(13, Math.min(width, height) / 9));
          return (
            <g>
              <Outline
                object={object}
                fill={properties?.fill || 'rgba(14, 116, 144, 0.10)'}
                stroke={isSelected ? '#0369a1' : properties?.stroke || '#1e293b'}
                strokeWidth={properties?.strokeWidth || 3}
              />
              <g transform={`translate(${centre.x}, ${centre.y})`}>
                <text textAnchor="middle" fontSize={size} fontWeight="bold" fill={inkFor(properties?.fill)} className="pointer-events-none">
                  {label}
                </text>
                <text y={size + 5} textAnchor="middle" fontSize={Math.max(8, size - 3)} fill={inkFor(properties?.fill, '#334155', '#e2e8f0')} className="pointer-events-none">
                  {roomType} {properties?.capacity ? `• Cap: ${properties.capacity}` : ''} • {area} sq ft
                </text>
              </g>
            </g>
          );
        })()}

        {/* 2. WALLS */}
        {type === 'wall' && (
          <g>
            {/* Walls with fill "none" (the building envelope) are outlines: a solid fill
                would hide the rooms inside and catch every click on the floor */}
            <rect
              width={width}
              height={height}
              fill={geometry?.fill ?? '#1e293b'}
              stroke={isSelected ? '#0369a1' : geometry?.stroke ?? '#1e293b'}
              strokeWidth={geometry?.strokeWidth ?? 2}
            />
            {/* Architectural cross hatching if thick wall */}
            {geometry?.fill !== 'none' && width > 20 && height > 20 && (
              <line
                x1={0}
                y1={0}
                x2={width}
                y2={height}
                stroke="#334155"
                strokeWidth={1}
              />
            )}
          </g>
        )}

        {/* 3. GLASS PARTITION */}
        {type === 'glass' && (
          <g>
            <rect
              width={width}
              height={height}
              fill="rgba(2, 132, 199, 0.18)"
              stroke="#0369a1"
              strokeWidth={2}
              strokeDasharray="8 3"
            />
          </g>
        )}

        {/* 4. WORKSTATION: the desk surface in any shape; its seats are drawn on the seats layer */}
        {type === 'bay' && (
          <g>
            <Outline
              object={object}
              fill={properties?.fill || '#e2e8f0'}
              stroke={isSelected ? '#0369a1' : properties?.stroke || '#1e293b'}
              strokeWidth={1.5}
              rx={4}
            />
            {/* Two-row benches (the usual BPO layout) get the divider screen and power spine down the middle */}
            {(Math.round(properties?.seatRows ?? 0) === 2 && properties?.arrangement !== 'around' && !objectPoints(object)) || subType === 'linearBench' || subType === 'pod6' ? (
              <g pointerEvents="none">
                <line x1={6} y1={height / 2} x2={width - 6} y2={height / 2} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
                <line x1={6} y1={height / 2} x2={width - 6} y2={height / 2} stroke="#ffffff" strokeWidth={0.8} strokeDasharray="3 5" />
              </g>
            ) : null}
            {/* Bay code, above the desk so seats never cover it */}
            <text
              x={width / 2}
              y={-5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#0f172a"
              className="pointer-events-none"
              transform={rotation ? `rotate(${-rotation}, ${width / 2}, -5)` : undefined}
            >
              {label}
            </text>
          </g>
        )}

        {/* 5. DOORS & TURNSTILES */}
        {type === 'door' && (
          <g>
            {subType === 'turnstile' ? (
              <g>
                <rect
                  width={width}
                  height={height}
                  fill="#047857"
                  stroke="#064e3b"
                  strokeWidth={1.5}
                  rx={3}
                />
                {/* Direction arrows */}
                <path
                  d={`M 15 ${height / 2} L ${width - 15} ${height / 2} M ${width - 22} ${height / 2 - 5} L ${width - 15} ${height / 2} L ${width - 22} ${height / 2 + 5}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={width / 2}
                  y={height / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="7"
                  fontWeight="bold"
                  fill="#ffffff"
                >
                  RFID
                </text>
              </g>
            ) : (
              <g transform={properties?.flip ? `translate(${width}, 0) scale(-1, 1)` : undefined}>
                {/* Standard Door Leaf and Swing Arc */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="#0369a1" strokeWidth={3} />
                <path
                  d={`M 0 ${height} A ${height} ${height} 0 0 1 ${height} 0`}
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </g>
            )}
          </g>
        )}

        {/* 6. FACILITIES (ELEVATORS / RESTROOMS / STAIRS) */}
        {type === 'facility' && (
          <g>
            <rect
              width={width}
              height={height}
              fill="#f1f5f9"
              stroke="#1e293b"
              strokeWidth={1.5}
              rx={2}
            />
            {subType === 'elevator' && (
              <g>
                <rect
                  x={8}
                  y={8}
                  width={width - 16}
                  height={height - 16}
                  fill="#cbd5e1"
                  stroke="#334155"
                  strokeWidth={1}
                />
                <line x1={8} y1={8} x2={width - 8} y2={height - 8} stroke="#334155" />
                <line x1={8} y1={height - 8} x2={width - 8} y2={8} stroke="#334155" />
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#0f172a"
                >
                  {label}
                </text>
              </g>
            )}
            {subType === 'stairs' && (
              <g>
                {/* Step treads */}
                {Array.from({ length: 6 }).map((_, idx) => (
                  <line
                    key={idx}
                    x1={10}
                    y1={15 + idx * 22}
                    x2={width - 10}
                    y2={15 + idx * 22}
                    stroke="#b91c1c"
                    strokeWidth={1.5}
                  />
                ))}
                {/* Arrow up/down */}
                <path
                  d={`M ${width / 2} ${height - 20} L ${width / 2} 25 M ${width / 2 - 6} 35 L ${width / 2} 25 L ${width / 2 + 6} 35`}
                  fill="none"
                  stroke="#b91c1c"
                  strokeWidth={2}
                />
                <text
                  x={width / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#b91c1c"
                >
                  FIRE EXIT
                </text>
              </g>
            )}
          </g>
        )}

        {/* 7. IT INFRASTRUCTURE (SERVER RACKS, WI-FI) */}
        {type === 'it' && (
          <g>
            {subType === 'wifi' ? (
              <g>
                {/* Wi-Fi Radio Waves */}
                <circle cx={width / 2} cy={height / 2} r={35} fill="none" stroke="#0369a1" strokeWidth={1.5} strokeOpacity={0.5} />
                <circle cx={width / 2} cy={height / 2} r={20} fill="none" stroke="#0369a1" strokeWidth={1.5} strokeOpacity={0.7} />
                <circle cx={width / 2} cy={height / 2} r={10} fill="#0369a1" stroke="#082f49" strokeWidth={2} />
                <text
                  x={width / 2}
                  y={height / 2 + 18}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="bold"
                  fill="#075985"
                >
                  {label}
                </text>
              </g>
            ) : subType === 'serverRack' ? (
              <g>
                <rect width={width} height={height} fill="#0369a1" stroke="#082f49" strokeWidth={2} rx={2} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <line
                    key={i}
                    x1={6}
                    y1={15 + i * 16}
                    x2={width - 6}
                    y2={15 + i * 16}
                    stroke="#e0f2fe"
                    strokeWidth={2}
                  />
                ))}
                <text
                  x={width / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#ffffff"
                >
                  {label}
                </text>
              </g>
            ) : (
              <rect width={width} height={height} fill="#0369a1" stroke="#082f49" rx={2} />
            )}
          </g>
        )}

        {/* 8. SAFETY EQUIPMENT (FIRE EXTINGUISHERS, ALARMS) */}
        {type === 'safety' && (
          <g>
            <rect
              width={width}
              height={height}
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth={1.5}
              rx={3}
            />
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fontWeight="bold"
              fill="#ffffff"
            >
              FE
            </text>
          </g>
        )}

        {/* 9. FURNITURE (CONFERENCE TABLES, STAGE) */}
        {type === 'furniture' && FURNITURE_ART.has(subType || '') && (
          <FurnitureArt
            subType={subType || ''}
            width={width}
            height={height}
            fill={properties?.fill}
            stroke={properties?.stroke}
            chairCount={properties?.chairCount}
            label={subType === 'confTable' ? undefined : undefined}
            selected={isSelected}
          />
        )}
        {type === 'furniture' && !FURNITURE_ART.has(subType || '') && (
          <g>
            <Outline
              object={object}
              fill={properties?.fill || '#e2e8f0'}
              stroke={isSelected ? '#0369a1' : properties?.stroke || '#334155'}
              strokeWidth={1.5}
              rx={subType === 'boardroomTable' ? 20 : 4}
            />
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="bold"
              fill={inkFor(properties?.fill || '#e2e8f0')}
            >
              {label}
            </text>
          </g>
        )}
      </g>
    );
  }
);

FloorObjectElement.displayName = 'FloorObjectElement';
