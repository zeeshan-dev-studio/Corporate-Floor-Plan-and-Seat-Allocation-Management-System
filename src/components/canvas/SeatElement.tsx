import React from 'react';
import { SeatDTO, ViewMode } from '@/types/floorplan';

interface SeatElementProps {
  seat: SeatDTO;
  isSelected: boolean;
  isHovered: boolean;
  viewMode: ViewMode;
  programFilter: string | null;
  statusFilter: string | null;
  /** False when the seats layer is locked. */
  interactive?: boolean;
  onSelect: (seatId: string, multi: boolean) => void;
  onHover: (seatId: string | null) => void;
  onPointerDown?: (id: string, e: React.MouseEvent) => void;
}

export const SeatElement: React.FC<SeatElementProps> = React.memo(
  ({
    seat,
    isSelected,
    isHovered,
    viewMode,
    programFilter,
    statusFilter,
    interactive = true,
    onSelect,
    onHover,
    onPointerDown,
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
    let fillColor = '#e2e8f0';
    let strokeColor = '#334155';
    let textColor = '#cbd5e1';

    if (viewMode === 'operational') {
      if (seat.isBlocked) {
        fillColor = '#fecaca'; // Light red
        strokeColor = '#b91c1c'; // Strong red
      } else if (seat.programColor) {
        fillColor = seat.programColor;
        strokeColor = '#0f172a';
      } else {
        fillColor = '#ffffff'; // Unallocated
        strokeColor = '#1e293b';
      }
    } else {
      // Architectural mode: clean neutral CAD styling
      fillColor = '#ffffff';
      strokeColor = '#334155';
    }

    const radius = 10;
    // Dark text on light program colours, white text on dark ones
    const badgeInk = (() => {
      const m = /^#([0-9a-f]{6})$/i.exec(seat.programColor || '');
      if (!m) return '#0f172a';
      const n = parseInt(m[1], 16);
      return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#0f172a' : '#ffffff';
    })();

    return (
      <g
        transform={`translate(${seat.x}, ${seat.y}) rotate(${seat.rotation})`}
        className={`transition-opacity duration-150 select-none ${interactive ? 'cursor-pointer' : 'pointer-events-none'} ${
          isDimmed ? 'opacity-20' : 'opacity-100'
        }`}
        onMouseDown={(e) => onPointerDown?.(seat.id, e)}
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
            stroke="#0369a1"
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
            stroke="#334155"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        )}

        {/* Chair Seat Cushion */}
        <circle
          r={radius}
          fill={fillColor}
          fillOpacity={viewMode === 'operational' && seat.programColor ? 0.92 : 1}
          stroke={isSelected ? '#0369a1' : strokeColor}
          strokeWidth={isSelected ? 2 : 1.2}
        />

        {/* Blocked diagonal cross / caution indicator */}
        {viewMode === 'operational' && seat.isBlocked && (
          <g stroke="#991b1b" strokeWidth={2} strokeLinecap="round">
            <line x1={-5} y1={-5} x2={5} y2={5} />
            <line x1={-5} y1={5} x2={5} y2={-5} />
          </g>
        )}

        {/* Chair Backrest Arc */}
        <path
          d={`M ${-radius - 2} ${radius - 2} Q 0 ${radius + 6} ${radius + 2} ${radius - 2}`}
          fill="none"
          stroke={isSelected ? '#0369a1' : strokeColor}
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

        {/* Seat type marker: team lead, ops manager, accessible, hot desk */}
        {seat.seatType && seat.seatType !== 'standard' && (
          <g className="pointer-events-none">
            <circle
              cx={radius}
              cy={-radius}
              r={5.5}
              fill={{ team_lead: '#f59e0b', ops_manager: '#a855f7', accessible: '#0ea5e9', hot_desk: '#10b981' }[seat.seatType] || '#64748b'}
              stroke="#0f172a"
              strokeWidth={1}
            />
            <text x={radius} y={-radius} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="bold" fill="#0f172a">
              {{ team_lead: 'T', ops_manager: 'M', accessible: 'A', hot_desk: 'H' }[seat.seatType] || ''}
            </text>
          </g>
        )}

        {/* Seat ID or Program Initial Badge */}
        {viewMode === 'operational' && seat.programCode && !seat.isBlocked && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            fontWeight="bold"
            fill={badgeInk}
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
