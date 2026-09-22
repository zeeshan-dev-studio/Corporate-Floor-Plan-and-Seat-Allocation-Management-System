import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seatIds,
      user = 'Facility Planner',
      userRole = 'Administrator',
      reason = 'Bulk De-allocation / Re-planning',
    } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No seats provided' },
        { status: 400 }
      );
    }

    // Fetch existing active allocations for audit tracking
    const existingAllocations = await prisma.seatAllocation.findMany({
      where: {
        seatId: { in: seatIds },
      },
      include: {
        program: true,
      },
    });

    const prevSummary: Record<string, number> = {};
    for (const alloc of existingAllocations) {
      const pName = alloc.program?.name || 'Unallocated';
      prevSummary[pName] = (prevSummary[pName] || 0) + 1;
    }

    // Transaction to remove allocations without touching physical seats
    await prisma.$transaction(async (tx) => {
      const deleteResult = await tx.seatAllocation.deleteMany({
        where: { seatId: { in: seatIds } },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'BULK_REMOVE_ALLOCATION',
          entityType: 'SEAT',
          user: user,
          userRole: userRole,
          prevValue: JSON.stringify(prevSummary),
          newValue: JSON.stringify({ status: 'UNALLOCATED', seatsCount: deleteResult.count }),
          reason: reason,
          source: 'BULK_ACTION',
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: seatIds.length,
      message: `Successfully removed allocations from ${seatIds.length} seats. Physical seats remain intact.`,
    });
  } catch (error: any) {
    console.error('Failed to remove allocations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove allocations' },
      { status: 500 }
    );
  }
}
