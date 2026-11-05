'use client';

import { localDateString } from '@/lib/dates';
import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { AlertTriangle, Users, Calendar, Clock, X } from 'lucide-react';

export const BulkAssignModal: React.FC = () => {
  const {
    isBulkAssignOpen,
    setBulkAssignOpen,
    selectedSeatIds,
    seats,
    programs,
    bulkAssignProgram,
  } = useFloorPlanStore();

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    localDateString()
  );
  const [shift, setShift] = useState<string>('09:00 - 18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isBulkAssignOpen || selectedSeatIds.length === 0) return null;

  // Until the user picks a program, use the first one (the dropdown already shows it).
  // This can't be the initial state: the dialog mounts before programs have loaded.
  const programId = programs.some((p) => p.id === selectedProgramId)
    ? selectedProgramId
    : programs[0]?.id ?? '';

  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s.id));
  const selectedProgram = programs.find((p) => p.id === programId);

  // Breakdown of currently selected seats
  const currentAllocationCounts: Record<string, number> = {};
  selectedSeatsList.forEach((s) => {
    const pName = s.programName || 'Unallocated';
    currentAllocationCounts[pName] = (currentAllocationCounts[pName] || 0) + 1;
  });

  // Calculate overwrite count
  const overwriteCount = selectedSeatsList.filter(
    (s) => s.programId && s.programId !== programId
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return;
    setIsSubmitting(true);
    await bulkAssignProgram(programId, effectiveDate, shift);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Bulk Assign Program</h3>
              <p className="text-xs text-slate-400">
                Assign {selectedSeatIds.length} selected seats to a business program
              </p>
            </div>
          </div>
          <button
            onClick={() => setBulkAssignOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Program Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Select Business Program
            </label>
            <select
              value={programId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-medium"
              required
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — {p.allocatedCount} allocated / {p.requiredCapacity} required
                </option>
              ))}
            </select>
          </div>

          {/* Effective Date & Shift */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Shift Schedule
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="09:00 - 18:00">General (09:00 - 18:00)</option>
                <option value="08:00 - 17:00">Morning (08:00 - 17:00)</option>
                <option value="13:00 - 22:00">Afternoon (13:00 - 22:00)</option>
                <option value="22:00 - 07:00">Night Shift (22:00 - 07:00)</option>
                <option value="24/7 Rotational SOC">24/7 Rotational SOC</option>
              </select>
            </div>
          </div>

          {/* Current Selection Breakdown */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs">
            <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Current Allocation Breakdown</span>
              <span className="font-mono text-slate-400">{selectedSeatIds.length} Total</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(currentAllocationCounts).map(([name, count]) => (
                <div
                  key={name}
                  className="bg-slate-800/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300 border border-slate-700/60"
                >
                  {name}: <span className="font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overwrite Warning */}
          {overwriteCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Allocation Conflict Warning:</span>{' '}
                {overwriteCount} of the selected seats are currently allocated to other programs and will be re-assigned to{' '}
                <span className="font-bold">{selectedProgram?.name}</span>.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBulkAssignOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !programId}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Allocating...' : `Confirm Allocation (${selectedSeatIds.length} Seats)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
