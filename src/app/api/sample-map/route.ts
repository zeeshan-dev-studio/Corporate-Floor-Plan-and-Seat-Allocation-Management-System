import { NextRequest, NextResponse } from 'next/server';
import { buildSampleModel } from '@/lib/excelMap/sample';
import { buildFloorMapWorkbook } from '@/lib/excelMap/writeWorkbook';
import { floorMapToHtml } from '@/lib/excelMap/toHtml';

export const dynamic = 'force-dynamic';

// GET /api/sample-map            -> Sample-Floor-Plan.xlsx
// GET /api/sample-map?format=html -> the same map as a standalone HTML page
export async function GET(req: NextRequest) {
  const model = buildSampleModel();
  const format = new URL(req.url).searchParams.get('format');

  if (format === 'html') {
    return new NextResponse(floorMapToHtml(model), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const buffer = await buildFloorMapWorkbook(model).xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Sample-Floor-Plan.xlsx"',
    },
  });
}
