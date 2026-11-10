import React from 'react';

interface RulersProps {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  cursorX: number;
  cursorY: number;
}

export const Rulers: React.FC<RulersProps> = ({
  width,
  height,
  zoom,
  panX,
  panY,
  cursorX,
  cursorY,
}) => {
  const rulerThickness = 30;

  // Labels are in feet (10 drawing units = 1 ft). Pick a spacing that keeps labels at least 64px apart.
  const FT = 10;
  const feetStep = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((f) => f * FT * zoom >= 64) ?? 1000;
  const step = feetStep * FT;
  const screenStep = step * zoom;

  // Compute start offset for ticks
  const startX = (panX % screenStep + screenStep) % screenStep;
  const startY = (panY % screenStep + screenStep) % screenStep;

  const hTicks: { pos: number; val: number }[] = [];
  for (let x = startX; x < width; x += screenStep) {
    const floorCoord = Math.round((x - panX) / zoom / FT);
    hTicks.push({ pos: x, val: floorCoord });
  }

  const vTicks: { pos: number; val: number }[] = [];
  for (let y = startY; y < height; y += screenStep) {
    const floorCoord = Math.round((y - panY) / zoom / FT);
    vTicks.push({ pos: y, val: floorCoord });
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-mono text-[9px] text-slate-400 select-none">
      {/* Top Left Corner Box */}
      <div
        className="absolute top-0 left-0 bg-slate-900 border-r border-b border-slate-700 flex items-center justify-center text-[10px] text-slate-600 font-bold z-20"
        style={{ width: rulerThickness, height: rulerThickness }}
      >
        ft
      </div>

      {/* Horizontal Ruler */}
      <div
        className="absolute top-0 left-0 right-0 bg-slate-900/90 border-b border-slate-700 backdrop-blur-sm"
        style={{ height: rulerThickness, left: rulerThickness }}
      >
        <svg className="w-full h-full">
          {hTicks.map((t, idx) => (
            <g key={idx} transform={`translate(${t.pos - rulerThickness}, 0)`}>
              <line x1={0} y1={18} x2={0} y2={rulerThickness} stroke="#334155" strokeWidth={1} />
              <text x={3} y={10} fill="#0f172a" fontSize="10" fontWeight="600">
                {t.val}
              </text>
            </g>
          ))}
          {/* Cursor indicator */}
          <line
            x1={cursorX - rulerThickness}
            y1={0}
            x2={cursorX - rulerThickness}
            y2={rulerThickness}
            stroke="#0369a1"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* Vertical Ruler */}
      <div
        className="absolute top-0 left-0 bottom-0 bg-slate-900/90 border-r border-slate-700 backdrop-blur-sm"
        style={{ width: rulerThickness, top: rulerThickness }}
      >
        <svg className="w-full h-full">
          {vTicks.map((t, idx) => (
            <g key={idx} transform={`translate(0, ${t.pos - rulerThickness})`}>
              <line x1={18} y1={0} x2={rulerThickness} y2={0} stroke="#334155" strokeWidth={1} />
              <text x={2} y={10} fill="#0f172a" fontSize="10" fontWeight="600">
                {t.val}
              </text>
            </g>
          ))}
          {/* Cursor indicator */}
          <line
            x1={0}
            y1={cursorY - rulerThickness}
            x2={rulerThickness}
            y2={cursorY - rulerThickness}
            stroke="#0369a1"
            strokeWidth={1.5}
          />
        </svg>
      </div>
    </div>
  );
};
