// Writes the sample Excel floor map and its HTML view into the samples folder.
// Run: npm run sample:excel
import fs from 'fs';
import path from 'path';
import { buildSampleModel } from '../src/lib/excelMap/sample';
import { buildFloorMapWorkbook } from '../src/lib/excelMap/writeWorkbook';
import { floorMapToHtml } from '../src/lib/excelMap/toHtml';

async function main() {
  const outDir = path.join(__dirname, '..', 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const model = buildSampleModel();

  const xlsxPath = path.join(outDir, 'Sample-Floor-Plan.xlsx');
  await buildFloorMapWorkbook(model).xlsx.writeFile(xlsxPath);

  const htmlPath = path.join(outDir, 'Sample-Floor-Plan.html');
  fs.writeFileSync(htmlPath, floorMapToHtml(model), 'utf8');

  console.log('Seats : ' + model.seats.length);
  console.log('Rooms : ' + model.rooms.length);
  console.log('Wrote : ' + xlsxPath);
  console.log('Wrote : ' + htmlPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
