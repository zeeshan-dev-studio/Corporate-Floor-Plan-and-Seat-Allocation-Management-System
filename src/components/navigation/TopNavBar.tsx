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
} from 'lucide-react';
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
    activeRole,
    setActiveRole,
    selectedProgramFilter,
    setProgramFilter,
    selectedStatusFilter,
    setStatusFilter,
    setExportModalOpen,
    setExcelImportOpen,
    setVersionModalOpen,
    setAuditModalOpen,
    setAnalyticsDrawerOpen,
  } = useFloorPlanStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-30 select-none text-slate-200">
      {/* 1. Left: Campus / Building / Floor Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="leading-tight text-xs font-bold text-white flex items-center gap-1.5">
              <span>{building?.name || 'Chennai Campus - Building F2'}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sky-400 font-semibold">{floor?.name || 'Floor 3'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              35,000 Sq Ft • 532 Total Workstations
            </div>
          </div>
        </div>

        {/* Operational vs Architectural View Mode Toggle */}
        <div className="hidden md:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700/80 text-xs">
          <button
            onClick={() => setViewMode('operational')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'operational'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operational View
          </button>
          <button
            onClick={() => setViewMode('architectural')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'architectural'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Architectural View
          </button>
        </div>
      </div>

      {/* 2. Center: Global Search & Quick Filters */}
      <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Seat ID (e.g. CHN-F03-A-041), Program, Bay..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 max-h-60 overflow-y-auto">
              {searchResults.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSearchResult(seat.seatId)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-xs flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 group-hover:text-white">
                      {seat.seatId}
                    </span>
                    <span className="text-[11px] text-slate-400">{seat.bayCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: seat.programColor ? `${seat.programColor}20` : '#334155',
                        color: seat.programColor || '#94a3b8',
                      }}
                    >
                      {seat.programName || 'Unallocated'}
                    </span>
                    {seat.isBlocked && (
                      <span className="text-[10px] text-red-400 font-bold">BLOCKED</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Program Filter Dropdown */}
        <select
          value={selectedProgramFilter || ''}
          onChange={(e) => setProgramFilter(e.target.value || null)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          value={selectedStatusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="UNALLOCATED">Vacant / Unallocated</option>
          <option value="BLOCKED">Blocked (Maintenance)</option>
        </select>
      </div>

      {/* 3. Right: CAD Controls, Modals Triggers & Role Switcher */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.15, z / 1.2))}
            title="Zoom Out (-)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 text-[10px] font-mono font-bold text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4.0, z * 1.2))}
            title="Zoom In (+)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Reset View"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snap to Grid Toggle */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
          className={`p-2 rounded-lg border transition-colors ${
            snapToGrid
              ? 'bg-sky-500/20 border-sky-500 text-sky-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {/* Analytics Dashboard Trigger */}
        <button
          onClick={() => setAnalyticsDrawerOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Capacity</span>
        </button>

        {/* Export Trigger */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Excel Import Trigger */}
        <button
          onClick={() => setExcelImportOpen(true)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Import</span>
        </button>

        {/* Version Snapshots Trigger */}
        <button
          onClick={() => setVersionModalOpen(true)}
          title="Floor Snapshots & Versioning"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Audit Log Trigger */}
        <button
          onClick={() => setAuditModalOpen(true)}
          title="System Audit Trail"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* Save Layout Button */}
        {(activeRole === 'Administrator' || activeRole === 'Facility Manager') && (
          <button
            onClick={saveFloorLayout}
            disabled={isSaving}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        )}

        {/* Role Switcher */}
        <div className="relative border-l border-slate-800 pl-2">
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as UserRole)}
            className="bg-slate-800 text-[11px] font-bold text-sky-400 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                Role: {r}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
