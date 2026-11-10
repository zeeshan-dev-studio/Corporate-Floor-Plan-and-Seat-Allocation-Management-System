import React from 'react';
import { FloorObjectDTO } from '@/types/floorplan';
import { objectPoints } from '@/lib/floorGeometry';

export type HandleGrab =
  | { kind: 'resize'; handle: string }
  | { kind: 'rotate' }
  | { kind: 'vertex'; index: number }
  /** Insert a new corner after vertex `after`, then drag it. */
  | { kind: 'addVertex'; after: number };

const CURSORS: Record<string, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

interface EditHandlesProps {
  object: FloorObjectDTO;
  zoom: number;
  /** Resizing a rotated or polygon-shaped object from the box still works; vertices only exist for polygons. */
  onGrab: (grab: HandleGrab, e: React.MouseEvent) => void;
}

/** Resize / rotate / corner handles for the one selected object. Sizes stay constant on screen at any zoom. */
export const EditHandles: React.FC<EditHandlesProps> = ({ object, zoom, onGrab }) => {
  const { x, y, width: w, height: h, rotation } = object;
  const s = 9 / zoom;
  const pts = objectPoints(object);
  const spots: Array<[string, number, number]> = [
    ['nw', 0, 0],
    ['n', w / 2, 0],
    ['ne', w, 0],
    ['e', w, h / 2],
    ['se', w, h],
    ['s', w / 2, h],
    ['sw', 0, h],
    ['w', 0, h / 2],
  ];
  const grab = (g: HandleGrab) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onGrab(g, e);
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation}, ${w / 2}, ${h / 2})`} data-export-hide="true" onClick={stop}>
      <rect width={w} height={h} fill="none" stroke="#0369a1" strokeWidth={1.2 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} pointerEvents="none" />

      {/* rotate */}
      <line x1={w / 2} y1={0} x2={w / 2} y2={-26 / zoom} stroke="#0369a1" strokeWidth={1 / zoom} pointerEvents="none" />
      <circle
        cx={w / 2}
        cy={-26 / zoom}
        r={s * 0.65}
        fill="#0369a1"
        stroke="#fff"
        strokeWidth={1 / zoom}
        style={{ cursor: 'grab' }}
        onMouseDown={grab({ kind: 'rotate' })}
      >
        <title>Drag to rotate (hold Shift for 15° steps)</title>
      </circle>

      {/* resize */}
      {spots.map(([name, hx, hy]) => (
        <rect
          key={name}
          x={hx - s / 2}
          y={hy - s / 2}
          width={s}
          height={s}
          fill="#fff"
          stroke="#0369a1"
          strokeWidth={1.5 / zoom}
          style={{ cursor: CURSORS[name] }}
          onMouseDown={grab({ kind: 'resize', handle: name })}
        />
      ))}

      {/* polygon corners: drag to reshape, drag a midpoint dot to add a corner, Alt+click a corner to remove it */}
      {pts &&
        pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length];
          return (
            <circle
              key={`m${i}`}
              cx={(p.x + q.x) / 2}
              cy={(p.y + q.y) / 2}
              r={s * 0.4}
              fill="#0369a1"
              fillOpacity={0.55}
              stroke="#fff"
              strokeWidth={0.8 / zoom}
              style={{ cursor: 'copy' }}
              onMouseDown={grab({ kind: 'addVertex', after: i })}
            >
              <title>Drag to add a corner</title>
            </circle>
          );
        })}
      {pts &&
        pts.map((p, i) => (
          <circle
            key={`v${i}`}
            cx={p.x}
            cy={p.y}
            r={s * 0.6}
            fill="#b45309"
            stroke="#fff"
            strokeWidth={1 / zoom}
            style={{ cursor: 'move' }}
            onMouseDown={grab({ kind: 'vertex', index: i })}
          >
            <title>Drag to move this corner. Alt+click removes it.</title>
          </circle>
        ))}
    </g>
  );
};
