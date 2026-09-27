import React from 'react';
import { FloorObjectDTO } from '@/types/floorplan';

interface FloorObjectElementProps {
  object: FloorObjectDTO;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onHover: (id: string | null) => void;
}

export const FloorObjectElement: React.FC<FloorObjectElementProps> = React.memo(
  ({ object, isSelected, isHovered, onSelect, onHover }) => {
    if (object.hidden) return null;

    const { x, y, width, height, rotation, type, subType, geometry, properties } = object;
    const label = properties?.label || '';
    const roomType = properties?.roomType || '';

    // Render specialized graphics based on type and subType
    return (
      <g
        id={`obj-${object.id}`}
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
        className={`cursor-pointer select-none transition-colors ${
          object.locked ? 'pointer-events-none' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(object.id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        onMouseEnter={() => onHover(object.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Selection / Hover Indicator */}
        {isSelected && (
          <rect
            x={-6}
            y={-6}
            width={width + 12}
            height={height + 12}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            rx={4}
          />
        )}

        {/* 1. ROOM / SPACE */}
        {type === 'room' && (
          <g>
            <rect
              width={width}
              height={height}
              fill={properties?.fill || 'rgba(30, 41, 59, 0.4)'}
              stroke={isSelected ? '#38bdf8' : properties?.stroke || '#475569'}
              strokeWidth={properties?.strokeWidth || 3}
              rx={2}
            />
            {/* Room Label Block */}
            <g transform={`translate(${width / 2}, ${Math.min(height / 2, 40)})`}>
              <text
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="#f1f5f9"
                className="pointer-events-none"
              >
                {label}
              </text>
              {roomType && (
                <text
                  y={18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94a3b8"
                  className="pointer-events-none"
                >
                  {roomType} {properties?.capacity ? `• Cap: ${properties.capacity}` : ''}
                  {properties?.areaSqFt ? ` • ${properties.areaSqFt} sq ft` : ''}
                </text>
              )}
            </g>
          </g>
        )}

        {/* 2. WALLS */}
        {type === 'wall' && (
          <g>
            {/* Walls with fill "none" (the building envelope) are outlines: a solid fill
                would hide the rooms inside and catch every click on the floor */}
            <rect
              width={width}
              height={height}
              fill={geometry?.fill ?? '#1e293b'}
              stroke={isSelected ? '#38bdf8' : geometry?.stroke ?? '#475569'}
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
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="8 3"
            />
          </g>
        )}

        {/* 4. WORKSTATION BAY / POD */}
        {type === 'bay' && (
          <g>
            {/* Main Desk Surface */}
            <rect
              width={width}
              height={height}
              fill="#1e222b"
              stroke={isSelected ? '#38bdf8' : '#334155'}
              strokeWidth={1.5}
              rx={4}
            />
            {/* Center Privacy Screen / Divider */}
            {subType === 'linearBench' && (
              <line
                x1={10}
                y1={height / 2}
                x2={width - 10}
                y2={height / 2}
                stroke="#64748b"
                strokeWidth={3}
                strokeLinecap="round"
              />
            )}
            {/* Y-Bay Center Hub & 3 Wings */}
            {subType === 'yBay' && (
              <g stroke="#3b82f6" strokeWidth={2}>
                <circle cx={width / 2} cy={height / 2} r={12} fill="#0f172a" />
                <line x1={width / 2} y1={height / 2} x2={width / 2} y2={10} />
                <line
                  x1={width / 2}
                  y1={height / 2}
                  x2={width / 2 - 45}
                  y2={height - 15}
                />
                <line
                  x1={width / 2}
                  y1={height / 2}
                  x2={width / 2 + 45}
                  y2={height - 15}
                />
              </g>
            )}
            {/* Bay Code Label */}
            <text
              x={width / 2}
              y={height / 2 - 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="bold"
              fill="#94a3b8"
              className="pointer-events-none"
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
                  fill="#065f46"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  rx={3}
                />
                {/* Direction arrows */}
                <path
                  d={`M 15 ${height / 2} L ${width - 15} ${height / 2} M ${width - 22} ${height / 2 - 5} L ${width - 15} ${height / 2} L ${width - 22} ${height / 2 + 5}`}
                  fill="none"
                  stroke="#34d399"
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
              <g>
                {/* Standard Door Leaf and Swing Arc */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="#38bdf8" strokeWidth={3} />
                <path
                  d={`M 0 ${height} A ${height} ${height} 0 0 1 ${height} 0`}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={1}
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
              fill="#0f172a"
              stroke="#64748b"
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
                  fill="#1e293b"
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
                <line x1={8} y1={8} x2={width - 8} y2={height - 8} stroke="#475569" />
                <line x1={8} y1={height - 8} x2={width - 8} y2={8} stroke="#475569" />
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#f1f5f9"
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
                    stroke="#ef4444"
                    strokeWidth={1.5}
                  />
                ))}
                {/* Arrow up/down */}
                <path
                  d={`M ${width / 2} ${height - 20} L ${width / 2} 25 M ${width / 2 - 6} 35 L ${width / 2} 25 L ${width / 2 + 6} 35`}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth={2}
                />
                <text
                  x={width / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#ef4444"
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
                <circle cx={width / 2} cy={height / 2} r={35} fill="none" stroke="#0284c7" strokeWidth={1} strokeOpacity={0.25} />
                <circle cx={width / 2} cy={height / 2} r={20} fill="none" stroke="#38bdf8" strokeWidth={1} strokeOpacity={0.4} />
                <circle cx={width / 2} cy={height / 2} r={10} fill="#0284c7" stroke="#38bdf8" strokeWidth={2} />
                <text
                  x={width / 2}
                  y={height / 2 + 18}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="bold"
                  fill="#38bdf8"
                >
                  {label}
                </text>
              </g>
            ) : subType === 'serverRack' ? (
              <g>
                <rect width={width} height={height} fill="#0284c7" stroke="#38bdf8" strokeWidth={2} rx={2} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <line
                    key={i}
                    x1={6}
                    y1={15 + i * 16}
                    x2={width - 6}
                    y2={15 + i * 16}
                    stroke="#082f49"
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
              <rect width={width} height={height} fill="#0369a1" stroke="#38bdf8" rx={2} />
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
              stroke="#fca5a5"
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
        {type === 'furniture' && (
          <g>
            <rect
              width={width}
              height={height}
              fill={properties?.fill || '#334155'}
              stroke={isSelected ? '#38bdf8' : properties?.stroke || '#64748b'}
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
              fill="#f1f5f9"
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
