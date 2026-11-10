'use client';

import React, { useState, useEffect } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { History, Search, Filter, X, Shield, Calendar, User } from 'lucide-react';
import { AuditLogDTO } from '@/types/floorplan';

export const AuditHistoryModal: React.FC = () => {
  const { isAuditModalOpen, setAuditModalOpen } = useFloorPlanStore();
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    if (isAuditModalOpen) {
      fetchLogs();
    }
  }, [isAuditModalOpen, actionFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = actionFilter ? `?action=${actionFilter}` : '';
      const res = await fetch(`/api/audit-logs${query}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuditModalOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.reason && log.reason.toLowerCase().includes(term)) ||
      (log.seatId && log.seatId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-50">System Audit Trail & Compliance</h3>
              <p className="text-xs text-slate-400">
                Immutable chronological log of all floor plan, allocation, and blocking operations
              </p>
            </div>
          </div>
          <button
            onClick={() => setAuditModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-50 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by User, Action, Reason, or Seat ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-50 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Action Types</option>
            <option value="BULK_ASSIGN_PROGRAM">Bulk Assign Program</option>
            <option value="BULK_REMOVE_ALLOCATION">Bulk Remove Allocation</option>
            <option value="BULK_BLOCK_SEATS">Bulk Block Seats</option>
            <option value="BULK_UNBLOCK_SEATS">Bulk Unblock Seats</option>
            <option value="EXCEL_IMPORT">Excel Import</option>
            <option value="CREATE_FLOOR_VERSION">Snapshot Created</option>
            <option value="RESTORE_FLOOR_VERSION">Snapshot Restored</option>
            <option value="BATCH_SAVE_FLOOR_OBJECTS">Layout Saved</option>
          </select>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No audit log records found.</div>
          ) : (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">User & Role</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Details</th>
                    <th className="p-2.5">Reason</th>
                    <th className="p-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">
                        {log.timestamp.replace('T', ' ').split('.')[0]}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-200">{log.user}</div>
                        <div className="text-[10px] text-indigo-400">{log.userRole}</div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-semibold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 max-w-xs truncate text-slate-300">
                        {log.newValue ? JSON.stringify(log.newValue) : '-'}
                      </td>
                      <td className="p-2.5 text-slate-300 font-sans">{log.reason || '-'}</td>
                      <td className="p-2.5 text-slate-500">{log.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 bg-slate-950/40">
          <span>Showing {filteredLogs.length} audit entries</span>
          <button
            onClick={() => setAuditModalOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
