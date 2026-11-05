'use client';

import { localDateString } from '@/lib/dates';
import React from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import {
  Users,
  UserMinus,
  Ban,
  CheckCircle,
  MapPin,
  Download,
  X,
  Layers,
} from 'lucide-react';
import { generateEnterpriseExcelWorkbook } from '@/lib/export/excel';

export const BulkActionBar: React.FC = () => {
  const {
    selectedSeatIds,
    seats,
    programs,
    floor,
    building,
    zones,
    activeRole,
    clearSelection,
    setBulkAssignOpen,
    setBulkBlockOpen,
    setBulkUnallocateOpen,
    bulkUnblockSeats,
    bulkChangeZone,
  } = useFloorPlanStore();

  if (selectedSeatIds.length === 0) return null;

  // Selected seats details
  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s.id));

  // Compute breakdown by program
  const breakdown: Record<string, { count: number; color: string }> = {};
  let blockedCount = 0;

  selectedSeatsList.forEach((seat) => {
    if (seat.isBlocked) blockedCount++;
    const pName = seat.programName || 'Unallocated';
    const pColor = seat.programColor || '#64748b';
    if (!breakdown[pName]) {
      breakdown[pName] = { count: 0, color: pColor };
    }
    breakdown[pName].count++;
  });

  const canEditAllocations =
    activeRole === 'Administrator' ||
    activeRole === 'Capacity Planner' ||
    activeRole === 'Program Manager';

  const canManageFacilities =
    activeRole === 'Administrator' || activeRole === 'Facility Manager';

  const handleExportSelected = async () => {
    if (!floor || !building) return;
    const blob = await generateEnterpriseExcelWorkbook({
      buildingName: building.name,
      floor,
      seats: selectedSeatsList,
      programs,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Selected_Seats_${selectedSeatIds.length}_${localDateString()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-3 px-5 backdrop-blur-xl z-40 flex items-center gap-4 text-white animate-in fade-in slide-in-from-bottom-4 duration-200 select-none">
      {/* Selection Counter & Breakdown */}
      <div className="flex items-center gap-3 border-r border-slate-700 pr-4">
        <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/30">
          {selectedSeatIds.length}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">
            {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'} Selected
          </div>
          {/* Program badges */}
          <div className="flex items-center gap-1.5 mt-0.5 max-w-md overflow-x-auto">
            {Object.entries(breakdown).map(([name, data]) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-slate-700"
                style={{ backgroundColor: `${data.color}20`, color: data.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.color }} />
                {name}: {data.count}
              </span>
            ))}
            {blockedCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                Blocked: {blockedCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {canEditAllocations && (
          <>
            <button
              onClick={() => setBulkAssignOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Assign Program
            </button>

            <button
              onClick={() => setBulkUnallocateOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5 text-amber-400" />
              Remove Allocation
            </button>
          </>
        )}

        {canManageFacilities && (
          <>
            <button
              onClick={() => setBulkBlockOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5 text-red-400" />
              Block
            </button>

            {blockedCount > 0 && (
              <button
                onClick={() => bulkUnblockSeats()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Unblock
              </button>
            )}
          </>
        )}

        {/* Change Zone Dropdown */}
        {canManageFacilities && zones.length > 0 && (
          <div className="relative group">
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Zone
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus-within:block before:content-[''] before:absolute before:-bottom-2 before:left-0 before:h-2 before:w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 min-w-[140px] z-50">
              <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold uppercase">Move to Zone:</div>
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => bulkChangeZone(z.id)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded text-xs text-slate-200 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                  {z.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Export Selection */}
        <button
          onClick={handleExportSelected}
          title="Export selection to Excel"
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          Export
        </button>

        {/* Clear Selection */}
        <button
          onClick={clearSelection}
          title="Clear Selection (Esc)"
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
