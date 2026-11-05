'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  X,
  FileSpreadsheet,
  Download,
  MousePointer2,
  Paintbrush,
  Eraser,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { readFloorMap } from '@/lib/excelMap/readWorkbook';
import { buildFloorMapWorkbook } from '@/lib/excelMap/writeWorkbook';
import { countByLegend, floorMapToHtml } from '@/lib/excelMap/toHtml';
import { resolveSeatIds } from '@/lib/excelMap/ids';
import { FloorMapModel, KIND_LABEL } from '@/lib/excelMap/types';
import { MapGrid, MapSelection, MapTool } from './MapGrid';

const pad2 = (n: number) => String(n).padStart(2, '0');

function saveFile(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const inputCls =
  'w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500';

export const ExcelMapModal: React.FC = () => {
  const { isExcelMapOpen, setExcelMapOpen, building, seats, programs, activeRole, past, loadFloorData } = useFloorPlanStore();

  const [model, setModel] = useState<FloorMapModel | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tool, setTool] = useState<MapTool>('select');
  const [brush, setBrush] = useState('');
  const [selected, setSelected] = useState<MapSelection>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [pitch, setPitch] = useState(34);
  const [floorName, setFloorName] = useState('');
  const [floorNumber, setFloorNumber] = useState(4);
  const [seatPrefix, setSeatPrefix] = useState('');
  const [defaultZone, setDefaultZone] = useState('A');
  const [createMissing, setCreateMissing] = useState(true);
  const [check, setCheck] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Suggest the next floor number and a matching seat ID prefix each time the dialog opens
  useEffect(() => {
    if (!isExcelMapOpen) return;
    let alive = true;
    (async () => {
      let next = 1;
      try {
        const res = await fetch('/api/floors');
        const data = await res.json();
        const b = (data.buildings || []).find((x: any) => x.id === building?.id) || data.buildings?.[0];
        const nums: number[] = (b?.floors || []).map((f: any) => f.floorNumber);
        next = nums.length ? Math.max(...nums) + 1 : 1;
      } catch {
        /* keep the default */
      }
      if (!alive) return;
      const sample = seats[0]?.seatId?.split('-') || [];
      const base =
        sample.length >= 4
          ? sample.slice(0, -2).join('-').replace(/F\d+/i, 'F' + pad2(next))
          : (building?.code || 'FL') + '-F' + pad2(next);
      setFloorNumber(next);
      setFloorName('Floor ' + next);
      setSeatPrefix(base);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExcelMapOpen]);

  const resolved = useMemo(() => (model ? resolveSeatIds(model, seatPrefix || 'X', defaultZone) : []), [model, seatPrefix, defaultZone]);
  const seatIds = useMemo(() => resolved.map((r) => r.seatId), [resolved]);
  const errorSeats = useMemo(() => {
    const s = new Set<number>();
    resolved.forEach((r, i) => r.error && s.add(i));
    return s;
  }, [resolved]);
  const counts = useMemo(() => (model ? countByLegend(model) : []), [model]);

  // Ask the server whether this map can be imported (database clashes, missing programs...)
  useEffect(() => {
    if (!model || !isExcelMapOpen || !seatPrefix) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/import/floor-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PREVIEW', buildingId: building?.id, floorName, floorNumber, seatPrefix, defaultZone, createMissingPrograms: createMissing, model }),
        });
        setCheck(await res.json());
      } catch {
        setCheck(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [model, floorName, floorNumber, seatPrefix, defaultZone, createMissing, building?.id, isExcelMapOpen]);

  const loadBuffer = async (buf: ArrayBuffer, name: string) => {
    setBusy(true);
    setLoadError('');
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const m = readFloorMap(wb, { knownPrograms: programs.map((p) => ({ name: p.name, code: p.code, color: p.color })) });
      setModel(m);
      setFileName(name);
      setSelected(null);
      setHighlight(null);
      setCheck(null);
      setBrush(m.legend[0]?.key || '');
    } catch (e: any) {
      setLoadError('Could not read this file. Save it as .xlsx (not .xls) and try again. ' + (e?.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await loadBuffer(await f.arrayBuffer(), f.name);
  };

  const useSample = async () => {
    const res = await fetch('/api/sample-map');
    await loadBuffer(await res.arrayBuffer(), 'Sample-Floor-Plan.xlsx');
  };

  const handleCell = (row: number, col: number, phase: 'down' | 'drag') => {
    if (!model) return;
    const roomAt = (m: FloorMapModel) =>
      m.rooms.findIndex((r) => row >= r.row && row < r.row + r.rowSpan && col >= r.col && col < r.col + r.colSpan);
    if (tool === 'select') {
      if (phase !== 'down') return;
      const si = model.seats.findIndex((s) => s.row === row && s.col === col);
      if (si >= 0) setSelected({ kind: 'seat', index: si });
      else {
        const ri = roomAt(model);
        setSelected(ri >= 0 ? { kind: 'room', index: ri } : null);
      }
      return;
    }
    if (tool === 'erase') {
      setModel((m) => m && { ...m, seats: m.seats.filter((s) => !(s.row === row && s.col === col)) });
      setSelected(null);
      return;
    }
    if (!brush || roomAt(model) >= 0) return;
    setModel((m) => {
      if (!m) return m;
      const i = m.seats.findIndex((s) => s.row === row && s.col === col);
      if (i >= 0) {
        if (m.seats[i].legendKey === brush) return m;
        return { ...m, seats: m.seats.map((s, k) => (k === i ? { ...s, legendKey: brush } : s)) };
      }
      return { ...m, seats: [...m.seats, { row, col, label: '', legendKey: brush }] };
    });
  };

  const patchSeat = (index: number, patch: Partial<FloorMapModel['seats'][number]>) =>
    setModel((m) => m && { ...m, seats: m.seats.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  const removeSelected = () => {
    if (!selected) return;
    setModel((m) => {
      if (!m) return m;
      return selected.kind === 'seat'
        ? { ...m, seats: m.seats.filter((_, i) => i !== selected.index) }
        : { ...m, rooms: m.rooms.filter((_, i) => i !== selected.index) };
    });
    setSelected(null);
  };

  const downloadExcel = async () => {
    if (!model) return;
    const buf = await buildFloorMapWorkbook(model).xlsx.writeBuffer();
    saveFile('Floor-Map-edited.xlsx', buf as ArrayBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  const downloadHtml = () => model && saveFile('Floor-Map.html', floorMapToHtml(model), 'text/html');

  const createFloor = async () => {
    if (!model) return;
    if (past.length > 0 && !window.confirm('The floor you are viewing has unsaved layout edits. Opening the new floor discards them. Continue?')) return;
    setCreating(true);
    try {
      const res = await fetch('/api/import/floor-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMMIT', buildingId: building?.id, floorName, floorNumber, seatPrefix, defaultZone, createMissingPrograms: createMissing, model, userRole: activeRole }),
      });
      const data = await res.json();
      if (!data.success) {
        setCheck({ ok: false, errors: data.errors || [data.error || 'Import failed'], warnings: [] });
        return;
      }
      await loadFloorData(data.floorId);
      setModel(null);
      setCheck(null);
      setFileName('');
      setSelected(null);
      setExcelMapOpen(false);
    } catch (e: any) {
      setCheck({ ok: false, errors: [e?.message || 'Import failed'], warnings: [] });
    } finally {
      setCreating(false);
    }
  };

  if (!isExcelMapOpen) return null;

  const notes: string[] = [...(model?.warnings || []), ...(check?.warnings || [])];
  const errors: string[] = check?.errors || [];
  const canCreate = !!model && !!check?.ok && !creating && model.seats.length > 0;
  const sel = model && selected?.kind === 'seat' ? model.seats[selected.index] : null;
  const selRoom = model && selected?.kind === 'room' ? model.rooms[selected.index] : null;
  const toolBtn = (t: MapTool, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTool(t)}
      className={'px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border ' + (tool === t ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700')}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-[1400px] h-[92vh] flex flex-col text-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">Excel Floor Map</div>
              <div className="text-[11px] text-slate-400">Read a floor drawn in Excel, check and edit it here, then create the floor in the app.</div>
            </div>
          </div>
          <button onClick={() => setExcelMapOpen(false)} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <aside className="w-80 shrink-0 border-r border-slate-800 overflow-y-auto p-4 space-y-5 text-xs">
            <section className="space-y-2">
              <div className="font-bold text-slate-100">1. Excel file</div>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onPickFile} />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="flex-1 px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold">
                  Choose .xlsx
                </button>
                <button onClick={useSample} className="flex-1 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold">
                  Use sample
                </button>
              </div>
              <a href="/api/sample-map" className="block text-sky-400 hover:underline">
                Download the sample workbook
              </a>
              {busy && <div className="text-slate-400">Reading the workbook...</div>}
              {loadError && <div className="text-red-400">{loadError}</div>}
              {model && (
                <div className="text-slate-400">
                  {fileName}: {model.seats.length} seats, {model.rooms.length} rooms, {model.rows} x {model.cols} cells
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="font-bold text-slate-100">2. New floor</div>
              <label className="block space-y-1">
                <span className="text-slate-400">Floor name</span>
                <input className={inputCls} value={floorName} onChange={(e) => setFloorName(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-slate-400">Floor number</span>
                  <input className={inputCls} type="number" value={floorNumber} onChange={(e) => setFloorNumber(parseInt(e.target.value || '0', 10))} />
                </label>
                <label className="block space-y-1">
                  <span className="text-slate-400">Default zone</span>
                  <input className={inputCls} value={defaultZone} maxLength={4} onChange={(e) => setDefaultZone(e.target.value.toUpperCase())} />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-slate-400">Seat ID prefix (seat A-001 becomes {seatPrefix || 'PREFIX'}-A-001)</span>
                <input className={inputCls} value={seatPrefix} onChange={(e) => setSeatPrefix(e.target.value.toUpperCase())} />
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
                Create programs that do not exist yet
              </label>
            </section>

            <section className="space-y-1">
              <div className="font-bold text-slate-100">3. Legend (click to highlight)</div>
              {counts.map(({ entry, count }) => (
                <button
                  key={entry.key}
                  onClick={() => setHighlight(highlight === entry.key ? null : entry.key)}
                  className={'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left ' + (highlight === entry.key ? 'bg-slate-700' : 'hover:bg-slate-800')}
                >
                  <span className="w-4 h-4 rounded-sm shrink-0" style={{ border: '3px solid ' + entry.color, background: entry.kind === 'vacant' ? '#fff' : entry.color + '33' }} />
                  <span className="flex-1 truncate">{entry.label}</span>
                  <span className="text-slate-500">{KIND_LABEL[entry.kind]}</span>
                  <b className="w-9 text-right">{count}</b>
                </button>
              ))}
            </section>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
              {toolBtn('select', 'Select', <MousePointer2 className="w-3.5 h-3.5" />)}
              {toolBtn('paint', 'Paint', <Paintbrush className="w-3.5 h-3.5" />)}
              {toolBtn('erase', 'Erase', <Eraser className="w-3.5 h-3.5" />)}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setPitch((p) => Math.max(18, p - 4))} className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">-</button>
                <span className="text-[11px] text-slate-400 w-10 text-center">{Math.round((pitch / 34) * 100)}%</span>
                <button onClick={() => setPitch((p) => Math.min(64, p + 4))} className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">+</button>
                <button disabled={!model} onClick={downloadExcel} className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40">
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
                <button disabled={!model} onClick={downloadHtml} className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40">
                  <Download className="w-3.5 h-3.5" /> HTML
                </button>
              </div>
            </div>

            <div className="h-10 flex items-center gap-1 px-4 border-b border-slate-800 text-[11px] text-slate-400 overflow-x-auto whitespace-nowrap">
              {tool === 'select' && 'Click a seat to change its number or category, or a room to rename it.'}
              {tool === 'erase' && 'Click or drag over seats to remove them.'}
              {tool === 'paint' && model && (
                <>
                  <span className="mr-1">Brush:</span>
                <div className="flex items-center gap-1">
                  {model.legend.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => setBrush(e.key)}
                      title={e.label}
                      className={'px-2 py-1 rounded-md text-[11px] border flex items-center gap-1 ' + (brush === e.key ? 'bg-slate-700 border-sky-500' : 'bg-slate-800 border-slate-700')}
                    >
                      <span className="w-3 h-3 rounded-sm" style={{ border: '2px solid ' + e.color, background: e.kind === 'vacant' ? '#fff' : e.color + '33' }} />
                      {e.label}
                    </button>
                  ))}
                </div>

                </>
              )}
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4">
              {model ? (
                <div className="inline-block bg-white rounded-lg p-3 shadow-inner">
                  <MapGrid model={model} pitch={pitch} tool={tool} selected={selected} errorSeats={errorSeats} seatIds={seatIds} highlight={highlight} onCell={handleCell} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-8">
                  Choose your Excel floor map, or press "Use sample" to see how a map drawn with coloured cell borders is read.
                </div>
              )}
            </div>

            {(sel || selRoom) && model && (
              <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-t border-slate-800 text-xs bg-slate-900">
                {sel && selected && (
                  <>
                    <span className="text-slate-400">Seat</span>
                    <input className={inputCls + ' !w-28'} value={sel.label} placeholder="A-001" onChange={(e) => patchSeat(selected.index, { label: e.target.value })} />
                    <span className="text-slate-500">{seatIds[selected.index]}</span>
                    <select className={inputCls + ' !w-52'} value={sel.legendKey} onChange={(e) => patchSeat(selected.index, { legendKey: e.target.value })}>
                      {model.legend.map((e) => (
                        <option key={e.key} value={e.key}>
                          {e.label} ({KIND_LABEL[e.kind]})
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {selRoom && selected && (
                  <>
                    <span className="text-slate-400">Room</span>
                    <input
                      className={inputCls + ' !w-56'}
                      value={selRoom.label}
                      onChange={(e) => setModel((m) => m && { ...m, rooms: m.rooms.map((r, i) => (i === selected.index ? { ...r, label: e.target.value } : r)) })}
                    />
                  </>
                )}
                <button onClick={removeSelected} className="ml-auto px-2 py-1 rounded-md bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
          </main>
        </div>

        <div className="border-t border-slate-800 px-5 py-3 flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-1 text-xs max-h-24 overflow-y-auto">
            {errors.map((m, i) => (
              <div key={'e' + i} className="flex gap-1.5 text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {m}
              </div>
            ))}
            {notes.map((m, i) => (
              <div key={'n' + i} className="flex gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {m}
              </div>
            ))}
            {model && check?.ok && (
              <div className="flex gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Ready: {check.summary?.seats} seats in zones {check.summary?.zones?.join(', ')}
                {check.summary?.newPrograms?.length ? '; new programs: ' + check.summary.newPrograms.map((p: any) => p.name).join(', ') : ''}. Example ID: {check.summary?.sampleSeatIds?.[0]}
              </div>
            )}
          </div>
          <button onClick={() => setExcelMapOpen(false)} className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold">
            Cancel
          </button>
          <button onClick={createFloor} disabled={!canCreate} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            {creating ? 'Creating...' : 'Create floor from this map'}
          </button>
        </div>
      </div>
    </div>
  );
};
