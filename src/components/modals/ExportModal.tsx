'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  X,
  Printer,
  Check,
} from 'lucide-react';
import { generateEnterpriseExcelWorkbook } from '@/lib/export/excel';
import { exportFloorPlanToPDF, downloadSVG, downloadPNG } from '@/lib/export/pdf';

interface ExportModalProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ svgRef }) => {
  const {
    isExportModalOpen,
    setExportModalOpen,
    floor,
    building,
    seats,
    programs,
    viewMode,
    auditLogs,
  } = useFloorPlanStore();

  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'svg' | 'png'>('pdf');
  const [planType, setPlanType] = useState<'operational' | 'architectural'>(viewMode);
  const [paperSize, setPaperSize] = useState<'a4' | 'a3' | 'a2' | 'a1'>('a3');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeEmployeeData, setIncludeEmployeeData] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isExportModalOpen) return null;

  const handleExport = async () => {
    if (!floor || !building) return;
    setIsExporting(true);

    try {
      if (exportFormat === 'excel') {
        const blob = await generateEnterpriseExcelWorkbook({
          buildingName: building.name,
          floor,
          seats,
          programs,
          auditLogs,
          includeSensitiveEmployeeData: includeEmployeeData,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${building.name}_${floor.name}_Master_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (svgRef.current) {
        if (exportFormat === 'svg') {
          downloadSVG(
            svgRef.current,
            `${building.name}_${floor.name}_${planType}.svg`.replace(/\s+/g, '_')
          );
        } else if (exportFormat === 'png') {
          await downloadPNG(
            svgRef.current,
            `${building.name}_${floor.name}_${planType}.png`.replace(/\s+/g, '_'),
            2
          );
        } else if (exportFormat === 'pdf') {
          await exportFloorPlanToPDF(svgRef.current, {
            paperSize,
            orientation,
            title: planType === 'operational' ? 'Program Allocation & Usable Capacity Plan' : 'Architectural & Facility Floor Plan',
            buildingName: building.name,
            floorName: floor.name,
            viewMode: planType,
            programs,
            includeLegend,
            includeTitleBlock,
          });
        }
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to generate export file.');
    } finally {
      setIsExporting(false);
      setExportModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Export Floor Plan & Data</h3>
              <p className="text-xs text-slate-400">
                Generate high-resolution vector PDF, Excel workbook, SVG, or PNG
              </p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Format Selector Tabs */}
          <div>
            <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'pdf', label: 'PDF Document', icon: FileText, desc: 'Print & CAD' },
                { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: '5 Data Sheets' },
                { id: 'svg', label: 'Vector SVG', icon: Layers, desc: 'Scalable CAD' },
                { id: 'png', label: 'Raster PNG', icon: ImageIcon, desc: 'High-Res Image' },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = exportFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/10'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs">{fmt.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan Type: Operational vs Architectural */}
          {exportFormat !== 'excel' && (
            <div>
              <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Floor Plan Content Layer
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlanType('operational')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    planType === 'operational'
                      ? 'bg-sky-500/20 border-sky-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Operational Allocation Plan</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Includes program color highlights, vacancy, blocked seats, legends & capacity tags
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanType('architectural')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    planType === 'architectural'
                      ? 'bg-sky-500/20 border-sky-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Original Architectural Plan</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Clean CAD blueprint: walls, rooms, furniture, facilities. No business allocation markup.
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* PDF Specific Settings */}
          {exportFormat === 'pdf' && (
            <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-sky-400" />
                PDF Print Layout Configurations
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Paper Standard</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                  >
                    <option value="a4">A4 (297 × 210 mm) - Standard Desk</option>
                    <option value="a3">A3 (420 × 297 mm) - Facility Standard</option>
                    <option value="a2">A2 (594 × 420 mm) - Large Architectural</option>
                    <option value="a1">A1 (841 × 594 mm) - Master Blueprint</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                  >
                    <option value="landscape">Landscape (Recommended)</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeLegend}
                    onChange={(e) => setIncludeLegend(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Include Legend & North Arrow</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeTitleBlock}
                    onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Include CAD Title Block</span>
                </label>
              </div>
            </div>
          )}

          {/* Privacy & Sensitivity Settings for Excel */}
          {exportFormat === 'excel' && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="font-semibold text-slate-300">Excel Data Governance:</div>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeEmployeeData}
                  onChange={(e) => setIncludeEmployeeData(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>Include Employee Names & Shifts in Seat Master sheet</span>
              </label>
              <div className="text-[10px] text-slate-400 pl-5">
                Uncheck to mask confidential employee information (e.g. for external vendors or audits).
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Generating...' : `Generate ${exportFormat.toUpperCase()} Export`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
