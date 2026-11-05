import ExcelJS from 'exceljs';
import { SeatDTO, ProgramDTO, FloorDTO, AuditLogDTO, ZoneDTO } from '@/types/floorplan';

export async function generateEnterpriseExcelWorkbook({
  buildingName,
  floor,
  seats,
  programs,
  zones = [],
  auditLogs = [],
  includeSensitiveEmployeeData = true,
}: {
  buildingName: string;
  floor: FloorDTO;
  seats: SeatDTO[];
  programs: ProgramDTO[];
  zones?: ZoneDTO[];
  auditLogs?: AuditLogDTO[];
  includeSensitiveEmployeeData?: boolean;
}): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Corporate Floor Plan & Seat Allocation System';
  workbook.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
  };

  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  // ==========================================
  // SHEET 1: SEAT MASTER
  // ==========================================
  const seatSheet = workbook.addWorksheet('Seat Master', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  seatSheet.columns = [
    { header: 'Seat ID', key: 'seatId', width: 18 },
    { header: 'Building', key: 'building', width: 22 },
    { header: 'Floor', key: 'floor', width: 12 },
    { header: 'Zone', key: 'zone', width: 15 },
    { header: 'Workstation / Bay', key: 'bayCode', width: 18 },
    { header: 'Seat Type', key: 'seatType', width: 15 },
    { header: 'Program', key: 'program', width: 20 },
    { header: 'Allocation Status', key: 'status', width: 18 },
    { header: 'Blocked?', key: 'isBlocked', width: 12 },
    { header: 'Block Reason', key: 'blockReason', width: 20 },
    { header: 'Shift', key: 'shift', width: 18 },
    { header: 'Employee Name', key: 'employee', width: 22 },
    { header: 'Allocation Date', key: 'allocDate', width: 16 },
    { header: 'Block Notes', key: 'blockNotes', width: 28 },
  ];

  seatSheet.getRow(1).font = headerFont;
  seatSheet.getRow(1).fill = headerFill;
  seatSheet.getRow(1).height = 26;

  seats.forEach((seat, index) => {
    const row = seatSheet.addRow({
      seatId: seat.seatId,
      building: buildingName,
      floor: floor.name,
      zone: zones.find((z) => z.id === seat.zoneId)?.name || 'Open',
      bayCode: seat.bayCode || 'Individual',
      seatType: seat.seatType.toUpperCase(),
      program: seat.programName || 'Unallocated',
      status: seat.allocationStatus,
      isBlocked: seat.isBlocked ? 'YES' : 'NO',
      blockReason: seat.blockReason || '-',
      shift: seat.shift || '-',
      employee: includeSensitiveEmployeeData ? seat.employeeName || '-' : '[PROTECTED]',
      allocDate: seat.effectiveDate ? seat.effectiveDate.split('T')[0] : '-',
      blockNotes: seat.blockNotes || '-',
    });

    if (index % 2 === 1) {
      row.fill = zebraFill;
    }

    // Status coloring
    const statusCell = row.getCell('status');
    if (seat.allocationStatus === 'ALLOCATED') {
      statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    } else if (seat.isBlocked) {
      statusCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FF64748B' } };
    }
  });

  // ==========================================
  // SHEET 2: PROGRAM SUMMARY
  // ==========================================
  const progSheet = workbook.addWorksheet('Program Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  progSheet.columns = [
    { header: 'Program', key: 'name', width: 24 },
    { header: 'Code', key: 'code', width: 12 },
    { header: 'Required Capacity', key: 'required', width: 18 },
    { header: 'Allocated Seats', key: 'allocated', width: 16 },
    { header: 'Blocked Seats', key: 'blocked', width: 15 },
    { header: 'Net Usable Seats', key: 'netUsable', width: 16 },
    { header: 'Available Seats', key: 'available', width: 16 },
    { header: 'Shortage / Surplus', key: 'shortageSurplus', width: 18 },
    { header: 'Utilization %', key: 'utilization', width: 15 },
  ];

  progSheet.getRow(1).font = headerFont;
  progSheet.getRow(1).fill = headerFill;
  progSheet.getRow(1).height = 26;

  programs.forEach((prog, index) => {
    const row = progSheet.addRow({
      name: prog.name,
      code: prog.code,
      required: prog.requiredCapacity,
      allocated: prog.allocatedCount,
      blocked: prog.blockedCount,
      netUsable: prog.netUsable,
      available: prog.availableCount,
      shortageSurplus: prog.shortageSurplus,
      utilization: prog.utilization / 100,
    });
    // Real numbers (sortable, summable) shown with friendly formats
    row.getCell('shortageSurplus').numFmt = '+0;-0;0';
    row.getCell('utilization').numFmt = '0%';

    if (index % 2 === 1) row.fill = zebraFill;

    const diffCell = row.getCell('shortageSurplus');
    if (prog.shortageSurplus < 0) {
      diffCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    } else {
      diffCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    }
  });

  // ==========================================
  // SHEET 3: FLOOR SUMMARY
  // ==========================================
  const floorSheet = workbook.addWorksheet('Floor Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  floorSheet.columns = [
    { header: 'Building', key: 'building', width: 25 },
    { header: 'Floor Name', key: 'floorName', width: 16 },
    { header: 'Floor #', key: 'floorNumber', width: 10 },
    { header: 'Total Area (Sq Ft)', key: 'totalArea', width: 20 },
    { header: 'Total Seats', key: 'totalSeats', width: 15 },
    { header: 'Allocated Seats', key: 'allocatedSeats', width: 16 },
    { header: 'Vacant Seats', key: 'vacantSeats', width: 15 },
    { header: 'Blocked Seats', key: 'blockedSeats', width: 15 },
    { header: 'Utilization %', key: 'utilization', width: 15 },
  ];

  floorSheet.getRow(1).font = headerFont;
  floorSheet.getRow(1).fill = headerFill;
  floorSheet.getRow(1).height = 26;

  const floorRow = floorSheet.addRow({
    building: buildingName,
    floorName: floor.name,
    floorNumber: floor.floorNumber,
    totalArea: floor.totalArea,
    totalSeats: floor.totalSeats,
    allocatedSeats: floor.allocatedSeats,
    vacantSeats: floor.vacantSeats,
    blockedSeats: floor.blockedSeats,
    utilization: (floor.utilization || 0) / 100,
  });
  floorRow.getCell('totalArea').numFmt = '#,##0';
  floorRow.getCell('utilization').numFmt = '0%';

  // ==========================================
  // SHEET 4: ALLOCATION HISTORY
  // ==========================================
  const historySheet = workbook.addWorksheet('Allocation History', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  historySheet.columns = [
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Action', key: 'action', width: 25 },
    { header: 'Entity', key: 'entityType', width: 16 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'User Role', key: 'userRole', width: 18 },
    { header: 'Reason', key: 'reason', width: 30 },
    { header: 'Source', key: 'source', width: 15 },
  ];

  historySheet.getRow(1).font = headerFont;
  historySheet.getRow(1).fill = headerFill;
  historySheet.getRow(1).height = 26;

  auditLogs.forEach((log, index) => {
    const row = historySheet.addRow({
      timestamp: log.timestamp ? log.timestamp.replace('T', ' ').split('.')[0] : '-',
      action: log.action,
      entityType: log.entityType,
      user: log.user,
      userRole: log.userRole,
      reason: log.reason || '-',
      source: log.source,
    });
    if (index % 2 === 1) row.fill = zebraFill;
  });

  // ==========================================
  // SHEET 5: BLOCKED SEATS
  // ==========================================
  const blockedSheet = workbook.addWorksheet('Blocked Seats', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  blockedSheet.columns = [
    { header: 'Seat ID', key: 'seatId', width: 18 },
    { header: 'Program', key: 'program', width: 20 },
    { header: 'Block Reason', key: 'reason', width: 22 },
    { header: 'Start Date', key: 'startDate', width: 16 },
    { header: 'End Date', key: 'endDate', width: 16 },
    { header: 'Notes', key: 'notes', width: 35 },
  ];

  blockedSheet.getRow(1).font = headerFont;
  blockedSheet.getRow(1).fill = headerFill;
  blockedSheet.getRow(1).height = 26;

  const blockedSeatsList = seats.filter((s) => s.isBlocked);
  blockedSeatsList.forEach((s, idx) => {
    const row = blockedSheet.addRow({
      seatId: s.seatId,
      program: s.programName || 'Unallocated',
      reason: s.blockReason || 'General',
      startDate: s.blockStartDate ? s.blockStartDate.split('T')[0] : '-',
      endDate: s.blockEndDate ? s.blockEndDate.split('T')[0] : '-',
      notes: s.blockNotes || '-',
    });
    if (idx % 2 === 1) row.fill = zebraFill;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
