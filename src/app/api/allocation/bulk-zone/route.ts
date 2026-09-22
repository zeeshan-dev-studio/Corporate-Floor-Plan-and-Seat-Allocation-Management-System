import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seatIds,
      zoneId,
      user = 'Facility Planner',
      userRole = 'Administrator',
    } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No seats provided' },
        { status: 400 }
      );
    }

    if (!zoneId) {
      return NextResponse.json(
        { success: false, error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return NextResponse.json(
        { success: false, error: 'Zone not found' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { zoneId: zone.id },
      });

      await tx.auditLog.create({
        data: {
          action: 'BULK_CHANGE_ZONE',
          entityType: 'SEAT',
          user,
          userRole,
          newValue: JSON.stringify({ zone: zone.name, zoneCode: zone.code, count: seatIds.length }),
          reason: `Re-zoned ${seatIds.length} seats to ${zone.name}`,
          source: 'BULK_ACTION',
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: seatIds.length,
      zone: zone.name,
      message: `Successfully moved ${seatIds.length} seats to ${zone.name}`,
    });
  } catch (error: any) {
    console.error('Failed to change zone:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update zone' },
      { status: 500 }
    );
  }
}
