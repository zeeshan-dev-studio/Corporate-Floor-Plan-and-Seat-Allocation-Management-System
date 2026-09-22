import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seatIds,
      user = 'Facility Manager',
      userRole = 'Facility Manager',
      reason = 'Unblocked / Restored to service',
    } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No seats provided' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.seatBlock.deleteMany({
        where: { seatId: { in: seatIds } },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'BULK_UNBLOCK_SEATS',
          entityType: 'SEAT_BLOCK',
          user: user,
          userRole: userRole,
          prevValue: JSON.stringify({ unblockedCount: result.count }),
          newValue: JSON.stringify({ active: false, unblockedCount: result.count }),
          reason: reason,
          source: 'BULK_ACTION',
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: seatIds.length,
      message: `Successfully unblocked ${seatIds.length} seats`,
    });
  } catch (error: any) {
    console.error('Failed to unblock seats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unblock seats' },
      { status: 500 }
    );
  }
}
