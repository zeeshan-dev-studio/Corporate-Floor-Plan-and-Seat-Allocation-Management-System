import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      object,
      objects,
      deletedObjectIds,
      floorId,
      user = 'Facility Planner',
      userRole = 'Administrator',
    } = body;

    if (action === 'CREATE' && object) {
      const created = await prisma.floorObject.create({
        data: {
          floorId: object.floorId,
          type: object.type,
          subType: object.subType,
          layer: object.layer,
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          rotation: object.rotation || 0,
          geometry: JSON.stringify(object.geometry || {}),
          properties: JSON.stringify(object.properties || {}),
          locked: object.locked || false,
          hidden: object.hidden || false,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'CREATE_FLOOR_OBJECT',
          entityType: 'FLOOR_OBJECT',
          entityId: created.id,
          user,
          userRole,
          newValue: JSON.stringify({ type: object.type, label: object.properties?.label }),
          reason: 'Added object to floor plan',
          source: 'EDITOR',
        },
      });

      return NextResponse.json({ success: true, object: created });
    }

    if (action === 'UPDATE' && object) {
      const updated = await prisma.floorObject.update({
        where: { id: object.id },
        data: {
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          rotation: object.rotation,
          geometry: JSON.stringify(object.geometry || {}),
          properties: JSON.stringify(object.properties || {}),
          locked: object.locked,
          hidden: object.hidden,
        },
      });

      return NextResponse.json({ success: true, object: updated });
    }

    if (action === 'DELETE' && object?.id) {
      await prisma.floorObject.delete({
        where: { id: object.id },
      });

      await prisma.auditLog.create({
        data: {
          action: 'DELETE_FLOOR_OBJECT',
          entityType: 'FLOOR_OBJECT',
          entityId: object.id,
          user,
          userRole,
          prevValue: JSON.stringify({ type: object.type, label: object.properties?.label }),
          reason: 'Removed object from floor plan',
          source: 'EDITOR',
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'BATCH_SAVE' && Array.isArray(objects) && floorId) {
      const idsToDelete: string[] = Array.isArray(deletedObjectIds) ? deletedObjectIds : [];
      const created: { tempId: string; id: string }[] = [];
      const createdSeats: { tempId: string; id: string }[] = [];
      const seatsIn = body.seats || {};
      const seatsToCreate: any[] = Array.isArray(seatsIn.created) ? seatsIn.created : [];
      const seatsToUpdate: any[] = Array.isArray(seatsIn.updated) ? seatsIn.updated : [];
      const seatsToDelete: string[] = Array.isArray(seatsIn.deletedIds) ? seatsIn.deletedIds : [];
      let deletedCount = 0;

      const SEAT_TYPES = ['standard', 'hot_desk', 'team_lead', 'ops_manager', 'accessible'];
      for (const sd of [...seatsToCreate, ...seatsToUpdate]) {
        if (![sd.x, sd.y, sd.rotation].every((n) => Number.isFinite(n)) || !SEAT_TYPES.includes(sd.seatType)) {
          return NextResponse.json({ success: false, error: 'A seat has an invalid position or type.' }, { status: 400 });
        }
      }
      const newIds = seatsToCreate.map((sd) => String(sd.seatId || '').trim());
      if (newIds.some((id) => !id || id.length > 60) || new Set(newIds.map((id) => id.toUpperCase())).size !== newIds.length) {
        return NextResponse.json({ success: false, error: 'New seats need unique seat IDs.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Objects removed in the editor since the last save (scoped to this floor)
        if (idsToDelete.length > 0) {
          const result = await tx.floorObject.deleteMany({
            where: { floorId, id: { in: idsToDelete } },
          });
          deletedCount = result.count;
        }

        for (const obj of objects) {
          const data = {
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation || 0,
            geometry: JSON.stringify(obj.geometry || {}),
            properties: JSON.stringify(obj.properties || {}),
            locked: obj.locked || false,
            hidden: obj.hidden || false,
          };
          const identity = { floorId, type: obj.type, subType: obj.subType, layer: obj.layer };

          if (obj.id.startsWith('temp-')) {
            const row = await tx.floorObject.create({ data: { ...identity, ...data } });
            // The editor swaps its temporary id for this one, so the next save won't create it again
            created.push({ tempId: obj.id, id: row.id });
          } else {
            // Upsert: an object deleted by an earlier save and then brought back with undo is re-created
            await tx.floorObject.upsert({
              where: { id: obj.id },
              update: data,
              create: { id: obj.id, ...identity, ...data },
            });
          }
        }

        // Floor canvas size (feet are 10 units each)
        const size = body.floorSize;
        if (size && [size.width, size.height].every((n: number) => Number.isFinite(n) && n >= 200 && n <= 20000)) {
          await tx.floor.update({ where: { id: floorId }, data: { width: size.width, height: size.height } });
        }

        // Seats: removed, added and moved/re-typed
        const objectIdOf = (id: string | null) => {
          if (!id) return null;
          if (!id.startsWith('temp-')) return id;
          return created.find((c) => c.tempId === id)?.id ?? null;
        };
        if (seatsToDelete.length > 0) {
          await tx.seat.deleteMany({ where: { floorId, id: { in: seatsToDelete } } });
        }
        if (seatsToCreate.length > 0) {
          const clash = await tx.seat.findMany({
            where: { seatId: { in: newIds } },
            select: { seatId: true },
          });
          if (clash.length) {
            throw new Error(`Seat ID ${clash[0].seatId} already exists. Delete or rename the duplicate and save again.`);
          }
          const zones = await tx.zone.findMany({ where: { floorId }, select: { id: true } });
          const zoneIds = new Set(zones.map((z) => z.id));
          for (const sd of seatsToCreate) {
            const row = await tx.seat.create({
              data: {
                seatId: String(sd.seatId).trim(),
                floorId,
                zoneId: sd.zoneId && zoneIds.has(sd.zoneId) ? sd.zoneId : null,
                floorObjectId: objectIdOf(sd.floorObjectId),
                bayCode: sd.bayCode || null,
                seatType: sd.seatType,
                x: sd.x,
                y: sd.y,
                rotation: sd.rotation,
              },
            });
            createdSeats.push({ tempId: sd.id, id: row.id });
          }
        }
        for (const sd of seatsToUpdate) {
          await tx.seat.updateMany({
            where: { id: sd.id, floorId },
            data: {
              x: sd.x,
              y: sd.y,
              rotation: sd.rotation,
              seatType: sd.seatType,
              floorObjectId: objectIdOf(sd.floorObjectId),
              bayCode: sd.bayCode || null,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'BATCH_SAVE_FLOOR_OBJECTS',
            entityType: 'FLOOR',
            entityId: floorId,
            user,
            userRole,
            newValue: JSON.stringify({
              objectCount: objects.length,
              created: created.length,
              deleted: deletedCount,
              seatsAdded: createdSeats.length,
              seatsUpdated: seatsToUpdate.length,
              seatsRemoved: seatsToDelete.length,
            }),
            reason: 'Floor layout saved',
            source: 'EDITOR',
          },
        });
      }, { timeout: 60000, maxWait: 10000 });

      return NextResponse.json({
        success: true,
        count: objects.length,
        created,
        createdSeats,
        deleted: deletedCount,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to process object action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
