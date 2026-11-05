import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { captureFloorSnapshot } from '@/lib/floorSnapshot';
import { resolveSeatIds } from '@/lib/excelMap/ids';
import { ProgramNeed, resolveLegendPrograms } from '@/lib/excelMap/programs';
import { validateModel } from '@/lib/excelMap/validate';
import { FloorMapModel, LegendEntry } from '@/lib/excelMap/types';

export const dynamic = 'force-dynamic';

const PITCH = 44; // floor units between seat centres (seat radius is 10)
const MARGIN = 80;
const SQFT_PER_CELL = 9;
const ZONE_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f43f5e'];
const SHIFT = '09:00 - 18:00';

/** Everything the import would do, worked out without touching the database. */
async function buildPlan(body: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const model = body.model as FloorMapModel;

  const modelErrors = validateModel(model);
  if (modelErrors.length) return { errors: modelErrors, warnings, model, plan: null as any };

  const floorName = String(body.floorName || '').trim();
  const floorNumber = Number(body.floorNumber);
  const prefix = String(body.seatPrefix || '').trim();
  if (!floorName || floorName.length > 60) errors.push('Enter a floor name (up to 60 characters).');
  if (!Number.isInteger(floorNumber) || floorNumber < -5 || floorNumber > 200) errors.push('Enter a whole floor number.');
  if (!prefix || prefix.length > 20) errors.push('Enter a seat ID prefix such as CHN-F04 (up to 20 characters).');

  const building = body.buildingId
    ? await prisma.building.findUnique({ where: { id: String(body.buildingId) } })
    : await prisma.building.findFirst({ orderBy: { name: 'asc' } });
  if (!building) errors.push('Building not found.');

  if (building && floorName) {
    const dupe = await prisma.floor.findFirst({ where: { buildingId: building.id, name: floorName } });
    if (dupe) errors.push('"' + building.name + '" already has a floor called "' + floorName + '".');
  }

  const resolved = resolveSeatIds(model, prefix || 'X', body.defaultZone || 'A');
  const inFile = resolved.filter((r) => r.error);
  if (inFile.length) errors.push(inFile.length + ' seats have a duplicate seat ID in the map (for example ' + inFile[0].seatId + ').');
  const generated = resolved.filter((r) => r.generated).length;
  if (generated) warnings.push(generated + ' cells had no seat number, so they were numbered automatically.');

  if (prefix) {
    const clash = await prisma.seat.findMany({
      where: { seatId: { startsWith: prefix.toUpperCase().replace(/[^A-Z0-9]+/g, '-') + '-' } },
      select: { seatId: true },
    });
    const existing = new Set(clash.map((s) => s.seatId));
    const hits = resolved.filter((r) => existing.has(r.seatId));
    if (hits.length) {
      errors.push(hits.length + ' seat IDs already exist on another floor (for example ' + hits[0].seatId + '). Change the seat ID prefix.');
    }
  }

  // Programs the map needs (program and support entries that are actually used)
  const prog = await resolveLegendPrograms(model, !!body.createMissingPrograms);
  errors.push(...prog.errors);
  const { needs, programFor, used } = prog;

  return { errors, warnings, model, plan: { building, floorName, floorNumber, prefix, resolved, needs, programFor, used } };
}

