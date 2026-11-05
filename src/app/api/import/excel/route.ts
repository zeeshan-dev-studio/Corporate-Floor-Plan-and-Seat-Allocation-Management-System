import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, floorId, rows, user = 'Administrator', userRole = 'Administrator' } = body;

    // The preview step sends the sheet's rows; the commit step sends validRows instead
    if (action === 'VALIDATE' && (!rows || !Array.isArray(rows))) {
      return NextResponse.json({ success: false, error: 'Rows array required' }, { status: 400 });
    }

    // Fetch all existing seats for this floor
    const existingSeats = await prisma.seat.findMany({
      where: floorId ? { floorId } : {},
      include: {
        allocations: {
          include: { program: true },
        },
      },
    });

    const seatMap = new Map<string, typeof existingSeats[0]>();
    existingSeats.forEach((s) => seatMap.set(s.seatId.toUpperCase(), s));

    // Fetch all programs
    const programs = await prisma.program.findMany();
    const programMap = new Map<string, typeof programs[0]>();
    programs.forEach((p) => {
      programMap.set(p.name.toLowerCase(), p);
      programMap.set(p.code.toLowerCase(), p);
    });

    if (action === 'VALIDATE') {
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const seenSeatIds = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawSeatId = (row.seatId || row['Seat ID'] || '').toString().trim().toUpperCase();
        const rawProgram = (row.program || row['Program'] || '').toString().trim();
        const rawZone = (row.zone || row['Zone'] || '').toString().trim();
        const rawShift = (row.shift || row['Shift'] || '09:00 - 18:00').toString().trim();
        const rawEmployee = (row.employee || row['Employee'] || row['Employee Name'] || '').toString().trim();

        const errors: string[] = [];

        if (!rawSeatId) {
          errors.push('Missing Seat ID');
        } else if (seenSeatIds.has(rawSeatId)) {
          errors.push('Duplicate Seat ID in uploaded file');
        } else if (!seatMap.has(rawSeatId)) {
          errors.push(`Seat ID "${rawSeatId}" not found in current floor plan`);
        } else {
          seenSeatIds.add(rawSeatId);
        }

        // "Unallocated" (what the app's own export writes for vacant seats) clears the seat on purpose.
        // A blank cell is rejected so a gap in the sheet can never wipe an allocation.
        const isClear = rawProgram.toLowerCase() === 'unallocated';
        let matchedProgram = null;
        if (!rawProgram) {
          errors.push('Program is blank (enter a program, or "Unallocated" to clear the seat)');
        } else if (!isClear) {
          matchedProgram = programMap.get(rawProgram.toLowerCase());
          if (!matchedProgram) {
            errors.push(`Unknown Program "${rawProgram}"`);
          }
        }

        const seatRecord = rawSeatId ? seatMap.get(rawSeatId) : null;
        const currentProgram = seatRecord?.allocations?.[0]?.program?.name || 'Unallocated';
        const isConflict =
          matchedProgram &&
          currentProgram !== 'Unallocated' &&
          currentProgram.toLowerCase() !== matchedProgram.name.toLowerCase();

        const processedRow = {
          rowNumber: i + 2, // Excel 1-based header offset
          seatId: rawSeatId,
          dbSeatId: seatRecord?.id,
          program: matchedProgram ? matchedProgram.name : 'Unallocated',
          programId: matchedProgram?.id || null,
          currentProgram,
          isConflict,
          zone: rawZone,
          shift: rawShift,
          employee: rawEmployee,
          errors,
          isValid: errors.length === 0,
        };

        if (errors.length === 0) {
          validRows.push(processedRow);
        } else {
          invalidRows.push(processedRow);
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          total: rows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          conflictsCount: validRows.filter((r) => r.isConflict).length,
        },
        validRows,
        invalidRows,
      });
    }

    if (action === 'COMMIT') {
      const { validRows } = body;
      if (!validRows || !Array.isArray(validRows)) {
        return NextResponse.json({ success: false, error: 'validRows array required' }, { status: 400 });
      }

      let appliedCount = 0;
      let skippedCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const item of validRows) {
          // Never trust ids sent back by the browser: look the seat and program up again
          const seat = seatMap.get(String(item.seatId || '').trim().toUpperCase());
          const programName = String(item.program || '').trim();
          const clears = programName.toLowerCase() === 'unallocated';
          const program = !programName || clears ? null : programMap.get(programName.toLowerCase());
          if (!seat || (!clears && !program)) {
            skippedCount++;
            continue;
          }

          // Delete current allocation
          await tx.seatAllocation.deleteMany({
            where: { seatId: seat.id },
          });

          // If program assigned, create new allocation
          if (program) {
            await tx.seatAllocation.create({
              data: {
                seatId: seat.id,
                programId: program.id,
                status: 'ALLOCATED',
                shift: item.shift || '09:00 - 18:00',
                employeeName: item.employee || null,
                effectiveDate: new Date(),
              },
            });
          }

          appliedCount++;
        }

        await tx.auditLog.create({
          data: {
            action: 'EXCEL_IMPORT',
            entityType: 'IMPORT',
            user,
            userRole,
            newValue: JSON.stringify({
              importedRows: appliedCount,
              skippedRows: skippedCount,
              timestamp: new Date().toISOString(),
            }),
            reason: `Batch Excel seat allocation import (${appliedCount} records)`,
            source: 'EXCEL_IMPORT',
          },
        });
      });

      return NextResponse.json({
        success: true,
        appliedCount,
        skippedCount,
        message:
          `Successfully imported and updated ${appliedCount} seats from Excel.` +
          (skippedCount ? ` ${skippedCount} rows were skipped because they no longer matched a seat or program.` : ''),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to process Excel import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Import operation failed' },
      { status: 500 }
    );
  }
}
