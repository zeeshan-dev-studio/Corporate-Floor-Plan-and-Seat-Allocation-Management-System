'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { Bookmark, RotateCcw, Plus, X, Calendar, User, Clock } from 'lucide-react';

export const VersionSnapshotModal: React.FC = () => {
  const {
    isVersionModalOpen,
    setVersionModalOpen,
    floor,
    versions,
    activeRole,
    loadFloorData,
  } = useFloorPlanStore();

  const [versionName, setVersionName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  if (!isVersionModalOpen || !floor) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          floorId: floor.id,
          versionName: versionName.trim(),
          description: description.trim() || undefined,
          user: 'Facility Planner',
        }),
      });

      const data = await res.json();
      setIsSaving(false);
      if (data.success) {
        setVersionName('');
        setDescription('');
        await loadFloorData(floor.id);
      } else {
        alert(data.error || 'Failed to save version snapshot.');
      }
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const handleRestore = async (versionId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to restore the floor plan to "${name}"? This will overwrite the current active layout and allocations. The current state is saved as an automatic backup first.`
      )
    ) {
      return;
    }

    try {
      setIsRestoring(versionId);
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESTORE',
          versionId,
          user: 'Administrator',
        }),
      });

      const data = await res.json();
      setIsRestoring(null);
      if (data.success) {
        alert(data.message);
        await loadFloorData(floor.id);
        setVersionModalOpen(false);
      } else {
        alert(data.error || 'Failed to restore version.');
      }
    } catch (err) {
      console.error(err);
      setIsRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-50">Floor Plan Snapshots & Versioning</h3>
              <p className="text-xs text-slate-400">
                Point-in-time immutable floor baselines, allocations, and restoration
              </p>
            </div>
          </div>
          <button
            onClick={() => setVersionModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-50 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Create New Snapshot Form */}
          <form
            onSubmit={handleCreateSnapshot}
            className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="font-bold text-sm text-slate-50 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              Capture New Floor Snapshot
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Version Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. v2.1 - Q4 Expansion Baseline"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-50 focus:outline-none focus:border-sky-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Prepared for Squirrel SOC migration"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-50 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {isSaving ? 'Capturing Snapshot...' : 'Save Current State as Version'}
              </button>
            </div>
          </form>

          {/* List of Existing Versions */}
          <div>
            <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-2.5">
              Available Snapshots ({versions.length})
            </h4>
            {versions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                No previous snapshots recorded.
              </div>
            ) : (
              <div className="space-y-2.5">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-50 flex items-center gap-2">
                        <span>{ver.versionName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {ver.createdBy}
                        </span>
                      </div>
                      {ver.description && (
                        <div className="text-slate-400 mt-1">{ver.description}</div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                        <Clock className="w-3 h-3" />
                        {ver.createdAt.replace('T', ' ').split('.')[0]}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestore(ver.id, ver.versionName)}
                      disabled={isRestoring === ver.id}
                      className="px-3.5 py-1.5 bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isRestoring === ver.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={() => setVersionModalOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
