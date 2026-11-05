'use client';

import React, { useEffect, useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import ExcelJS from 'exceljs';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  X,
  ArrowRight,
} from 'lucide-react';

export const ExcelImportModal: React.FC = () => {
  const {
    isExcelImportOpen,
    setExcelImportOpen,
    floor,
    activeRole,
    loadFloorData,
  } = useFloorPlanStore();

  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Start clean each time the dialog is opened
  useEffect(() => {
    if (!isExcelImportOpen) {
      setFile(null);
      setValidationResult(null);
    }
  }, [isExcelImportOpen]);

  if (!isExcelImportOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Clear the input so choosing the same file again still fires onChange
    e.target.value = '';
    if (!selected) return;
    setFile(selected);
    setValidationResult(null);

    // Read and parse Excel file
    try {
      setIsValidating(true);
      const buffer = await selected.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      // Find first worksheet or 'Seat Master'
      const worksheet = workbook.getWorksheet('Seat Master') || workbook.worksheets[0];
      if (!worksheet) {
        alert('No worksheet found in uploaded Excel file.');
        setIsValidating(false);
        return;
      }

      const rows: any[] = [];
      // Header text by column number, so a blank header cell cannot shift the columns after it
      const headers: Record<number, string> = {};
      worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber] = cell.text.trim();
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData: Record<string, any> = {};
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const header = headers[colNumber];
          if (header) rowData[header] = cell.text;
        });
        if (Object.keys(rowData).length > 0) rows.push(rowData);
      });

      // Send to server validation endpoint
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VALIDATE',
          floorId: floor?.id,
          rows,
          userRole: activeRole,
        }),
      });

      const data = await res.json();
      setIsValidating(false);
      if (data.success) {
        setValidationResult(data);
      } else {
        alert(data.error || 'Failed to validate Excel rows.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error parsing Excel file. Please ensure it is a valid .xlsx file.');
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult || !validationResult.validRows) return;
    try {
      setIsCommitting(true);
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMMIT',
          floorId: floor?.id,
          validRows: validationResult.validRows,
          user: 'Administrator',
          userRole: activeRole,
        }),
      });
      const data = await res.json();
      setIsCommitting(false);
      if (data.success) {
        alert(data.message || 'Excel allocations applied successfully!');
        if (floor) {
          await loadFloorData(floor.id, undefined, { keepLayout: true });
        }
        setExcelImportOpen(false);
      } else {
        alert(data.error || 'Failed to apply allocations.');
      }
    } catch (err) {
      console.error(err);
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Seat Allocations from Excel</h3>
              <p className="text-xs text-slate-400">
                Upload .xlsx spreadsheet to batch assign programs, shifts, and employees
              </p>
            </div>
          </div>
          <button
            onClick={() => setExcelImportOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Upload Drop Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 text-center transition-colors">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white">
                {file ? file.name : 'Click to select Excel (.xlsx) file'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Expected columns: Seat ID, Program, Zone, Shift, Employee
              </div>
            </label>
          </div>

          {isValidating && (
            <div className="text-center py-4 text-xs text-sky-400 animate-pulse">
              Parsing Excel and validating Seat IDs against current floor database...
            </div>
          )}

          {/* Validation Report */}
          {validationResult && (
            <div className="space-y-3">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-slate-400">Total Rows</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {validationResult.summary.total}
                  </div>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30 text-emerald-400">
                  <div>Valid Records</div>
                  <div className="text-base font-bold font-mono mt-0.5">
                    {validationResult.summary.validCount}
                  </div>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 text-amber-400">
                  <div>Conflicts</div>
                  <div className="text-base font-bold font-mono mt-0.5">
                    {validationResult.summary.conflictsCount}
                  </div>
                </div>
                <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/30 text-red-400">
                  <div>Invalid Rows</div>
                  <div className="text-base font-bold font-mono mt-0.5">
                    {validationResult.summary.invalidCount}
                  </div>
                </div>
              </div>

              {/* Invalid Rows Alert if any */}
              {validationResult.invalidRows.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-red-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4" />
                    Validation Errors ({validationResult.invalidRows.length} rows will be skipped):
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pl-5">
                    {validationResult.invalidRows.map((inv: any, idx: number) => (
                      <div key={idx} className="text-slate-300">
                        Row {inv.rowNumber} [{inv.seatId || 'No ID'}]:{' '}
                        <span className="text-red-300">{inv.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 font-semibold text-xs text-slate-300 flex items-center justify-between">
                  <span>Valid Rows Preview (First 8 Records)</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready to apply
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto font-mono text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Seat ID</th>
                        <th className="p-2">Current</th>
                        <th className="p-2">New Program</th>
                        <th className="p-2">Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {validationResult.validRows.slice(0, 8).map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="p-2 text-slate-500">{r.rowNumber}</td>
                          <td className="p-2 font-bold text-sky-400">{r.seatId}</td>
                          <td className="p-2 text-slate-400">{r.currentProgram}</td>
                          <td className="p-2">
                            <span className={r.isConflict ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                              {r.program}
                            </span>
                          </td>
                          <td className="p-2 text-slate-400">{r.shift}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setExcelImportOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
            {validationResult && validationResult.validRows.length > 0 && (
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCommitting ? 'Applying Allocations...' : `Apply ${validationResult.validRows.length} Valid Allocations`}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
