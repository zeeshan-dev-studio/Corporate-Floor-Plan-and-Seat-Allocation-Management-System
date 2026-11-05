// Round-trip check: sample model -> .xlsx -> read back -> must match. Run: npm run check:excel-map
import ExcelJS from 'exceljs';
import { buildSampleModel } from '../src/lib/excelMap/sample';
import { buildFloorMapWorkbook } from '../src/lib/excelMap/writeWorkbook';
import { readFloorMap } from '../src/lib/excelMap/readWorkbook';
import { resolveSeatIds } from '../src/lib/excelMap/ids';

async function main() {
  const original = buildSampleModel();
  const buf = (await buildFloorMapWorkbook(original).xlsx.writeBuffer()) as ArrayBuffer;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const back = readFloorMap(wb);

  const fails: string[] = [];
  const expect = (ok: boolean, msg: string) => {
    if (!ok) fails.push(msg);
  };

  expect(back.rows === original.rows && back.cols === original.cols, 'grid size ' + back.rows + 'x' + back.cols + ' != ' + original.rows + 'x' + original.cols);
  expect(back.seats.length === original.seats.length, 'seat count ' + back.seats.length + ' != ' + original.seats.length);
  expect(back.rooms.length === original.rooms.length, 'room count ' + back.rooms.length + ' != ' + original.rooms.length);
  expect(back.legend.length === original.legend.length, 'legend entries ' + back.legend.length + ' != ' + original.legend.length);
  expect(back.warnings.length === 0, 'warnings: ' + back.warnings.join(' | '));

  const key = (s: { row: number; col: number }) => s.row + ',' + s.col;
  const want: Record<string, { label: string; legendKey: string }> = {};
  original.seats.forEach((s) => (want[key(s)] = s));
  let wrong = 0;
  back.seats.forEach((s) => {
    const w = want[key(s)];
    if (!w || w.label !== s.label || w.legendKey !== s.legendKey) wrong++;
  });
  expect(wrong === 0, wrong + ' seats differ after the round trip');

  const ids = resolveSeatIds(back, 'CHN-F04');
  expect(ids.every((r) => !r.error), 'duplicate seat ids');
  expect(ids[0].seatId === 'CHN-F04-A-001', 'first id is ' + ids[0].seatId);

  console.log('seats ' + back.seats.length + ', rooms ' + back.rooms.length + ', legend ' + back.legend.length);
  if (fails.length) {
    console.error('FAILED:\n - ' + fails.join('\n - '));
    process.exit(1);
  }
  console.log('OK: Excel round trip matches');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
