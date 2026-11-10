'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import {
  Building2,
  Search,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Save,
  Download,
  Upload,
  BarChart3,
  Bookmark,
  History,
  Shield,
  Layers,
  Sparkles,
  FileSpreadsheet,
  HelpCircle,
  PanelLeft,
  PanelRight,
  MoreHorizontal,
  Check,
  UserCog,
} from 'lucide-react';
import { FloorSwitcher } from './FloorSwitcher';
import { UserRole } from '@/types/floorplan';

export const TopNavBar: React.FC = () => {
  const {
    building,
    floor,
    programs,
    seats,
    zoom,
    setZoom,
    resetView,
    zoomToSeat,
    viewMode,
    setViewMode,
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    undo,
    redo,
    past,
    future,
    saveFloorLayout,
    isSaving,
    isDirty,
    activeRole,
    setActiveRole,
    selectedProgramFilter,
    setProgramFilter,
    selectedStatusFilter,
    setStatusFilter,
    setExportModalOpen,
    setExcelImportOpen,
    setExcelMapOpen,
    setVersionModalOpen,
    setAuditModalOpen,
    setAnalyticsDrawerOpen,
    showRulers,
    setShowRulers,
    showMinimap,
    setShowMinimap,
    leftPanelOpen,
    rightPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
  } = useFloorPlanStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Search matches
  const searchResults = searchQuery.trim()
    ? seats
        .filter(
          (s) =>
            s.seatId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.programName && s.programName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.bayCode && s.bayCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.employeeName && s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 8)
    : [];

  const handleSelectSearchResult = (seatId: string) => {
    zoomToSeat(seatId);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const roles: UserRole[] = [
    'Administrator',
    'Facility Manager',
    'Capacity Planner',
    'Program Manager',
    'Viewer',
  ];

  const canEditLayout = activeRole === 'Administrator' || activeRole === 'Facility Manager';
  const iconBtn =
    'p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors';
  const toggleBtn = (on: boolean) =>
    `p-2 rounded-lg border transition-colors ${on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`;
  const menuItem =
    'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-100 hover:bg-slate-800 flex items-center gap-2.5';

  return (
    <header className="bg-slate-900 border-b border-slate-700 z-30 select-none text-slate-100">
      {/* Row 1: where you are, search, main actions */}
      <div className="h-12 flex items-center gap-2 px-3">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          title={`${leftPanelOpen ? 'Hide' : 'Show'} library panel ( [ )`}
          aria-label="Toggle library panel"
          aria-pressed={leftPanelOpen}
          className={toggleBtn(leftPanelOpen)}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 shrink">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-sky-600 flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-50 leading-tight">
              <span className="truncate max-w-[9rem] xl:max-w-[16rem]" title={building?.name}>
                {building?.name || 'Building'}
              </span>
              <span className="text-slate-500">/</span>
              <FloorSwitcher />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight truncate">
              {(floor?.totalArea ?? 0).toLocaleString()} sq ft · {seats.length} seats
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[8rem] max-w-md mx-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find a seat, program or bay"
            aria-label="Search seats"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-50 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 max-h-60 overflow-y-auto">
              {searchResults.map((seat) => (
                <button
                  key={seat.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSearchResult(seat.seatId)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-xs flex items-center justify-between gap-2 group transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-sky-400 truncate">{seat.seatId}</span>
                    <span className="text-[11px] text-slate-400 truncate">{seat.bayCode}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: seat.programColor ? `${seat.programColor}40` : '#e2e8f0', color: '#0f172a' }}
                    >
                      {seat.programName || 'Unallocated'}
                    </span>
                    {seat.isBlocked && <span className="text-[10px] text-red-400 font-bold">BLOCKED</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Main actions */}
        <button
          onClick={() => setAnalyticsDrawerOpen(true)}
          title="Capacity and utilization"
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden xl:inline">Capacity</span>
        </button>
        <button onClick={() => setExportModalOpen(true)} title="Export" className={`${iconBtn} flex items-center gap-1.5 text-xs font-semibold`}>
          <Download className="w-4 h-4 text-sky-400" />
          <span className="hidden xl:inline">Export</span>
        </button>

        {/* More: the rarer actions and view options */}
        <div className="relative">
          <button onClick={() => setMoreOpen((o) => !o)} title="More" aria-haspopup="menu" aria-expanded={moreOpen} className={toggleBtn(moreOpen)}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div role="menu" className="absolute right-0 top-full mt-2 w-60 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl p-1.5 z-50">
                <div className="px-3 pt-1 pb-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">Data</div>
                <button className={menuItem} onClick={() => { setMoreOpen(false); setExcelImportOpen(true); }}>
                  <Upload className="w-4 h-4 text-emerald-400" /> Import seat allocations
                </button>
                <button className={menuItem} onClick={() => { setMoreOpen(false); setExcelMapOpen(true); }}>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel floor map
                </button>
                <button className={menuItem} onClick={() => { setMoreOpen(false); setVersionModalOpen(true); }}>
                  <Bookmark className="w-4 h-4 text-amber-400" /> Snapshots and versions
                </button>
                <button className={menuItem} onClick={() => { setMoreOpen(false); setAuditModalOpen(true); }}>
                  <History className="w-4 h-4 text-indigo-400" /> Audit trail
                </button>
                <div className="my-1.5 border-t border-slate-700" />
                <div className="px-3 pt-1 pb-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">Canvas</div>
                {[
                  { label: 'Grid lines', on: showGrid, set: () => setShowGrid(!showGrid) },
                  { label: 'Rulers', on: showRulers, set: () => setShowRulers(!showRulers) },
                  { label: 'Minimap', on: showMinimap, set: () => setShowMinimap(!showMinimap) },
                ].map((o) => (
                  <button key={o.label} role="menuitemcheckbox" aria-checked={o.on} className={menuItem} onClick={o.set}>
                    <span className="w-4 h-4 flex items-center justify-center">{o.on && <Check className="w-4 h-4 text-sky-400" />}</span>
                    {o.label}
                  </button>
                ))}
                <div className="my-1.5 border-t border-slate-700" />
                <a href="/features" target="_blank" rel="noreferrer" className={menuItem} onClick={() => setMoreOpen(false)}>
                  <HelpCircle className="w-4 h-4 text-sky-400" /> Guide: what this app can do
                </a>
              </div>
            </>
          )}
        </div>

        {canEditLayout && (
          <button
            onClick={saveFloorLayout}
            disabled={isSaving}
            title={isDirty ? 'Save (you have unsaved layout changes)' : 'Save layout'}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            {isDirty && !isSaving && <span className="w-2 h-2 rounded-full bg-amber-300" />}
          </button>
        )}

        <label className="flex items-center gap-1.5 pl-2 border-l border-slate-700 shrink-0" title="Who you are acting as">
          <UserCog className="w-4 h-4 text-slate-400 shrink-0 hidden lg:block" />
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as UserRole)}
            aria-label="Role"
            className="bg-slate-800 text-xs font-bold text-slate-50 border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none max-w-[6.5rem] lg:max-w-[9.5rem]"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title={`${rightPanelOpen ? 'Hide' : 'Show'} details panel ( ] )`}
          aria-label="Toggle details panel"
          aria-pressed={rightPanelOpen}
          className={toggleBtn(rightPanelOpen)}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Row 2: what you see (view, filters) and how you move around (undo, zoom) */}
      <div className="h-11 flex items-center gap-2 px-3 border-t border-slate-800 bg-slate-950 overflow-x-auto">
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs shrink-0">
          {(['operational', 'architectural'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              aria-pressed={viewMode === m}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                viewMode === m ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-300 hover:text-slate-50'
              }`}
            >
              {m === 'operational' ? 'Operational' : 'Architectural'}
            </button>
          ))}
        </div>

        <select
          value={selectedProgramFilter || ''}
          onChange={(e) => setProgramFilter(e.target.value || null)}
          aria-label="Filter by program"
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:border-sky-500 font-medium shrink-0 max-w-[11rem]"
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={selectedStatusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          aria-label="Filter by status"
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:border-sky-500 font-medium shrink-0 max-w-[11rem]"
        >
          <option value="">All statuses</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="UNALLOCATED">Vacant</option>
          <option value="BLOCKED">Blocked</option>
        </select>

        <div className="flex-1" />

        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 shrink-0">
          <button onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo" className="p-1.5 hover:bg-slate-700 rounded text-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)" aria-label="Redo" className="p-1.5 hover:bg-slate-700 rounded text-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 shrink-0">
          <button onClick={() => setZoom((z) => Math.max(0.05, z / 1.2))} title="Zoom out ( - )" aria-label="Zoom out" className="p-1.5 hover:bg-slate-700 rounded text-slate-100">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-11 text-center text-xs font-mono font-bold text-slate-50">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4.0, z * 1.2))} title="Zoom in ( + )" aria-label="Zoom in" className="p-1.5 hover:bg-slate-700 rounded text-slate-100">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetView} title="Fit the whole floor" aria-label="Fit floor to window" className="p-1.5 hover:bg-slate-700 rounded text-slate-100">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={`Snap to grid: ${snapToGrid ? 'on' : 'off'}`}
          aria-pressed={snapToGrid}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            snapToGrid ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Grid className="w-4 h-4" />
          Snap
        </button>
      </div>
    </header>
  );
};
