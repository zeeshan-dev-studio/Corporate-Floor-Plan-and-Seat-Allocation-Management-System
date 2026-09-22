import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        floors: {
          include: {
            _count: {
              select: {
                seats: true,
                objects: true,
                zones: true,
              },
            },
          },
          orderBy: {
            floorNumber: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ success: true, buildings });
  } catch (error: any) {
    console.error('Failed to fetch buildings and floors:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch floors' },
      { status: 500 }
    );
  }
}
