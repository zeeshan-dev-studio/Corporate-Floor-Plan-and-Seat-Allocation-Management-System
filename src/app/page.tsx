'use client';

import React, { useEffect, useRef } from 'react';
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
import { ExportModal } from '@/components/modals/ExportModal';
import { VersionSnapshotModal } from '@/components/history/VersionSnapshotModal';
import { AuditHistoryModal } from '@/components/history/AuditHistoryModal';
import { CapacityDashboard } from '@/components/analytics/CapacityDashboard';

export default function FloorPlanPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { loadFloorData, isLoading } = useFloorPlanStore();

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181b22]">
      {/* 1. Master Top Navigation Bar */}
      <TopNavBar />

      {/* 2. Main Workstation CAD Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Object & Symbol Library + CAD Layers */}
        <ObjectLibrarySidebar />

        {/* Center: High-Performance Vector SVG Floor Plan Canvas */}
        <main className="flex-1 h-full relative overflow-hidden bg-[#181b22]">
          <FloorPlanCanvas svgRef={svgRef} />

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
        <PropertiesPanel />
      </div>

      {/* 3. Modals & Overlay Drawers */}
      <BulkAssignModal />
      <BulkBlockModal />
      <BulkUnallocateModal />
      <ExcelImportModal />
      <ExportModal svgRef={svgRef} />
      <VersionSnapshotModal />
      <AuditHistoryModal />
      <CapacityDashboard />
    </div>
  );
}
