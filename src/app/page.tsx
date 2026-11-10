'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { TopNavBar } from '@/components/navigation/TopNavBar';
import { ObjectLibrarySidebar } from '@/components/library/ObjectLibrarySidebar';
import { FloorPlanCanvas } from '@/components/canvas/FloorPlanCanvas';
import { PropertiesPanel } from '@/components/inspector/PropertiesPanel';
import { BulkActionBar } from '@/components/allocation/BulkActionBar';
import { BulkAssignModal } from '@/components/modals/BulkAssignModal';
import { BulkBlockModal } from '@/components/modals/BulkBlockModal';
import { BulkUnallocateModal } from '@/components/modals/BulkUnallocateModal';
import { ExcelImportModal } from '@/components/modals/ExcelImportModal';
import { ExcelMapModal } from '@/components/modals/ExcelMapModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { VersionSnapshotModal } from '@/components/history/VersionSnapshotModal';
import { AuditHistoryModal } from '@/components/history/AuditHistoryModal';
import { CapacityDashboard } from '@/components/analytics/CapacityDashboard';

export default function FloorPlanPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { loadFloorData, isLoading, leftPanelOpen, rightPanelOpen, setLeftPanelOpen, setRightPanelOpen } = useFloorPlanStore();
  // No slide animation while the saved panel state is being applied on first load
  const [panelsReady, setPanelsReady] = useState(false);
  const selectionCount = useFloorPlanStore((s) => s.selectedSeatIds.length + s.selectedObjectIds.length);

  // Remember which side panels were open; on a narrow window start with the inspector tucked away
  useEffect(() => {
    let saved: { l?: boolean; r?: boolean } = {};
    try {
      saved = JSON.parse(localStorage.getItem('fp-panels') || '{}');
    } catch {
      /* private mode */
    }
    const narrow = window.innerWidth < 1200;
    setLeftPanelOpen(saved.l ?? !(window.innerWidth < 900));
    setRightPanelOpen(saved.r ?? !narrow);
    const t = setTimeout(() => setPanelsReady(true), 50);
    return () => clearTimeout(t);
  }, [setLeftPanelOpen, setRightPanelOpen]);

  // Only write once the saved state has been applied, or the defaults would overwrite it on load
  useEffect(() => {
    if (!panelsReady) return;
    try {
      localStorage.setItem('fp-panels', JSON.stringify({ l: leftPanelOpen, r: rightPanelOpen }));
    } catch {
      /* ignore */
    }
  }, [leftPanelOpen, rightPanelOpen, panelsReady]);

  // [ and ] toggle the side panels, \ hides or shows both (focus mode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const st = useFloorPlanStore.getState();
      if (e.key === '[') st.setLeftPanelOpen(!st.leftPanelOpen);
      else if (e.key === ']') st.setRightPanelOpen(!st.rightPanelOpen);
      else if (e.key === 'Backslash' || e.code === 'Backslash') {
        const anyOpen = st.leftPanelOpen || st.rightPanelOpen;
        st.setLeftPanelOpen(!anyOpen);
        st.setRightPanelOpen(!anyOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // Fetch initial building and floor
    async function init() {
      try {
        const res = await fetch('/api/floors');
        const data = await res.json();
        if (data.success && data.buildings.length > 0) {
          const firstFloor = data.buildings[0]?.floors?.[0];
          if (firstFloor) {
            await loadFloorData(firstFloor.id);
          }
        }
      } catch (e) {
        console.error('Failed to initialize application:', e);
      }
    }
    init();
  }, [loadFloorData]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      {/* 1. Master Top Navigation Bar */}
      <TopNavBar />

      {/* 2. Main Workstation CAD Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Object & Symbol Library + CAD Layers */}
        <div
          className={`shrink-0 overflow-hidden ${panelsReady ? 'transition-[width] duration-200 ease-out' : ''}`}
          style={{ width: leftPanelOpen ? 288 : 0 }}
          aria-hidden={!leftPanelOpen}
        >
          <div className="flex h-full w-72">
            <ObjectLibrarySidebar />
          </div>
        </div>

        {/* Center: High-Performance Vector SVG Floor Plan Canvas */}
        <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-white">
          <FloorPlanCanvas svgRef={svgRef} />

          {/* Edge tabs: always visible, so a hidden panel is one click away */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            title={`${leftPanelOpen ? 'Hide' : 'Show'} the library panel ( [ )`}
            aria-label={`${leftPanelOpen ? 'Hide' : 'Show'} library panel`}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-14 w-5 rounded-r-lg bg-slate-900 border border-l-0 border-slate-600 text-slate-300 hover:text-slate-50 hover:bg-slate-800 flex items-center justify-center shadow-md"
          >
            {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title={`${rightPanelOpen ? 'Hide' : 'Show'} the details panel ( ] )`}
            aria-label={`${rightPanelOpen ? 'Hide' : 'Show'} details panel`}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 h-14 w-5 rounded-l-lg bg-slate-900 border border-r-0 border-slate-600 text-slate-300 hover:text-slate-50 hover:bg-slate-800 flex items-center justify-center shadow-md"
          >
            {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!rightPanelOpen && selectionCount > 0 && (
              <span className="absolute -top-2 -left-2 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">
                {selectionCount > 99 ? '99+' : selectionCount}
              </span>
            )}
          </button>

          {/* Floating Bulk Selection Action Bar */}
          <BulkActionBar />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center text-slate-200">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono tracking-wider text-sky-400">
                  LOADING CAD GEOMETRY & SEAT ALLOCATIONS...
                </span>
              </div>
            </div>
          )}
        </main>

        {/* Right: Context Property Inspector & Selection Panel */}
        <div
          className={`shrink-0 overflow-hidden ${panelsReady ? 'transition-[width] duration-200 ease-out' : ''}`}
          style={{ width: rightPanelOpen ? 320 : 0 }}
          aria-hidden={!rightPanelOpen}
        >
          <div className="flex h-full w-80">
            <PropertiesPanel />
          </div>
        </div>
      </div>

      {/* 3. Modals & Overlay Drawers */}
      <BulkAssignModal />
      <BulkBlockModal />
      <BulkUnallocateModal />
      <ExcelImportModal />
      <ExcelMapModal />
      <ExportModal svgRef={svgRef} />
      <VersionSnapshotModal />
      <AuditHistoryModal />
      <CapacityDashboard />
    </div>
  );
}
