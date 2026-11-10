import React from 'react';

interface FurnitureArtProps {
  subType: string;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  chairCount?: number;
  label?: string;
  selected?: boolean;
}

const INK = '#1e293b';

const Chair: React.FC<{ x: number; y: number; r: number; w: number; h: number }> = ({ x, y, r, w, h }) => (
  <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={r} fill="#94a3b8" stroke={INK} strokeWidth={1} transform={undefined} />
);

/** Scale-to-fit drawings for the furniture in the library. Returns null for furniture it does not know. */
export const FurnitureArt: React.FC<FurnitureArtProps> = ({ subType, width: w, height: h, fill, stroke, chairCount = 10, label, selected }) => {
  const edge = selected ? '#0369a1' : undefined;

  if (subType === 'confTable') {
    // Chairs along both long sides, table in the middle
    const margin = Math.min(14, h / 4);
    const perSide = Math.max(1, Math.ceil(chairCount / 2));
    const chairW = Math.min(22, (w - 24) / perSide - 4);
    const chairs: React.ReactNode[] = [];
    for (let i = 0; i < chairCount; i++) {
      const top = i % 2 === 0;
      const idx = Math.floor(i / 2);
      const cx = 12 + ((idx + 0.5) * (w - 24)) / perSide;
      chairs.push(<Chair key={i} x={cx} y={top ? margin / 2 : h - margin / 2} r={3} w={Math.max(6, chairW)} h={margin - 3} />);
    }
    return (
      <g>
        {chairs}
        <rect x={6} y={margin} width={w - 12} height={h - margin * 2} rx={Math.min(18, (h - margin * 2) / 2)} fill={fill || '#d9bf94'} stroke={edge || stroke || '#5b4426'} strokeWidth={1.5} />
        <rect x={14} y={margin + 6} width={w - 28} height={Math.max(2, h - margin * 2 - 12)} rx={Math.min(12, (h - margin * 2) / 3)} fill="none" stroke="#5b4426" strokeOpacity={0.35} strokeWidth={1} />
        {label && (
          <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(11, h / 5)} fontWeight="bold" fill="#3b2a14" className="pointer-events-none">
            {label}
          </text>
        )}
      </g>
    );
  }

  if (subType === 'sofa') {
    const arm = Math.min(12, w / 8);
    const back = Math.min(14, h / 3.2);
    const n = w > 110 ? 3 : w > 70 ? 2 : 1;
    const cw = (w - arm * 2) / n;
    const cushions: React.ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      cushions.push(<rect key={i} x={arm + i * cw + 1} y={back + 1} width={cw - 2} height={h - back - 3} rx={4} fill="#c7d2fe" stroke="#3730a3" strokeWidth={1} />);
    }
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} rx={8} fill={fill || '#a5b4fc'} stroke={edge || stroke || '#312e81'} strokeWidth={1.5} />
        <rect x={arm * 0.2} y={0} width={w - arm * 0.4} height={back} rx={5} fill="#818cf8" stroke="#312e81" strokeWidth={1} />
        <rect x={0} y={back * 0.4} width={arm} height={h - back * 0.4} rx={5} fill="#818cf8" stroke="#312e81" strokeWidth={1} />
        <rect x={w - arm} y={back * 0.4} width={arm} height={h - back * 0.4} rx={5} fill="#818cf8" stroke="#312e81" strokeWidth={1} />
        {cushions}
      </g>
    );
  }

  if (subType === 'cabinet') {
    const doors = Math.max(2, Math.round(w / 30));
    const dw = w / doors;
    const lines: React.ReactNode[] = [];
    for (let i = 1; i < doors; i++) lines.push(<line key={i} x1={i * dw} y1={0} x2={i * dw} y2={h} stroke={INK} strokeWidth={1} />);
    const handles: React.ReactNode[] = [];
    for (let i = 0; i < doors; i++) {
      const hx = i % 2 === 0 ? (i + 1) * dw - 5 : i * dw + 5;
      handles.push(<circle key={i} cx={hx} cy={h / 2} r={1.6} fill={INK} />);
    }
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={fill || '#e2e8f0'} stroke={edge || stroke || INK} strokeWidth={1.5} />
        <rect x={2} y={2} width={w - 4} height={h - 4} fill="none" stroke="#64748b" strokeWidth={0.8} />
        {lines}
        {handles}
      </g>
    );
  }

  if (subType === 'plant') {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r - 0.5} fill={fill || '#b45309'} stroke={edge || stroke || '#78350f'} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r * 0.78} fill="#86efac" stroke="#14532d" strokeWidth={1} />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={cx} cy={cy - r * 0.32} rx={r * 0.17} ry={r * 0.4} fill="#16a34a" stroke="#14532d" strokeWidth={0.8} transform={`rotate(${a}, ${cx}, ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.12} fill="#14532d" />
      </g>
    );
  }

  return null;
};