const roomType = (label: string) => {
  if (/meeting|board|huddle|training|conference/i.test(label)) return 'Meeting room';
  if (/server|electrical|store|storage|lift|stair|wash|toilet|print/i.test(label)) return 'Utility/Core';
  return 'Room';
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    if (action !== 'PREVIEW' && action !== 'COMMIT') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const { errors, warnings, model, plan } = await buildPlan(body);

    const summary = plan && {
      building: plan.building?.name,
      seats: model.seats.length,
      rooms: model.rooms.length,
      zones: Array.from(new Set<string>(plan.resolved.map((r: any) => r.zoneCode))).sort(),
      newPrograms: plan.needs.map((n: ProgramNeed) => ({ code: n.code, name: n.name, seats: n.seats })),
      sampleSeatIds: plan.resolved.slice(0, 3).map((r: any) => r.seatId),
    };

    if (action === 'PREVIEW') {
      return NextResponse.json({ success: true, ok: errors.length === 0, errors, warnings, summary });
    }
    if (errors.length) {
      return NextResponse.json({ success: false, error: errors.join(' '), errors }, { status: 422 });
    }

    const { building, floorName, floorNumber, resolved, needs, programFor } = plan;
    const user = String(body.user || 'Facility Planner');
    const userRole = String(body.userRole || 'Administrator');
    const byKey = new Map<string, LegendEntry>(model.legend.map((e) => [e.key, e]));
    const width = Math.max(1200, Math.ceil((model.cols * PITCH + 2 * MARGIN) / 20) * 20);
    const height = Math.max(800, Math.ceil((model.rows * PITCH + 2 * MARGIN) / 20) * 20);
    const now = new Date();

    const floor = await prisma.$transaction(
      async (tx) => {
        const floor = await tx.floor.create({
          data: {
            buildingId: building.id,
            name: floorName,
            floorNumber,
            totalArea: model.rows * model.cols * SQFT_PER_CELL,
            width,
            height,
            scale: 1,
            gridSize: 20,
          },
        });

        const zoneIds: Record<string, string> = {};
        const zoneCodes = Array.from(new Set<string>(resolved.map((r: any) => r.zoneCode))).sort();
        for (let i = 0; i < zoneCodes.length; i++) {
          const z = await tx.zone.create({
            data: { floorId: floor.id, code: zoneCodes[i], name: 'Zone ' + zoneCodes[i], color: ZONE_COLORS[i % ZONE_COLORS.length] },
          });
          zoneIds[zoneCodes[i]] = z.id;
        }

        const createdIds: Record<string, string> = {};
        for (const need of needs as ProgramNeed[]) {
          const p = await tx.program.create({
            data: { name: need.name, code: need.code, color: need.entry.color, requiredCapacity: need.seats, notes: 'Created from an Excel floor map' },
          });
          createdIds[need.code] = p.id;
        }

        const seatRows: any[] = [];
        const allocRows: any[] = [];
        const blockRows: any[] = [];
        resolved.forEach((r: any) => {
          const entry = byKey.get(r.seat.legendKey) as LegendEntry;
          const id = randomUUID();
          seatRows.push({
            id,
            seatId: r.seatId,
            floorId: floor.id,
            zoneId: zoneIds[r.zoneCode] || null,
            seatType: 'standard',
            x: MARGIN + (r.seat.col + 0.5) * PITCH,
            y: MARGIN + (r.seat.row + 0.5) * PITCH,
            rotation: 0,
          });
          if (entry.kind === 'program' || entry.kind === 'support') {
            const p = programFor[entry.key];
            allocRows.push({
              id: randomUUID(),
              seatId: id,
              programId: p.id || createdIds[p.code],
              status: 'ALLOCATED',
              shift: SHIFT,
              effectiveDate: now,
              notes: entry.kind === 'support' ? entry.label : null,
            });
          } else if (entry.kind === 'nonusable') {
            blockRows.push({ id: randomUUID(), seatId: id, reason: 'Other', startDate: now, notes: 'Non-usable seat (from the Excel floor map)', active: true });
          }
        });
        await tx.seat.createMany({ data: seatRows });
        if (allocRows.length) await tx.seatAllocation.createMany({ data: allocRows });
        if (blockRows.length) await tx.seatBlock.createMany({ data: blockRows });

        const objects: any[] = [
          {
            id: randomUUID(),
            floorId: floor.id,
            type: 'wall',
            subType: 'perimeter',
            layer: 'architecture',
            x: 40,
            y: 40,
            width: width - 80,
            height: height - 80,
            rotation: 0,
            geometry: JSON.stringify({ shape: 'rect', stroke: '#475569', strokeWidth: 10, fill: 'none' }),
            properties: JSON.stringify({ label: 'External Building Envelope', thickness: 200 }),
          },
          ...model.rooms.map((room) => ({
            id: randomUUID(),
            floorId: floor.id,
            type: 'room',
            subType: 'room',
            layer: 'rooms',
            x: MARGIN + room.col * PITCH + 2,
            y: MARGIN + room.row * PITCH + 2,
            width: room.colSpan * PITCH - 4,
            height: room.rowSpan * PITCH - 4,
            rotation: 0,
            geometry: JSON.stringify({ shape: 'rect', stroke: room.color, strokeWidth: 3, fill: 'rgba(100, 116, 139, 0.10)' }),
            properties: JSON.stringify({ label: room.label || 'Room', roomType: roomType(room.label || ''), areaSqFt: room.rowSpan * room.colSpan * SQFT_PER_CELL }),
          })),
        ];
        await tx.floorObject.createMany({ data: objects });

        const snapshot = await captureFloorSnapshot(tx, floor.id);
        await tx.floorVersion.create({
          data: {
            floorId: floor.id,
            versionName: 'Imported from Excel',
            description: 'Created from "' + model.title + '"',
            snapshotJson: JSON.stringify(snapshot),
            createdBy: user,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'EXCEL_MAP_IMPORT',
            entityType: 'FLOOR',
            entityId: floor.id,
            user,
            userRole,
            newValue: JSON.stringify({ floor: floorName, seats: seatRows.length, rooms: model.rooms.length, newPrograms: needs.length }),
            reason: 'Floor created from an Excel floor map (' + seatRows.length + ' seats)',
            source: 'EXCEL_IMPORT',
          },
        });
        return floor;
      },
      { timeout: 60000, maxWait: 10000 }
    );

    return NextResponse.json({
      success: true,
      floorId: floor.id,
      message: 'Created "' + floorName + '" with ' + model.seats.length + ' seats and ' + model.rooms.length + ' rooms.',
      summary,
    });
  } catch (error: any) {
    console.error('Failed to import Excel floor map:', error);
    return NextResponse.json({ success: false, error: error.message || 'Import failed' }, { status: 500 });
  }
}
