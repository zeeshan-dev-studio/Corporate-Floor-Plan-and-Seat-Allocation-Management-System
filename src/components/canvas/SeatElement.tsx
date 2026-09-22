import React from 'react';
import { SeatDTO, ViewMode } from '@/types/floorplan';

interface SeatElementProps {
  seat: SeatDTO;
  isSelected: boolean;
  isHovered: boolean;
  viewMode: ViewMode;
  programFilter: string | null;
  statusFilter: string | null;
  onSelect: (seatId: string, multi: boolean) => void;
  onHover: (seatId: string | null) => void;
}

export const SeatElement: React.FC<SeatElementProps> = React.memo(
  ({
    seat,
    isSelected,
    isHovered,
    viewMode,
    programFilter,
    statusFilter,
    onSelect,
    onHover,
  }) => {
    // Check if dimmed due to active filters
    let isDimmed = false;
    if (viewMode === 'operational') {
      if (programFilter && seat.programId !== programFilter) {
        isDimmed = true;
      }
      if (statusFilter) {
        if (statusFilter === 'ALLOCATED' && (seat.allocationStatus !== 'ALLOCATED' || seat.isBlocked)) {
          isDimmed = true;
        } else if (statusFilter === 'BLOCKED' && !seat.isBlocked) {
          isDimmed = true;
        } else if (statusFilter === 'UNALLOCATED' && (seat.programId || seat.isBlocked)) {
          isDimmed = true;
        }
      }
    }

    // Determine colors
    let fillColor = '#334155'; // default slate-700
    let strokeColor = '#475569';
    let textColor = '#cbd5e1';

    if (viewMode === 'operational') {
      if (seat.isBlocked) {
        fillColor = '#7f1d1d'; // Dark red
        strokeColor = '#ef4444'; // Bright red
      } else if (seat.programColor) {
        fillColor = seat.programColor;
        strokeColor = '#ffffff';
      } else {
        fillColor = '#1e293b'; // Unallocated
        strokeColor = '#475569';
      }
    } else {
      // Architectural mode: clean neutral CAD styling
      fillColor = '#1e293b';
      strokeColor = '#64748b';
    }

    const radius = 10;

    return (
      <g
        transform={`translate(${seat.x}, ${seat.y}) rotate(${seat.rotation})`}
        className={`cursor-pointer transition-opacity duration-150 select-none ${
          isDimmed ? 'opacity-20' : 'opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(seat.id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        onMouseEnter={() => onHover(seat.seatId)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Selection Glow / Ring */}
        {isSelected && (
          <circle
            r={radius + 6}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2.5}
            strokeDasharray="4 2"
            className="animate-pulse"
          />
        )}

        {/* Hover Highlight Ring */}
        {isHovered && !isSelected && (
          <circle
            r={radius + 4}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        )}

        {/* Chair Seat Cushion */}
        <circle
          r={radius}
          fill={fillColor}
          fillOpacity={viewMode === 'operational' && seat.programColor ? 0.9 : 0.6}
          stroke={isSelected ? '#38bdf8' : strokeColor}
          strokeWidth={isSelected ? 2 : 1.2}
        />

        {/* Blocked diagonal cross / caution indicator */}
        {viewMode === 'operational' && seat.isBlocked && (
          <g stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round">
            <line x1={-5} y1={-5} x2={5} y2={5} />
            <line x1={-5} y1={5} x2={5} y2={-5} />
          </g>
        )}

        {/* Chair Backrest Arc */}
        <path
          d={`M ${-radius - 2} ${radius - 2} Q 0 ${radius + 6} ${radius + 2} ${radius - 2}`}
          fill="none"
          stroke={isSelected ? '#38bdf8' : strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Chair Armrests */}
        <line
          x1={-radius - 2}
          y1={-3}
          x2={-radius - 2}
          y2={5}
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <line
          x1={radius + 2}
          y1={-3}
          x2={radius + 2}
          y2={5}
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Seat ID or Program Initial Badge */}
        {viewMode === 'operational' && seat.programCode && !seat.isBlocked && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            fontWeight="bold"
            fill="#ffffff"
            className="pointer-events-none"
          >
            {seat.programCode.substring(0, 2)}
          </text>
        )}
      </g>
    );
  }
);

SeatElement.displayName = 'SeatElement';
