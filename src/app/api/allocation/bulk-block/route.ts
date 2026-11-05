import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seatIds,
      reason = 'Maintenance',
      startDate,
      endDate,
      notes,
      user = 'Facility Manager',
      userRole = 'Facility Manager',
    } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No seats provided' },
        { status: 400 }
      );
    }

    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = endDate ? new Date(endDate) : null;

    if (Number.isNaN(sDate.getTime()) || (eDate && Number.isNaN(eDate.getTime()))) {
      return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
    }
    if (eDate && eDate < sDate) {
      return NextResponse.json({ success: false, error: 'The end date cannot be before the start date' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // First deactivate any previous blocks for these seats
      await tx.seatBlock.deleteMany({
        where: { seatId: { in: seatIds } },
      });

      // Insert new blocks
      const blockEntries = seatIds.map((sId: string) => ({
        seatId: sId,
        reason: reason,
        startDate: sDate,
        endDate: eDate,
        notes: notes || null,
        active: true,
      }));

      await tx.seatBlock.createMany({
        data: blockEntries,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'BULK_BLOCK_SEATS',
          entityType: 'SEAT_BLOCK',
          user: user,
          userRole: userRole,
          prevValue: JSON.stringify({ activeBlocksCleared: true }),
          newValue: JSON.stringify({
            count: seatIds.length,
            reason,
            startDate: sDate.toISOString(),
            endDate: eDate ? eDate.toISOString() : null,
            notes,
          }),
          reason: `Block applied: ${reason}`,
          source: 'BULK_ACTION',
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: seatIds.length,
      message: `Successfully blocked ${seatIds.length} seats for ${reason}`,
    });
  } catch (error: any) {
    console.error('Failed to bulk block seats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to block seats' },
      { status: 500 }
    );
  }
}
