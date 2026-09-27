import type { Prisma } from '@prisma/client';

/** A parsed FloorVersion.snapshotJson that holds everything needed to rebuild the floor. */
export interface StoredFloorSnapshot {
  objects: any[];
  seats: any[];
}

/**
 * Full copy of a floor's layout and seat data (objects, seats, allocations and blocks),
 * stored as JSON in FloorVersion.snapshotJson and read back by the version restore.
 */
export async function captureFloorSnapshot(db: Prisma.TransactionClient, floorId: string) {
  const floor = await db.floor.findUnique({ where: { id: floorId } });
  const objects = await db.floorObject.findMany({ where: { floorId } });
  const seats = await db.seat.findMany({
    where: { floorId },
    include: { allocations: true, blocks: true },
  });
  return { floor, objects, seats, snapshotDate: new Date().toISOString() };
}

/**
 * Parses FloorVersion.snapshotJson. Returns null unless it holds the objects and seats needed
 * to rebuild the floor (early snapshots, like the original seed baseline, only hold totals).
 */
export function readRestorableSnapshot(json: string): StoredFloorSnapshot | null {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed?.objects) && Array.isArray(parsed?.seats) ? parsed : null;
  } catch (e) {
    return null;
  }
}
