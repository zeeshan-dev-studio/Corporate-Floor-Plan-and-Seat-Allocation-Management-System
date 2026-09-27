import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureFloorSnapshot, readRestorableSnapshot } from '@/lib/floorSnapshot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const floorId = searchParams.get('floorId');

    if (!floorId) {
      return NextResponse.json({ success: false, error: 'floorId required' }, { status: 400 });
    }

    const versions = await prisma.floorVersion.findMany({
      where: { floorId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        floorId: true,
        versionName: true,
        description: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, versions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, floorId, versionName, description, versionId, user = 'Facility Planner' } = body;

    if (action === 'CREATE') {
      if (!floorId || !versionName) {
        return NextResponse.json(
          { success: false, error: 'floorId and versionName required' },
          { status: 400 }
        );
      }

      // Gather current state of floor, objects, seats, allocations, blocks
      const snapshot = await captureFloorSnapshot(prisma, floorId);
      if (!snapshot.floor) {
        return NextResponse.json({ success: false, error: 'Floor not found' }, { status: 404 });
      }

      const newVersion = await prisma.floorVersion.create({
        data: {
          floorId,
          versionName,
          description: description || null,
          snapshotJson: JSON.stringify(snapshot),
          createdBy: user,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'CREATE_FLOOR_VERSION',
          entityType: 'FLOOR_VERSION',
          entityId: newVersion.id,
          user,
          newValue: JSON.stringify({ versionName, seatsCount: snapshot.seats.length }),
          reason: description || 'Snapshot saved',
          source: 'VERSION_MANAGER',
        },
      });

      return NextResponse.json({ success: true, version: newVersion });
    }

    if (action === 'RESTORE' && versionId) {
      const version = await prisma.floorVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) {
        return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
      }

      // Restoring starts by deleting the current floor, so refuse snapshots that can't rebuild it
      const snapshot = readRestorableSnapshot(version.snapshotJson);
      if (!snapshot) {
        return NextResponse.json(
          {
            success: false,
            error: `"${version.versionName}" has no saved layout data, so it can't be restored. Nothing was changed.`,
          },
          { status: 422 }
        );
      }

      const backupName = 'Auto-backup before restore';

      await prisma.$transaction(async (tx) => {
        // Keep the current state as a snapshot so this restore can be undone
        await tx.floorVersion.create({
          data: {
            floorId: version.floorId,
            versionName: backupName,
            description: `Saved automatically before restoring "${version.versionName}"`,
            snapshotJson: JSON.stringify(await captureFloorSnapshot(tx, version.floorId)),
            createdBy: user,
          },
        });

        // Clear current objects, seats, allocations, blocks for this floor
        await tx.seatBlock.deleteMany({
          where: { seat: { floorId: version.floorId } },
        });
        await tx.seatAllocation.deleteMany({
          where: { seat: { floorId: version.floorId } },
        });
        await tx.seat.deleteMany({
          where: { floorId: version.floorId },
        });
        await tx.floorObject.deleteMany({
          where: { floorId: version.floorId },
        });

        // Recreate objects
        if (snapshot.objects && snapshot.objects.length > 0) {
          for (const obj of snapshot.objects) {
            await tx.floorObject.create({
              data: {
                id: obj.id,
                floorId: obj.floorId,
                type: obj.type,
                subType: obj.subType,
                layer: obj.layer,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation || 0,
                geometry: obj.geometry,
                properties: obj.properties,
                locked: obj.locked || false,
                hidden: obj.hidden || false,
              },
            });
          }
        }

        // Recreate seats, allocations, and blocks
        if (snapshot.seats && snapshot.seats.length > 0) {
          for (const s of snapshot.seats) {
            const seat = await tx.seat.create({
              data: {
                id: s.id,
                seatId: s.seatId,
                floorId: s.floorId,
                zoneId: s.zoneId,
                floorObjectId: s.floorObjectId,
                bayCode: s.bayCode,
                seatType: s.seatType,
                x: s.x,
                y: s.y,
                rotation: s.rotation || 0,
              },
            });

            if (s.allocations && s.allocations.length > 0) {
              for (const a of s.allocations) {
                await tx.seatAllocation.create({
                  data: {
                    id: a.id,
                    seatId: seat.id,
                    programId: a.programId,
                    status: a.status,
                    shift: a.shift,
                    employeeName: a.employeeName,
                    employeeId: a.employeeId,
                    effectiveDate: new Date(a.effectiveDate),
                    endDate: a.endDate ? new Date(a.endDate) : null,
                    notes: a.notes,
                  },
                });
              }
            }

            if (s.blocks && s.blocks.length > 0) {
              for (const b of s.blocks) {
                await tx.seatBlock.create({
                  data: {
                    id: b.id,
                    seatId: seat.id,
                    reason: b.reason,
                    startDate: new Date(b.startDate),
                    endDate: b.endDate ? new Date(b.endDate) : null,
                    notes: b.notes,
                    active: b.active,
                  },
                });
              }
            }
          }
        }

        await tx.auditLog.create({
          data: {
            action: 'RESTORE_FLOOR_VERSION',
            entityType: 'FLOOR_VERSION',
            entityId: version.id,
            user,
            newValue: JSON.stringify({ restoredVersion: version.versionName }),
            reason: `Restored to version ${version.versionName}`,
            source: 'VERSION_MANAGER',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Restored "${version.versionName}". The previous state was saved as the snapshot "${backupName}".`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed version action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
