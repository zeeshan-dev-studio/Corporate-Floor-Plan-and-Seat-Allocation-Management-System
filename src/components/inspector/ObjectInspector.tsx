'use client';

import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  EyeOff,
  Eye,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
} from 'lucide-react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { FloorObjectDTO } from '@/types/floorplan';
import { NumberField, TextField } from './NumberField';
import { SHAPE_CHOICES, ShapeId, geometryForShape, objectAreaSqFt, resizedObject, shapeOf, PX_PER_FT } from '@/lib/floorGeometry';

const ROOM_TYPES = [
  'Room',
  'Cabin',
  'Meeting room',
  'Board room',
  'Training room',
  'Auditorium',
  'Cafeteria',
  'Reception',
  'Server room',
  'Washroom',
  'Phone booth',
  'Storage',
  'Utility/Core',
];

const selectCls = 'w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-50 disabled:opacity-70';
const card = 'bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5';
const cardTitle = 'text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wider';
const lbl = 'text-[10px] text-slate-500 block mb-0.5';

const toFt = (units: number) => Math.round((units / PX_PER_FT) * 100) / 100;
const hexToRgba = (hex: string, a: number) => {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.replace(/(.)/g, '$1$1') : m, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
const hexOr = (c: string | undefined, fallback: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);

export const ObjectInspector: React.FC<{ object: FloorObjectDTO }> = ({ object: obj }) => {
  const { seats, activeRole, updateObject, regenerateBaySeats, deleteSelection, duplicateSelection } = useFloorPlanStore();
  const [seatNote, setSeatNote] = useState('');

  const canManage = activeRole === 'Administrator' || activeRole === 'Facility Manager';
  const edit = canManage && !obj.locked;
  const patch = (p: Partial<FloorObjectDTO>) => updateObject({ ...obj, ...p });
  const patchProps = (p: Partial<FloorObjectDTO['properties']>) => patch({ properties: { ...obj.properties, ...p } });

  const ownSeats = obj.type === 'bay' ? seats.filter((s) => s.floorObjectId === obj.id) : [];
  const shape = shapeOf(obj);
  const spec = {
    seats: ownSeats.length,
    rows: Math.max(1, obj.properties?.seatRows ?? 1),
    arrangement: obj.properties?.arrangement || 'grid',
    facing: obj.properties?.seatFacing || 'inward',
  };

  const relayout = (p: Partial<FloorObjectDTO['properties']>, geometry?: FloorObjectDTO['geometry']) => {
    const placed = regenerateBaySeats(obj.id, p, geometry);
    const wanted = p.capacity ?? obj.properties?.capacity ?? ownSeats.length;
    setSeatNote(placed < wanted ? `This shape fits only ${placed} of ${wanted} seats at this size. Make it bigger or change the shape.` : '');
  };
  const setSeatCount = (n: number) => {
    const count = Math.max(0, Math.round(n));
    relayout({ capacity: count, seatRows: spec.rows, seatCols: Math.max(1, Math.ceil(count / spec.rows)) });
  };
  const setRows = (n: number) => {
    const rows = Math.max(1, Math.round(n));
    relayout({ seatRows: rows, capacity: spec.seats, seatCols: Math.max(1, Math.ceil(spec.seats / rows)) });
  };
  const setShape = (id: ShapeId) => {
    const geometry = geometryForShape(obj, id);
    if (obj.type === 'bay') relayout({}, geometry);
    else patch({ geometry });
  };

  const hasShape = obj.type === 'room' || obj.type === 'bay' || obj.type === 'furniture';
  const allocated = ownSeats.filter((s) => s.programId && !s.isBlocked).length;
  const blocked = ownSeats.filter((s) => s.isBlocked).length;

  return (
    <aside className="w-80 h-full min-h-0 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col z-20 select-none text-xs text-slate-200">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-slate-50 truncate">{obj.properties?.label || obj.type.toUpperCase()}</h3>
          <span className="text-[10px] text-slate-400 uppercase font-mono">
            {obj.type} • Layer: {obj.layer}
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={duplicateSelection} title="Duplicate (Ctrl+D)" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={deleteSelection} title="Delete (Del)" className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div className={card}>
          <div className={cardTitle}>{obj.type === 'bay' ? 'Workstation code' : 'Name'}</div>
          <TextField value={obj.properties?.label || ''} disabled={!edit} onCommit={(t) => patchProps({ label: t })} />
        </div>

        {/* Position and size */}
        <div className={`${card} font-mono text-[11px]`}>
          <div className={cardTitle}>Position & size (feet)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>X</label>
              <NumberField value={toFt(obj.x)} step={0.5} disabled={!edit} onCommit={(n) => patch({ x: n * PX_PER_FT })} />
            </div>
            <div>
              <label className={lbl}>Y</label>
              <NumberField value={toFt(obj.y)} step={0.5} disabled={!edit} onCommit={(n) => patch({ y: n * PX_PER_FT })} />
            </div>
            <div>
              <label className={lbl}>Width</label>
              <NumberField
                value={toFt(obj.width)}
                min={1}
                step={0.5}
                disabled={!edit}
                onCommit={(n) => updateObject(resizedObject(obj, n * PX_PER_FT, obj.height))}
              />
            </div>
            <div>
              <label className={lbl}>Height</label>
              <NumberField
                value={toFt(obj.height)}
                min={0.5}
                step={0.5}
                disabled={!edit}
                onCommit={(n) => updateObject(resizedObject(obj, obj.width, n * PX_PER_FT))}
              />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Rotation (degrees)</label>
              <NumberField value={Math.round(obj.rotation || 0)} min={0} max={360} step={5} disabled={!edit} onCommit={(n) => patch({ rotation: n % 360 })} />
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2 pt-1 font-sans">
              <button
                onClick={() => patch({ locked: !obj.locked })}
                className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 ${
                  obj.locked ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title="A locked object cannot be moved, resized or deleted"
              >
                {obj.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {obj.locked ? 'Locked' : 'Lock'}
              </button>
              <button
                onClick={() => patch({ hidden: !obj.hidden })}
                className="flex-1 py-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-1.5"
              >
                {obj.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {obj.hidden ? 'Hidden' : 'Hide'}
              </button>
            </div>
          )}
        </div>

        {/* Shape */}
        {hasShape && (
          <div className={card}>
            <div className={cardTitle}>Shape</div>
            <select value={shape} disabled={!edit} onChange={(e) => setShape(e.target.value as ShapeId)} className={selectCls}>
              {SHAPE_CHOICES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              {shape === 'polygon' && <option value="polygon">Custom shape</option>}
            </select>
            <p className="text-[10px] text-slate-500">
              {shape === 'polygon'
                ? 'Drag the yellow corners to reshape. Drag a blue dot on an edge to add a corner. Alt+click a corner to remove it.'
                : 'Pick a shape, then drag its handles to size it. Choosing an L, T or U shape lets you reshape the corners afterwards.'}
            </p>
          </div>
        )}

        {/* Room */}
        {obj.type === 'room' && (
          <div className={card}>
            <div className={cardTitle}>Room</div>
            <div>
              <label className={lbl}>Room type</label>
              <select
                value={obj.properties?.roomType || 'Room'}
                disabled={!edit}
                onChange={(e) => patchProps({ roomType: e.target.value })}
                className={selectCls}
              >
                {(ROOM_TYPES.includes(obj.properties?.roomType || 'Room') ? ROOM_TYPES : [...ROOM_TYPES, obj.properties?.roomType as string]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Capacity (people)</label>
                <NumberField value={obj.properties?.capacity || 0} min={0} disabled={!edit} onCommit={(n) => patchProps({ capacity: Math.round(n) })} />
              </div>
              <div>
                <label className={lbl}>Colour</label>
                <input
                  type="color"
                  value={hexOr(obj.properties?.stroke, '#475569')}
                  disabled={!edit}
                  onChange={(e) => patchProps({ stroke: e.target.value, fill: hexToRgba(e.target.value, 0.12) })}
                  className="w-full h-[26px] bg-slate-800 border border-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Floor area (from the drawing):</span>
              <span className="font-bold text-sky-400 font-mono">{objectAreaSqFt(obj).toLocaleString()} sq ft</span>
            </div>
          </div>
        )}

        {/* Workstation seats */}
        {obj.type === 'bay' && (
          <div className={card}>
            <div className={cardTitle}>Seats in this workstation</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Number of seats</label>
                <NumberField value={spec.seats} min={0} max={60} disabled={!edit} onCommit={setSeatCount} />
              </div>
              <div>
                <label className={lbl}>Rows</label>
                <NumberField value={spec.rows} min={1} max={12} disabled={!edit || spec.arrangement === 'around'} onCommit={setRows} />
              </div>
              <div>
                <label className={lbl}>Arrangement</label>
                <select value={spec.arrangement} disabled={!edit} onChange={(e) => relayout({ arrangement: e.target.value as 'grid' | 'around', capacity: spec.seats })} className={selectCls}>
                  <option value="grid">In rows</option>
                  <option value="around">Around the edge</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Chairs face</label>
                <select
                  value={spec.facing}
                  disabled={!edit || spec.arrangement === 'around' || spec.rows < 2}
                  onChange={(e) => relayout({ seatFacing: e.target.value as 'inward' | 'same', capacity: spec.seats })}
                  className={selectCls}
                >
                  <option value="inward">Each other</option>
                  <option value="same">Same way</option>
                </select>
              </div>
            </div>
            {seatNote && <div className="text-amber-300 text-[11px]">{seatNote}</div>}
            <div className="text-slate-400 text-[11px] pt-1">
              {ownSeats.length} seat{ownSeats.length === 1 ? '' : 's'} • {allocated} allocated
              {blocked ? ` • ${blocked} blocked` : ''}. Changing the layout moves the seats; their allocations are kept.
            </div>
            <div className="text-slate-500 text-[10px]">
              Press Save to store new seats. New seats can be allocated after saving.
            </div>
          </div>
        )}

        {/* Door */}
        {obj.type === 'door' && obj.subType !== 'turnstile' && (
          <div className={card}>
            <div className={cardTitle}>Door</div>
            <label className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={!!obj.properties?.flip} disabled={!edit} onChange={(e) => patchProps({ flip: e.target.checked })} />
              Swing the other way
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};

/** Panel for two or more selected objects. */
export const MultiObjectInspector: React.FC<{ count: number }> = ({ count }) => {
  const { activeRole, alignSelection, duplicateSelection, deleteSelection } = useFloorPlanStore();
  const canManage = activeRole === 'Administrator' || activeRole === 'Facility Manager';
  const align = (
    mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom',
    title: string,
    icon: React.ReactNode
  ) => (
    <button key={mode} onClick={() => alignSelection(mode)} disabled={!canManage} title={title} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40">
      {icon}
    </button>
  );
  return (
    <aside className="w-80 h-full min-h-0 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col z-20 select-none text-xs text-slate-200">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-bold text-sm text-slate-50">{count} objects selected</h3>
        <p className="text-[11px] text-slate-400">Drag any of them to move the whole group. Shift+click adds or removes an object.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={card}>
          <div className={cardTitle}>Align</div>
          <div className="flex gap-1.5">
            {align('left', 'Align left edges', <AlignStartVertical className="w-4 h-4" />)}
            {align('centerX', 'Centre horizontally', <AlignCenterVertical className="w-4 h-4" />)}
            {align('right', 'Align right edges', <AlignEndVertical className="w-4 h-4" />)}
            <div className="w-px bg-slate-700 mx-1" />
            {align('top', 'Align top edges', <AlignStartHorizontal className="w-4 h-4" />)}
            {align('centerY', 'Centre vertically', <AlignCenterHorizontal className="w-4 h-4" />)}
            {align('bottom', 'Align bottom edges', <AlignEndHorizontal className="w-4 h-4" />)}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={duplicateSelection} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button onClick={deleteSelection} className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 flex items-center justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
