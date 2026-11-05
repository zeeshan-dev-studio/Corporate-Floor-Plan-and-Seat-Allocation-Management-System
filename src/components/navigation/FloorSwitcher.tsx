'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';

/** Floor name in the header; click to switch to another floor of any building. */
export const FloorSwitcher: React.FC = () => {
  const { floor, past, loadFloorData } = useFloorPlanStore();
  const [open, setOpen] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/floors')
      .then((r) => r.json())
      .then((d) => d.success && setBuildings(d.buildings))
      .catch(() => {});
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, floor?.id]);

  const pick = async (id: string) => {
    setOpen(false);
    if (id === floor?.id) return;
    if (past.length > 0 && !window.confirm('This floor has unsaved layout edits. Switching floors discards them. Continue?')) return;
    await loadFloorData(id);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-0.5 text-sky-400 font-semibold hover:text-sky-300">
        {floor?.name || 'Floor'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs">
          {buildings.map((b) => (
            <div key={b.id}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500">{b.name}</div>
              {b.floors.map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => pick(f.id)}
                  className={'w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-800 ' + (f.id === floor?.id ? 'text-sky-400' : 'text-slate-200')}
                >
                  <span>{f.name}</span>
                  <span className="text-slate-500">{f._count?.seats ?? 0} seats</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
