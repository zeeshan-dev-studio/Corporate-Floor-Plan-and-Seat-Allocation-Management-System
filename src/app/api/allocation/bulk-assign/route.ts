import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seatIds,
      programId,
      effectiveDate,
      shift = '09:00 - 18:00',
      user = 'Facility Planner',
      userRole = 'Administrator',
      reason = 'Program Capacity Allocation',
    } = body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No seats provided' },
        { status: 400 }
      );
    }

    if (!programId) {
      return NextResponse.json(
        { success: false, error: 'Program ID is required' },
        { status: 400 }
      );
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
    });

    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Selected program does not exist' },
        { status: 404 }
      );
    }

    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    // Fetch existing active allocations for audit tracking
    const existingAllocations = await prisma.seatAllocation.findMany({
      where: {
        seatId: { in: seatIds },
      },
      include: {
        program: true,
        seat: true,
      },
    });

    const prevSummary: Record<string, number> = {};
    for (const alloc of existingAllocations) {
      const pName = alloc.program?.name || 'Unallocated';
      prevSummary[pName] = (prevSummary[pName] || 0) + 1;
    }

    // Prisma transaction: Delete existing active allocations for these seats, then create new ones
    await prisma.$transaction(async (tx) => {
      // Remove current allocations for these seats
      await tx.seatAllocation.deleteMany({
        where: { seatId: { in: seatIds } },
      });

      // Insert new allocations
      const newAllocs = seatIds.map((sId: string) => ({
        seatId: sId,
        programId: program.id,
        status: 'ALLOCATED',
        shift: shift,
        effectiveDate: effDate,
      }));

      // In SQLite, createMany is supported in Prisma
      await tx.seatAllocation.createMany({
        data: newAllocs,
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'BULK_ASSIGN_PROGRAM',
          entityType: 'PROGRAM',
          entityId: program.id,
          user: user,
          userRole: userRole,
          prevValue: JSON.stringify(prevSummary),
          newValue: JSON.stringify({
            program: program.name,
            programCode: program.code,
            seatsCount: seatIds.length,
            effectiveDate: effDate.toISOString(),
            shift,
          }),
          reason: reason,
          source: 'BULK_ACTION',
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: seatIds.length,
      program: program.name,
      message: `Successfully allocated ${seatIds.length} seats to ${program.name}`,
    });
  } catch (error: any) {
    console.error('Failed to bulk assign program:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bulk assign seats' },
      { status: 500 }
    );
  }
}
