'use client';

import React from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { ObjectInspector, MultiObjectInspector } from './ObjectInspector';
import { NumberField } from './NumberField';
import { isDraftId } from '@/lib/floorGeometry';
import { SeatType } from '@/types/floorplan';
import {
  Info,
  Users,
  UserMinus,
  Ban,
  CheckCircle,
  Building,
  Layers,
  MapPin,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  Calendar,
} from 'lucide-react';

const SEAT_TYPES: Array<{ id: SeatType; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'hot_desk', label: 'Hot desk' },
  { id: 'team_lead', label: 'Team lead' },
  { id: 'ops_manager', label: 'Ops manager' },
  { id: 'accessible', label: 'Accessible' },
];

export const PropertiesPanel: React.FC = () => {
  const {
    floor,
    building,
    seats,
    objects,
    programs,
    selectedSeatIds,
    selectedObjectIds,
    activeRole,
    setBulkAssignOpen,
    setBulkBlockOpen,
    setBulkUnallocateOpen,
    bulkUnblockSeats,
    deleteSelection,
    setSelectedSeatType,
    setFloorSize,
  } = useFloorPlanStore();

  const canEditAllocations =
    activeRole === 'Administrator' ||
    activeRole === 'Capacity Planner' ||
    activeRole === 'Program Manager';

  const canManageFacilities =
    activeRole === 'Administrator' || activeRole === 'Facility Manager';

  // 1. Single Seat Selected
  if (selectedSeatIds.length === 1) {
    const seat = seats.find((s) => s.id === selectedSeatIds[0]);
    if (seat) {
      return (
        <aside className="w-80 h-full min-h-0 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col z-20 select-none text-xs text-slate-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-md">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-50">{seat.seatId}</h3>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  {seat.bayCode || 'Individual Workstation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Business Allocation Details */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Business Allocation (Layer B)
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Program:</span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-[11px]"
                  style={{
                    backgroundColor: seat.programColor ? `${seat.programColor}40` : '#e2e8f0',
                    color: '#0f172a',
                    border: `1px solid ${seat.programColor || '#64748b'}`,
                  }}
                >
                  {seat.programName || 'Unallocated'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Allocation Status:</span>
                <span
                  className={`font-semibold ${
                    seat.allocationStatus === 'ALLOCATED'
                      ? 'text-emerald-400'
                      : seat.isBlocked
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {seat.isBlocked ? 'Blocked' : seat.allocationStatus}
                </span>
              </div>

              {seat.shift && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Working Shift:</span>
                  <span className="font-mono text-slate-300">{seat.shift}</span>
                </div>
              )}

              {seat.employeeName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Associate:</span>
                  <span className="font-medium text-slate-200">{seat.employeeName}</span>
                </div>
              )}

              {seat.effectiveDate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Effective Since:</span>
                  <span className="font-mono text-slate-300">
                    {seat.effectiveDate.split('T')[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Blocking Status */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Block / Usability Status
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Currently Blocked?</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    seat.isBlocked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {seat.isBlocked ? 'YES (UNUSABLE)' : 'NO (USABLE)'}
                </span>
              </div>

              {seat.isBlocked && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Block Reason:</span>
                    <span className="font-semibold text-red-300">{seat.blockReason}</span>
                  </div>
                  {seat.blockNotes && (
                    <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                      {seat.blockNotes}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Spatial Geometry Details (Layer A) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wider">
                Physical Geometry (Layer A)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="text-slate-300">
                  X: {Math.round(seat.x)}, Y: {Math.round(seat.y)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seat Type:</span>
                <span className="text-slate-300 capitalize">{seat.seatType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rotation:</span>
                <span className="text-slate-300">{seat.rotation}°</span>
              </div>
            </div>

            {/* Layout: seat type and removal */}
            {canManageFacilities && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seat layout</div>
                {isDraftId(seat.id) && (
                  <div className="text-[11px] text-amber-300">New seat: press Save to store it. It can be allocated after saving.</div>
                )}
                <label className="block">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Seat type</span>
                  <select
                    value={seat.seatType}
                    onChange={(e) => setSelectedSeatType(e.target.value as SeatType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-50"
                  >
                    {SEAT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={deleteSelection}
                  className="w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete seat
                </button>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-2">
              {canEditAllocations && (
                <>
                  <button
                    onClick={() => setBulkAssignOpen(true)}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {seat.programId ? 'Re-assign Program' : 'Assign Program'}
                  </button>

                  {seat.programId && (
                    <button
                      onClick={() => setBulkUnallocateOpen(true)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remove Allocation
                    </button>
                  )}
                </>
              )}

              {canManageFacilities && (
                <>
                  {seat.isBlocked ? (
                    <button
                      onClick={() => bulkUnblockSeats()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Unblock Seat
                    </button>
                  ) : (
                    <button
                      onClick={() => setBulkBlockOpen(true)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-red-400 font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Block Seat (Maintenance)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      );
    }
  }

  // 2. Multiple Seats Selected
  if (selectedSeatIds.length > 1) {
    const selectedList = seats.filter((s) => selectedSeatIds.includes(s.id));
    const breakdown: Record<string, number> = {};
    let blockedCount = 0;
    selectedList.forEach((s) => {
      if (s.isBlocked) blockedCount++;
      const pName = s.programName || 'Unallocated';
      breakdown[pName] = (breakdown[pName] || 0) + 1;
    });

    return (
      <aside className="w-80 h-full min-h-0 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col z-20 select-none text-xs text-slate-200">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-sm text-slate-50">Bulk Seat Selection</h3>
          <p className="text-[11px] text-slate-400">
            {selectedSeatIds.length} Workstations Selected
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Allocation Distribution
            </div>
            <div className="space-y-1.5">
              {Object.entries(breakdown).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-300 font-medium">{name}</span>
                  <span className="font-mono font-bold text-slate-50 bg-slate-800 px-2 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
            {blockedCount > 0 && (
              <div className="pt-1 text-red-400 font-semibold flex justify-between">
                <span>Blocked for maintenance:</span>
                <span className="font-mono">{blockedCount}</span>
              </div>
            )}
          </div>

          {canManageFacilities && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seat layout</div>
              <select
                defaultValue=""
                onChange={(e) => e.target.value && setSelectedSeatType(e.target.value as SeatType)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-50"
              >
                <option value="">Set seat type for all selected...</option>
                {SEAT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                onClick={deleteSelection}
                className="w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedSeatIds.length} seats
              </button>
            </div>
          )}

          <div className="space-y-2">
            {canEditAllocations && (
              <>
                <button
                  onClick={() => setBulkAssignOpen(true)}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  Assign Program to All ({selectedSeatIds.length})
                </button>
                <button
                  onClick={() => setBulkUnallocateOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Remove Allocations
                </button>
              </>
            )}

            {canManageFacilities && (
              <button
                onClick={() => setBulkBlockOpen(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-red-400 font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Block Selected Seats
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // 3. Floor object(s) selected
  if (selectedObjectIds.length === 1) {
    const obj = objects.find((o) => o.id === selectedObjectIds[0]);
    if (obj) return <ObjectInspector object={obj} />;
  }
  if (selectedObjectIds.length > 1) {
    return <MultiObjectInspector count={selectedObjectIds.length} />;
  }

  // 4. Default / Floor Summary
  const totalSeats = seats.length;
  const allocatedSeats = seats.filter((s) => s.programId && !s.isBlocked).length;
  const blockedSeats = seats.filter((s) => s.isBlocked).length;
  const vacantSeats = seats.filter((s) => !s.programId && !s.isBlocked).length;

  return (
    <aside className="w-80 h-full min-h-0 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col z-20 select-none text-xs text-slate-200">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-bold text-sm text-slate-50">Floor Metrics & Status</h3>
        <p className="text-[11px] text-slate-400">
          {building?.name} • {floor?.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Capacity Cards */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-800/60 border border-slate-700 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-400">Total Workstations</div>
            <div className="text-lg font-bold font-mono text-slate-50 mt-0.5">{totalSeats}</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-400">Floor Utilization</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {floor?.utilization || 0}%
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Operational Inventory
          </div>
          <div className="space-y-1.5 font-medium">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Allocated Seats:
              </span>
              <span className="font-mono font-bold text-slate-50">{allocatedSeats}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Vacant / Available:
              </span>
              <span className="font-mono font-bold text-slate-50">{vacantSeats}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Blocked (Maintenance):
              </span>
              <span className="font-mono font-bold text-red-400">{blockedSeats}</span>
            </div>
          </div>
        </div>

        {/* Floor size */}
        {floor && canManageFacilities && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Floor size (feet)</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Width</label>
                <NumberField value={Math.round(floor.width / 10)} min={20} max={2000} onCommit={(n) => setFloorSize(n * 10, floor.height)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Depth</label>
                <NumberField value={Math.round(floor.height / 10)} min={20} max={2000} onCommit={(n) => setFloorSize(floor.width, n * 10)} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">The drawing area. Set it to your real floor plate, then press Save.</p>
          </div>
        )}

        {/* Programs Quick List */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Active Programs
          </div>
          <div className="space-y-1.5">
            {programs.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-semibold text-slate-50">{p.name}</span>
                </div>
                <div className="font-mono text-slate-300">
                  <span className="text-slate-50 font-bold">{p.allocatedCount}</span>
                  <span className="text-slate-500"> / {p.requiredCapacity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-[11px] text-sky-300">
          💡 Click any seat or drag a box across several seats to allocate them. To design the floor, use the tools at the top-left of the canvas: draw rooms of any shape, walls and workstations with seats.
        </div>
      </div>
    </aside>
  );
};
