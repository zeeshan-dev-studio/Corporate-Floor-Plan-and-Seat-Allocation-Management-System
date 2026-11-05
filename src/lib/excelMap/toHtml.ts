import { lighten } from './colors';
import { ROOM_COLOR } from './palette';
import { FloorMapModel, KIND_LABEL } from './types';

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Seat counts per legend entry, in legend order. */
export function countByLegend(model: FloorMapModel) {
  const counts: Record<string, number> = {};
  model.seats.forEach((s) => (counts[s.legendKey] = (counts[s.legendKey] || 0) + 1));
  return model.legend.map((e) => ({ entry: e, count: counts[e.key] || 0 }));
}

/**
 * A single self-contained HTML page showing the map exactly as drawn in Excel (read-only):
 * coloured boxes for seats, merged boxes for rooms, a legend with counts.
 */
export function floorMapToHtml(model: FloorMapModel, cell = 38): string {
  const gap = 2;
  const pitch = cell + gap;
  const width = model.cols * pitch;
  const height = model.rows * pitch;
  const byKey: Record<string, (typeof model.legend)[number]> = {};
  model.legend.forEach((e) => (byKey[e.key] = e));

  const rooms = model.rooms
    .map((r) => {
      const c = r.color || ROOM_COLOR;
      const style =
        'left:' + r.col * pitch + 'px;top:' + r.row * pitch + 'px;width:' + (r.colSpan * pitch - gap) + 'px;height:' +
        (r.rowSpan * pitch - gap) + 'px;border-color:' + c + ';background:' + lighten(c, 0.92) + ';color:' + c;
      return '<div class="room" style="' + style + '" title="' + esc(r.label) + '">' + esc(r.label) + '</div>';
    })
    .join('\n');

  const seats = model.seats
    .map((s) => {
      const e = byKey[s.legendKey];
      if (!e) return '';
      const bg = e.kind === 'vacant' ? '#ffffff' : lighten(e.color, 0.86);
      const style =
        'left:' + s.col * pitch + 'px;top:' + s.row * pitch + 'px;width:' + (cell - 6) + 'px;height:' + (cell - 6) +
        'px;border-color:' + e.color + ';background:' + bg;
      const tip = (s.label || '(no number)') + ' - ' + e.label + ' (' + KIND_LABEL[e.kind] + ')';
      return '<div class="seat" style="' + style + '" title="' + esc(tip) + '">' + esc(s.label) + '</div>';
    })
    .join('\n');

  const legend = countByLegend(model)
    .map(({ entry, count }) => {
      const sw = 'border-color:' + entry.color + ';background:' + (entry.kind === 'vacant' ? '#fff' : lighten(entry.color, 0.86));
      return (
        '<li><span class="sw" style="' + sw + '"></span><span class="lbl">' + esc(entry.label) +
        '</span><span class="kind">' + KIND_LABEL[entry.kind] + '</span><b>' + count + '</b></li>'
      );
    })
    .join('\n');

  const total = model.seats.length;
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + esc(model.title) + '</title>',
    '<style>',
    'body{margin:0;font:14px/1.4 system-ui,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}',
    'header{padding:16px 24px;background:#0f172a;color:#fff}',
    'header h1{margin:0;font-size:18px} header p{margin:4px 0 0;color:#94a3b8;font-size:12px}',
    'main{display:flex;gap:24px;padding:24px;align-items:flex-start;flex-wrap:wrap}',
    '.map{position:relative;flex:none;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;overflow:auto;max-width:100%}',
    '.canvas{position:relative}',
    '.seat{position:absolute;box-sizing:content-box;border:3px solid;border-radius:3px;font-size:9px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap}',
    '.room{position:absolute;box-sizing:border-box;border:3px solid;border-radius:3px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;padding:2px}',
    'aside{flex:1;min-width:260px;max-width:380px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px}',
    'aside h2{margin:0 0 8px;font-size:14px}',
    'ul{list-style:none;margin:0;padding:0} li{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9}',
    '.sw{width:18px;height:18px;border:3px solid;border-radius:3px;box-sizing:border-box;flex:none}',
    '.lbl{flex:1} .kind{color:#64748b;font-size:11px} li b{min-width:36px;text-align:right}',
    '.total{margin-top:10px;display:flex;justify-content:space-between;font-weight:700}',
    '@media print{header{background:#fff;color:#000}.map{border:0}}',
    '</style></head><body>',
    '<header><h1>' + esc(model.title) + '</h1><p>' + total + ' seats - ' + model.rooms.length + ' rooms - read-only view of the Excel floor map</p></header>',
    '<main>',
    '<div class="map"><div class="canvas" style="width:' + width + 'px;height:' + height + 'px">',
    rooms,
    seats,
    '</div></div>',
    '<aside><h2>Legend</h2><ul>',
    legend,
    '</ul><div class="total"><span>Total seats</span><span>' + total + '</span></div></aside>',
    '</main></body></html>',
  ].join('\n');
}
