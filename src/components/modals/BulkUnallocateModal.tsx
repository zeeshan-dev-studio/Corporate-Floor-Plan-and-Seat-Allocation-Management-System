'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { UserMinus, AlertCircle, X } from 'lucide-react';

export const BulkUnallocateModal: React.FC = () => {
  const {
    isBulkUnallocateOpen,
    setBulkUnallocateOpen,
    selectedSeatIds,
    bulkRemoveAllocation,
  } = useFloorPlanStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isBulkUnallocateOpen || selectedSeatIds.length === 0) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await bulkRemoveAllocation();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Remove Seat Allocation</h3>
              <p className="text-xs text-slate-400">
                Clear business allocations for {selectedSeatIds.length} seats
              </p>
            </div>
          </div>
          <button
            onClick={() => setBulkUnallocateOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Physical Seats Will NOT Be Deleted</p>
              <p className="mt-1 text-slate-300">
                This operation removes program affiliations and employee assignments. The physical seats, workstation bays, and CAD coordinates remain unchanged on the floor plan.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Are you sure you want to mark these {selectedSeatIds.length} seats as <strong>Unallocated (Vacant)</strong>? An entry will be recorded in the audit trail.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBulkUnallocateOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-600/20 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Removing...' : `Confirm De-allocation`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
