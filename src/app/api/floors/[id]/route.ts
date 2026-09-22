import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FloorObjectDTO, SeatDTO, ProgramDTO, ZoneDTO } from '@/types/floorplan';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const floorId = params.id;

    // Optional asOfDate query parameter for date-aware capacity
    const { searchParams } = new URL(req.url);
    const asOfDateStr = searchParams.get('asOfDate');
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: {
        building: true,
        zones: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!floor) {
      return NextResponse.json(
        { success: false, error: 'Floor not found' },
        { status: 404 }
      );
    }

    // Fetch programs
    const rawPrograms = await prisma.program.findMany({
      orderBy: { name: 'asc' },
    });

    // Fetch floor objects
    const rawObjects = await prisma.floorObject.findMany({
      where: { floorId },
    });

    // Fetch seats with allocations and blocks
    const rawSeats = await prisma.seat.findMany({
      where: { floorId },
      include: {
        allocations: {
          include: {
            program: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        blocks: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Process seats with date-aware logic
    const seats: SeatDTO[] = rawSeats.map((s) => {
      // Find active allocation as of asOfDate
      const activeAlloc = s.allocations.find((a) => {
        const start = a.effectiveDate ? new Date(a.effectiveDate) : null;
        const end = a.endDate ? new Date(a.endDate) : null;
        if (start && start > asOfDate) return false;
        if (end && end < asOfDate) return false;
        return true;
      });

      // Find active block as of asOfDate
      const activeBlock = s.blocks.find((b) => {
        if (!b.active) return false;
        const start = b.startDate ? new Date(b.startDate) : null;
        const end = b.endDate ? new Date(b.endDate) : null;
        if (start && start > asOfDate) return false;
        if (end && end < asOfDate) return false;
        return true;
      });

      let status = 'UNALLOCATED';
      if (activeAlloc) {
        status = activeBlock ? 'BLOCKED' : activeAlloc.status || 'ALLOCATED';
      } else if (activeBlock) {
        status = 'BLOCKED';
      }

      return {
        id: s.id,
        seatId: s.seatId,
        floorId: s.floorId,
        zoneId: s.zoneId,
        floorObjectId: s.floorObjectId,
        bayCode: s.bayCode,
        seatType: s.seatType as any,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        programId: activeAlloc?.programId || null,
        programName: activeAlloc?.program?.name || null,
        programCode: activeAlloc?.program?.code || null,
        programColor: activeAlloc?.program?.color || null,
        allocationStatus: status as any,
        shift: activeAlloc?.shift || null,
        employeeName: activeAlloc?.employeeName || null,
        employeeId: activeAlloc?.employeeId || null,
        effectiveDate: activeAlloc?.effectiveDate?.toISOString() || null,
        endDate: activeAlloc?.endDate?.toISOString() || null,
        isBlocked: !!activeBlock,
        blockReason: activeBlock?.reason || null,
        blockStartDate: activeBlock?.startDate?.toISOString() || null,
        blockEndDate: activeBlock?.endDate?.toISOString() || null,
        blockNotes: activeBlock?.notes || null,
      };
    });

    // Compute program metrics
    const programs: ProgramDTO[] = rawPrograms.map((p) => {
      const progSeats = seats.filter((s) => s.programId === p.id);
      const allocatedCount = progSeats.length;
      const blockedCount = progSeats.filter((s) => s.isBlocked).length;
      const netUsable = allocatedCount - blockedCount;
      const shortageSurplus = netUsable - p.requiredCapacity;
      const utilization =
        p.requiredCapacity > 0
          ? Math.round((netUsable / p.requiredCapacity) * 100)
          : 0;

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        color: p.color,
        requiredCapacity: p.requiredCapacity,
        contactPerson: p.contactPerson,
        notes: p.notes,
        allocatedCount,
        blockedCount,
        availableCount: Math.max(0, p.requiredCapacity - netUsable),
        netUsable,
        shortageSurplus,
        utilization,
      };
    });

    // Parse objects
    const objects: FloorObjectDTO[] = rawObjects.map((o) => {
      let geometry = {};
      let properties = {};
      try {
        geometry = JSON.parse(o.geometry);
      } catch (e) {}
      try {
        properties = JSON.parse(o.properties);
      } catch (e) {}

      return {
        id: o.id,
        floorId: o.floorId,
        type: o.type,
        subType: o.subType,
        layer: o.layer as any,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        rotation: o.rotation,
        geometry,
        properties,
        locked: o.locked,
        hidden: o.hidden,
      };
    });

    // Process zones
    const zones: ZoneDTO[] = floor.zones.map((z) => {
      let polygon = null;
      try {
        if (z.polygon) polygon = JSON.parse(z.polygon);
      } catch (e) {}
      const zoneSeats = seats.filter((s) => s.zoneId === z.id);
      return {
        id: z.id,
        floorId: z.floorId,
        code: z.code,
        name: z.name,
        color: z.color,
        polygon,
        totalSeats: zoneSeats.length,
        allocatedSeats: zoneSeats.filter((s) => s.programId).length,
      };
    });

    const totalSeats = seats.length;
    const allocatedSeats = seats.filter((s) => s.programId).length;
    const blockedSeats = seats.filter((s) => s.isBlocked).length;
    const vacantSeats = seats.filter((s) => !s.programId && !s.isBlocked).length;
    const netUsable = totalSeats - blockedSeats;
    const utilization =
      netUsable > 0 ? Math.round((allocatedSeats / netUsable) * 100) : 0;

    return NextResponse.json({
      success: true,
      building: {
        id: floor.building.id,
        name: floor.building.name,
        code: floor.building.code,
        campus: floor.building.campus,
      },
      floor: {
        id: floor.id,
        buildingId: floor.buildingId,
        name: floor.name,
        floorNumber: floor.floorNumber,
        totalArea: floor.totalArea,
        width: floor.width,
        height: floor.height,
        scale: floor.scale,
        gridSize: floor.gridSize,
        buildingName: floor.building.name,
        buildingCode: floor.building.code,
        campus: floor.building.campus,
        totalSeats,
        allocatedSeats,
        vacantSeats,
        blockedSeats,
        utilization,
      },
      zones,
      programs,
      objects,
      seats,
      versions: floor.versions.map((v) => ({
        id: v.id,
        floorId: v.floorId,
        versionName: v.versionName,
        description: v.description,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Failed to fetch floor dataset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
