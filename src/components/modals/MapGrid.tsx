'use client';

import React, { useRef } from 'react';
import { lighten } from '@/lib/excelMap/colors';
import { ROOM_COLOR } from '@/lib/excelMap/palette';
import { FloorMapModel, KIND_LABEL } from '@/lib/excelMap/types';

export type MapTool = 'select' | 'paint' | 'erase';
export type MapSelection = { kind: 'seat' | 'room'; index: number } | null;

interface Props {
  model: FloorMapModel;
  /** Pixels per grid cell. */
  pitch: number;
  tool: MapTool;
  selected: MapSelection;
  /** Seat indexes with a problem (duplicate id), drawn with a red dashed outline. */
  errorSeats: Set<number>;
  /** Final seat id per seat index, for the hover tooltip. */
  seatIds: string[];
  /** Legend key to emphasise; every other seat is dimmed. */
  highlight: string | null;
  onCell: (row: number, col: number, phase: 'down' | 'drag') => void;
}

/** The Excel map as HTML: coloured boxes for seats, merged boxes for rooms. Click / drag to edit. */
export const MapGrid: React.FC<Props> = ({ model, pitch, tool, selected, errorSeats, seatIds, highlight, onCell }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastCell = useRef('');
  const byKey: Record<string, (typeof model.legend)[number]> = {};
  model.legend.forEach((e) => (byKey[e.key] = e));

  const cellAt = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / pitch);
    const row = Math.floor((e.clientY - rect.top) / pitch);
    if (row < 0 || col < 0 || row >= model.rows || col >= model.cols) return null;
    return { row, col };
  };

  const handle = (e: React.MouseEvent, phase: 'down' | 'drag') => {
    const c = cellAt(e);
    if (!c) return;
    const id = c.row + ',' + c.col;
    if (phase === 'drag' && id === lastCell.current) return;
    lastCell.current = id;
    onCell(c.row, c.col, phase);
  };

  const inner = pitch - 4;
  return (
    <div
      ref={canvasRef}
      className="relative select-none"
      style={{ width: model.cols * pitch, height: model.rows * pitch, cursor: tool === 'select' ? 'pointer' : 'crosshair' }}
      onMouseDown={(e) => {
        dragging.current = true;
        lastCell.current = '';
        handle(e, 'down');
      }}
      onMouseMove={(e) => dragging.current && tool !== 'select' && handle(e, 'drag')}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
    >
      {model.rooms.map((r, i) => {
        const c = r.color || ROOM_COLOR;
        const isSel = selected?.kind === 'room' && selected.index === i;
        return (
          <div
            key={'room' + i}
            className="absolute flex items-center justify-center text-center font-bold overflow-hidden"
            style={{
              left: r.col * pitch,
              top: r.row * pitch,
              width: r.colSpan * pitch - 4,
              height: r.rowSpan * pitch - 4,
              border: '3px solid ' + c,
              background: lighten(c, 0.9),
              color: c,
              borderRadius: 3,
              fontSize: 11,
              outline: isSel ? '3px solid #0ea5e9' : undefined,
              outlineOffset: 1,
              pointerEvents: 'none',
            }}
          >
            {r.label}
          </div>
        );
      })}

      {model.seats.map((s, i) => {
        const e = byKey[s.legendKey];
        if (!e) return null;
        const isSel = selected?.kind === 'seat' && selected.index === i;
        const dim = highlight && highlight !== s.legendKey;
        return (
          <div
            key={'seat' + i}
            title={(seatIds[i] || s.label || 'No number') + ' - ' + e.label + ' (' + KIND_LABEL[e.kind] + ')'}
            className="absolute flex items-center justify-center overflow-hidden whitespace-nowrap"
            style={{
              left: s.col * pitch,
              top: s.row * pitch,
              width: inner,
              height: inner,
              border: '3px solid ' + e.color,
              background: e.kind === 'vacant' ? '#ffffff' : lighten(e.color, 0.86),
              borderRadius: 3,
              fontSize: Math.max(7, Math.round(pitch / 4.4)),
              color: '#1e293b',
              opacity: dim ? 0.18 : 1,
              outline: isSel ? '3px solid #0ea5e9' : errorSeats.has(i) ? '2px dashed #dc2626' : undefined,
              outlineOffset: 1,
              pointerEvents: 'none',
            }}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
};
