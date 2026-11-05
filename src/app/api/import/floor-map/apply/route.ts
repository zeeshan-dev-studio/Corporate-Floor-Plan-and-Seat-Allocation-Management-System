import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { captureFloorSnapshot } from '@/lib/floorSnapshot';
import { resolveSeatIds } from '@/lib/excelMap/ids';
import { resolveLegendPrograms } from '@/lib/excelMap/programs';
import { validateModel } from '@/lib/excelMap/validate';
import { FloorMapModel, LegendEntry } from '@/lib/excelMap/types';

export const dynamic = 'force-dynamic';

const SHIFT = '09:00 - 18:00';
const CHUNK = 400;

type Change = 'assign' | 'clear' | 'block' | 'unchanged' | 'occupied';

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

/** Works out, without writing anything, what applying the map's colours to one floor would do. */
async function buildPlan(body: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const model = body.model as FloorMapModel;

  const modelErrors = validateModel(model);
  if (modelErrors.length) return { errors: modelErrors, warnings, plan: null as any };

  const floor = body.floorId ? await prisma.floor.findUnique({ where: { id: String(body.floorId) } }) : null;
  if (!floor) return { errors: ['Floor not found.'], warnings, plan: null as any };

  const prefix = String(body.seatPrefix || '').trim();
  if (prefix.length > 20) errors.push('The seat ID prefix is too long (up to 20 characters).');

  const resolved = resolveSeatIds(model, prefix, body.defaultZone || 'A');
  const labelled = resolved.filter((r) => !r.generated);
  const unlabelled = resolved.length - labelled.length;
  if (unlabelled) warnings.push(unlabelled + ' cells have no seat number in the map, so they cannot be matched and were skipped.');
  const dupes = labelled.filter((r) => r.error);
  if (dupes.length) errors.push(dupes.length + ' seats have a duplicate seat ID in the map (for example ' + dupes[0].seatId + ').');

  const seats = await prisma.seat.findMany({
    where: { floorId: floor.id },
    include: { allocations: true, blocks: { where: { active: true } } },
  });
  const bySeatId = new Map(seats.map((s) => [s.seatId.toUpperCase(), s]));

  const matched = labelled.filter((r) => !r.error && bySeatId.has(r.seatId));
  const unmatched = labelled.filter((r) => !r.error && !bySeatId.has(r.seatId));
  if (!matched.length && !errors.length) {
    errors.push(
      'None of the seat numbers in the map match a seat on "' + floor.name + '". Check the seat ID prefix (this floor uses IDs like ' + (seats[0]?.seatId || 'none') + ').'
    );
  }
  if (unmatched.length) {
    warnings.push(unmatched.length + ' seats in the map do not exist on this floor (for example ' + unmatched[0].seatId + ') and were skipped.');
  }

  const byKey = new Map<string, LegendEntry>(model.legend.map((e) => [e.key, e]));
  const prog = await resolveLegendPrograms(model, !!body.createMissingPrograms, matched.map((r) => r.seat));
  errors.push(...prog.errors);

  const skipOccupied = body.skipOccupied !== false;
  const items = matched.map((r) => {
    const seat = bySeatId.get(r.seatId)!;
    const entry = byKey.get(r.seat.legendKey) as LegendEntry;
    const alloc = seat.allocations[0];
    const blocked = seat.blocks.length > 0;
    const occupied = !!alloc?.employeeName;
    let change: Change = 'unchanged';
    if (entry.kind === 'program' || entry.kind === 'support') {
      const p = prog.programFor[entry.key];
      const same = !!alloc && !!p?.id && alloc.programId === p.id;
      if (!same || blocked) change = occupied && skipOccupied && !same ? 'occupied' : 'assign';
    } else if (entry.kind === 'vacant') {
      if (alloc || blocked) change = occupied && skipOccupied ? 'occupied' : 'clear';
    } else if (!blocked) {
      change = 'block';
    }
    return { seat, entry, change };
  });

  const count = (c: Change) => items.filter((i) => i.change === c).length;
  const summary = {
    floor: floor.name,
    mapSeats: model.seats.length,
    matched: matched.length,
    unmatched: unmatched.length,
    notInMap: seats.length - matched.length,
    assign: count('assign'),
    clear: count('clear'),
    block: count('block'),
    unchanged: count('unchanged'),
    occupied: count('occupied'),
    newPrograms: prog.needs.map((n) => ({ code: n.code, name: n.name, seats: n.seats })),
    sampleUnmatched: unmatched.slice(0, 5).map((r) => r.seatId),
  };
  return { errors, warnings, plan: { floor, items, prog, summary } };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    if (action !== 'PREVIEW' && action !== 'COMMIT') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const { errors, warnings, plan } = await buildPlan(body);
    const summary = plan?.summary;

    if (action === 'PREVIEW') {
      return NextResponse.json({ success: true, ok: errors.length === 0, errors, warnings, summary });
    }
    if (errors.length) {
      return NextResponse.json({ success: false, error: errors.join(' '), errors }, { status: 422 });
    }

    const { floor, items, prog } = plan;
    const user = String(body.user || 'Facility Planner');
    const userRole = String(body.userRole || 'Administrator');
    const changed = items.filter((i: any) => i.change === 'assign' || i.change === 'clear' || i.change === 'block');
    if (!changed.length) {
      return NextResponse.json({
        success: true,
        floorId: floor.id,
        changed: 0,
        message: 'Nothing to change: the floor already matches the map.',
        summary,
      });
    }
    const now = new Date();

    await prisma.$transaction(
      async (tx) => {
        // Restore point so the whole update can be undone from Version Manager
        const snapshot = await captureFloorSnapshot(tx, floor.id);
        await tx.floorVersion.create({
          data: {
            floorId: floor.id,
            versionName: 'Before Excel colour update',
            description: 'Saved automatically before applying an Excel floor map to this floor',
            snapshotJson: JSON.stringify(snapshot),
            createdBy: user,
          },
        });

        const createdIds: Record<string, string> = {};
        for (const need of prog.needs) {
          const p = await tx.program.create({
            data: { name: need.name, code: need.code, color: need.entry.color, requiredCapacity: need.seats, notes: 'Created from an Excel floor map' },
          });
          createdIds[need.code] = p.id;
        }

        const touched = changed.filter((i: any) => i.change !== 'block').map((i: any) => i.seat.id as string);
        for (const part of chunks<string>(touched)) {
          await tx.seatAllocation.deleteMany({ where: { seatId: { in: part } } });
          await tx.seatBlock.updateMany({ where: { seatId: { in: part }, active: true }, data: { active: false, endDate: now } });
        }

        const allocRows: any[] = [];
        const blockRows: any[] = [];
        for (const i of changed) {
          if (i.change === 'assign') {
            const p = prog.programFor[i.entry.key];
            allocRows.push({
              id: randomUUID(),
              seatId: i.seat.id,
              programId: p.id || createdIds[p.code],
              status: 'ALLOCATED',
              shift: SHIFT,
              effectiveDate: now,
              notes: i.entry.kind === 'support' ? i.entry.label : null,
            });
          } else if (i.change === 'block') {
            blockRows.push({
              id: randomUUID(),
              seatId: i.seat.id,
              reason: 'Other',
              startDate: now,
              notes: 'Non-usable seat (from the Excel floor map)',
              active: true,
            });
          }
        }
        if (allocRows.length) await tx.seatAllocation.createMany({ data: allocRows });
        if (blockRows.length) await tx.seatBlock.createMany({ data: blockRows });

        await tx.auditLog.create({
          data: {
            action: 'EXCEL_MAP_APPLY',
            entityType: 'FLOOR',
            entityId: floor.id,
            user,
            userRole,
            newValue: JSON.stringify({
              assigned: summary.assign,
              cleared: summary.clear,
              blocked: summary.block,
              skippedOccupied: summary.occupied,
              newPrograms: prog.needs.length,
            }),
            reason: 'Excel floor map colours applied to "' + floor.name + '" by seat number',
            source: 'EXCEL_IMPORT',
          },
        });
      },
      { timeout: 60000, maxWait: 10000 }
    );

    return NextResponse.json({
      success: true,
      floorId: floor.id,
      changed: changed.length,
      message:
        'Updated ' + changed.length + ' seats on "' + floor.name + '".' +
        (summary.occupied ? ' ' + summary.occupied + ' seats with an employee were left as they are.' : ''),
      summary,
    });
  } catch (error: any) {
    console.error('Failed to apply Excel floor map:', error);
    return NextResponse.json({ success: false, error: error.message || 'Update failed' }, { status: 500 });
  }
}
