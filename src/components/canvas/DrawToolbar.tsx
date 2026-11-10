'use client';

import React from 'react';
import { MousePointer2, Hand, Minus, PanelTop, Square, Pentagon, LayoutGrid, CircleDot } from 'lucide-react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { ToolMode } from '@/types/floorplan';

const TOOLS: Array<{ id: ToolMode; label: string; key: string; icon: React.ReactNode; edit: boolean; hint: string }> = [
  { id: 'select', label: 'Select', key: 'V', icon: <MousePointer2 className="w-4 h-4" />, edit: false, hint: 'Click to select. Drag a selected object to move it, use its handles to resize and rotate. Drag on empty floor to box-select seats.' },
  { id: 'pan', label: 'Pan', key: 'H', icon: <Hand className="w-4 h-4" />, edit: false, hint: 'Drag to move the view. You can also hold Space or use the middle mouse button.' },
  { id: 'wall', label: 'Wall', key: 'W', icon: <Minus className="w-4 h-4" />, edit: true, hint: 'Drag from one end of the wall to the other. Walls can run at any angle.' },
  { id: 'glass', label: 'Glass partition', key: 'G', icon: <PanelTop className="w-4 h-4" />, edit: true, hint: 'Drag from one end of the glass partition to the other.' },
  { id: 'room', label: 'Room (rectangle)', key: 'R', icon: <Square className="w-4 h-4" />, edit: true, hint: 'Drag a box to draw a rectangular room. Change it to an L, T or U shape later in the properties panel.' },
  { id: 'polyroom', label: 'Room (any shape)', key: 'P', icon: <Pentagon className="w-4 h-4" />, edit: true, hint: 'Click each corner of the room. Double-click, press Enter or click the first point to finish. Backspace removes the last corner.' },
  { id: 'workstation', label: 'Workstation', key: 'B', icon: <LayoutGrid className="w-4 h-4" />, edit: true, hint: 'Drag an area: it fills with benches of up to 8 seats a side, two rows facing each other, with aisles between. A small box gives one bench. Adjust rows, columns and shape afterwards.' },
  { id: 'seat', label: 'Single seat', key: 'S', icon: <CircleDot className="w-4 h-4" />, edit: true, hint: 'Click to drop a single loose seat. Click as many times as you like, press Esc to stop.' },
];

export const DrawToolbar: React.FC<{ polyPoints: number; onFinishPolygon: () => void }> = ({ polyPoints, onFinishPolygon }) => {
  const { activeTool, setActiveTool, activeRole, snapToGrid } = useFloorPlanStore();
  const canEdit = activeRole === 'Administrator' || activeRole === 'Facility Manager';
  const tools = TOOLS.filter((t) => !t.edit || canEdit);
  const active = TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="absolute top-10 left-10 z-20 flex flex-col gap-1.5 select-none pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-0.5 bg-slate-900/95 border border-slate-700 rounded-xl p-1 shadow-xl backdrop-blur"
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {tools.map((t, i) => (
          <React.Fragment key={t.id}>
            {i > 0 && t.edit && !tools[i - 1].edit && <div className="w-px h-5 bg-slate-700 mx-1" />}
            <button
              onClick={() => setActiveTool(t.id)}
              title={`${t.label} (${t.key})`}
              aria-label={t.label}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === t.id ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.icon}
            </button>
          </React.Fragment>
        ))}
      </div>
      {active && active.id !== 'select' && (
        <div className="max-w-xs bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-300 shadow-xl backdrop-blur">
          <div className="font-semibold text-sky-300 mb-0.5">{active.label}</div>
          <div>{active.hint}</div>
          {snapToGrid && active.edit && <div className="mt-1 text-slate-500">Snapping to the 2 ft grid (toggle it in the top bar).</div>}
          {active.id === 'polyroom' && polyPoints >= 3 && (
            <button onClick={onFinishPolygon} onMouseDown={(e) => e.stopPropagation()} className="pointer-events-auto mt-2 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              Finish room ({polyPoints} corners)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
