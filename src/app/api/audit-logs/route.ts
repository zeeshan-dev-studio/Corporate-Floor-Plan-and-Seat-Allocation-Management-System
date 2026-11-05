import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsedLimit = parseInt(searchParams.get('limit') || '50', 10);
    // Bad or huge values fall back to sane bounds instead of failing the query
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50;
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const search = searchParams.get('search');

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (search) {
      where.OR = [
        { user: { contains: search } },
        { reason: { contains: search } },
        { action: { contains: search } },
        { seatId: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const parsedLogs = logs.map((log) => {
      let prev = null;
      let next = null;
      try {
        if (log.prevValue) prev = JSON.parse(log.prevValue);
      } catch (e) {}
      try {
        if (log.newValue) next = JSON.parse(log.newValue);
      } catch (e) {}

      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        seatId: log.seatId,
        user: log.user,
        userRole: log.userRole,
        prevValue: prev,
        newValue: next,
        reason: log.reason,
        source: log.source,
        timestamp: log.timestamp.toISOString(),
      };
    });

    return NextResponse.json({ success: true, logs: parsedLogs });
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
