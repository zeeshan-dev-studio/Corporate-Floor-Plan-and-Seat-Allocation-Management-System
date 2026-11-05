'use client';

import React from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  PieChart,
} from 'lucide-react';

export const CapacityDashboard: React.FC = () => {
  const {
    isAnalyticsDrawerOpen,
    setAnalyticsDrawerOpen,
    floor,
    building,
    programs,
    seats,
    zones,
    asOfDate,
    setAsOfDate,
    setProgramFilter,
  } = useFloorPlanStore();

  if (!isAnalyticsDrawerOpen || !floor) return null;

  const totalSeats = seats.length;
  const allocatedSeats = seats.filter((s) => s.programId && !s.isBlocked).length;
  const blockedSeats = seats.filter((s) => s.isBlocked).length;
  const vacantSeats = seats.filter((s) => !s.programId && !s.isBlocked).length;
  const netUsable = totalSeats - blockedSeats;
  const overallUtilization =
    netUsable > 0 ? Math.round((allocatedSeats / netUsable) * 100) : 0;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900/95 border-l border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Capacity & Utilization Analytics</h3>
            <p className="text-xs text-slate-400">
              {building?.name} • {floor.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAnalyticsDrawerOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Date-Aware Capacity Banner */}
      <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="font-semibold">Capacity As Of Date:</span>
        </div>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Floor High-Level Metrics */}
        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-2.5">
            Floor Overview
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl">
              <div className="text-slate-400 text-[11px]">Total Physical Seats</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {totalSeats}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{floor.totalArea} sq ft</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl">
              <div className="text-slate-400 text-[11px]">Net Usable Capacity</div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {netUsable}
              </div>
              <div className="text-[10px] text-red-400 mt-0.5">
                {blockedSeats} seats blocked
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl">
              <div className="text-slate-400 text-[11px]">Floor Utilization</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {overallUtilization}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {vacantSeats} vacant seats
              </div>
            </div>
          </div>
        </div>

        {/* Overall Utilization Bar */}
        <div className="bg-slate-800/40 border border-slate-700/60 p-3.5 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Space Allocation Breakdown</span>
            <span className="font-mono text-slate-400">{allocatedSeats} / {netUsable} Usable</span>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-sky-500 h-full transition-all"
              style={{ width: `${totalSeats ? (allocatedSeats / totalSeats) * 100 : 0}%` }}
              title={`Allocated: ${allocatedSeats}`}
            />
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${totalSeats ? (blockedSeats / totalSeats) * 100 : 0}%` }}
              title={`Blocked: ${blockedSeats}`}
            />
            <div
              className="bg-slate-600 h-full transition-all"
              style={{ width: `${totalSeats ? (vacantSeats / totalSeats) * 100 : 0}%` }}
              title={`Vacant: ${vacantSeats}`}
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Allocated ({allocatedSeats})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Blocked ({blockedSeats})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              Vacant ({vacantSeats})
            </span>
          </div>
        </div>

        {/* Program-by-Program Capacity Breakdown */}
        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-2.5">
            Program Capacity Planning (Required vs Usable)
          </h4>
          <div className="space-y-3">
            {programs.map((p) => {
              const isShortage = p.shortageSurplus < 0;
              return (
                <div
                  key={p.id}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {p.code}
                      </span>
                    </div>
                    <button
                      onClick={() => setProgramFilter(p.id)}
                      className="text-[11px] text-sky-400 hover:underline font-medium"
                    >
                      Highlight on Floor
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase">Required</div>
                      <div className="font-bold text-white mt-0.5">{p.requiredCapacity}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase">Allocated</div>
                      <div className="font-bold text-white mt-0.5">{p.allocatedCount}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase">Net Usable</div>
                      <div className="font-bold text-sky-400 mt-0.5">{p.netUsable}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase">Delta</div>
                      <div className={`font-bold mt-0.5 ${isShortage ? 'text-red-400' : 'text-emerald-400'}`}>
                        {p.shortageSurplus >= 0 ? `+${p.shortageSurplus}` : p.shortageSurplus}
                      </div>
                    </div>
                  </div>

                  {/* Program Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Fulfillment: {p.utilization}% of required</span>
                      {isShortage ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Shortage: {Math.abs(p.shortageSurplus)} seats
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Fully Accommodated (+{p.shortageSurplus})
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, p.utilization)}%`,
                          backgroundColor: isShortage ? '#f59e0b' : p.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zones Breakdown */}
        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-2.5">
            Zone Breakdown
          </h4>
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl overflow-hidden font-mono text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">Zone</th>
                  <th className="p-2.5">Total Seats</th>
                  <th className="p-2.5">Allocated</th>
                  <th className="p-2.5">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {zones.map((z) => {
                  const zSeats = seats.filter((s) => s.zoneId === z.id);
                  const zAlloc = zSeats.filter((s) => s.programId && !s.isBlocked).length;
                  const zOcc = zSeats.length > 0 ? Math.round((zAlloc / zSeats.length) * 100) : 0;
                  return (
                    <tr key={z.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                        {z.name}
                      </td>
                      <td className="p-2.5 text-white">{zSeats.length}</td>
                      <td className="p-2.5 text-sky-400">{zAlloc}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{zOcc}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
