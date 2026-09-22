import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, object, objects, floorId, user = 'Facility Planner', userRole = 'Administrator' } = body;

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
      // Upsert/update objects in bulk
      await prisma.$transaction(async (tx) => {
        for (const obj of objects) {
          if (obj.id.startsWith('temp-')) {
            await tx.floorObject.create({
              data: {
                floorId,
                type: obj.type,
                subType: obj.subType,
                layer: obj.layer,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation || 0,
                geometry: JSON.stringify(obj.geometry || {}),
                properties: JSON.stringify(obj.properties || {}),
                locked: obj.locked || false,
                hidden: obj.hidden || false,
              },
            });
          } else {
            await tx.floorObject.update({
              where: { id: obj.id },
              data: {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation || 0,
                geometry: JSON.stringify(obj.geometry || {}),
                properties: JSON.stringify(obj.properties || {}),
                locked: obj.locked || false,
                hidden: obj.hidden || false,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            action: 'BATCH_SAVE_FLOOR_OBJECTS',
            entityType: 'FLOOR',
            entityId: floorId,
            user,
            userRole,
            newValue: JSON.stringify({ objectCount: objects.length }),
            reason: 'Floor layout saved',
            source: 'EDITOR',
          },
        });
      });

      return NextResponse.json({ success: true, count: objects.length });
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
