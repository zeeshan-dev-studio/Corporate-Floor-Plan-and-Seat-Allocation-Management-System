'use client';

import { localDateString } from '@/lib/dates';
import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { Ban, Calendar, X, FileText } from 'lucide-react';

export const BulkBlockModal: React.FC = () => {
  const {
    isBulkBlockOpen,
    setBulkBlockOpen,
    selectedSeatIds,
    bulkBlockSeats,
  } = useFloorPlanStore();

  const [reason, setReason] = useState<string>('Maintenance');
  const [startDate, setStartDate] = useState<string>(
    localDateString()
  );
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isBulkBlockOpen || selectedSeatIds.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endDate && endDate < startDate) {
      alert('The end date cannot be before the start date.');
      return;
    }
    setIsSubmitting(true);
    await bulkBlockSeats(reason, startDate, endDate || undefined, notes);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-50">Bulk Block Seats</h3>
              <p className="text-xs text-slate-400">
                Mark {selectedSeatIds.length} seats as blocked/unavailable
              </p>
            </div>
          </div>
          <button
            onClick={() => setBulkBlockOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-50 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Blocking Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-50 focus:outline-none focus:border-red-500 font-medium"
              required
            >
              <option value="Maintenance">Maintenance (Ergonomic / Electrical)</option>
              <option value="IT issue">IT Issue (Network / Cabling / Port Fault)</option>
              <option value="Cleaning">Sanitization / Deep Cleaning</option>
              <option value="Reserved">Reserved (Incoming VIP / QA / Expansion)</option>
              <option value="Temporary closure">Temporary Area Closure</option>
              <option value="Construction">Construction / HVAC Inspection</option>
              <option value="Other">Other Operational Reason</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-red-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Estimated End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Work Order / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ticket #FAC-8921: Power strip replacement"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-50 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs">
            Blocked seats remain physically visible on the floor plan with caution markers, but are excluded from net usable capacity calculations.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBulkBlockOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Blocking...' : `Apply Block (${selectedSeatIds.length} Seats)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
