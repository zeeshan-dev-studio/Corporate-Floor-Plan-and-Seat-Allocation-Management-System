import { PrismaClient } from '@prisma/client';
import { captureFloorSnapshot } from '../src/lib/floorSnapshot';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning up existing data ---');
  await prisma.auditLog.deleteMany();
  await prisma.seatBlock.deleteMany();
  await prisma.seatAllocation.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.floorObject.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.floorVersion.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.program.deleteMany();
  await prisma.building.deleteMany();

  console.log('--- Creating Building & Campus ---');
  const building = await prisma.building.create({
    data: {
      name: 'Chennai Campus - Building F2',
      code: 'CHN-F2',
      campus: 'Chennai Campus',
    },
  });

  console.log('--- Creating Floor 3 ---');
  const floor = await prisma.floor.create({
    data: {
      buildingId: building.id,
      name: 'Floor 3',
      floorNumber: 3,
      totalArea: 35000.0,
      width: 2800.0,
      height: 1800.0,
      scale: 1.0,
      gridSize: 20,
    },
  });

  console.log('--- Creating Zones ---');
  const zoneA = await prisma.zone.create({
    data: {
      floorId: floor.id,
      code: 'A',
      name: 'Zone A - South Wing',
      color: '#3b82f6',
    },
  });

  const zoneB = await prisma.zone.create({
    data: {
      floorId: floor.id,
      code: 'B',
      name: 'Zone B - Central Core',
      color: '#10b981',
    },
  });

  const zoneC = await prisma.zone.create({
    data: {
      floorId: floor.id,
      code: 'C',
      name: 'Zone C - North Wing',
      color: '#a855f7',
    },
  });

  console.log('--- Creating Programs ---');
  const amazon = await prisma.program.create({
    data: {
      name: 'Amazon',
      code: 'AMZN',
      color: '#f97316', // Orange
      requiredCapacity: 250,
      contactPerson: 'Arun Kumar (Operations Director)',
      notes: 'Customer support and AWS cloud operations teams',
    },
  });

  const mcafee = await prisma.program.create({
    data: {
      name: 'McAfee',
      code: 'MCFE',
      color: '#ef4444', // Red
      requiredCapacity: 120,
      contactPerson: 'Sneha Rao (Global Security Lead)',
      notes: 'Cybersecurity incident response and SOC shift',
    },
  });

  const tmobile = await prisma.program.create({
    data: {
      name: 'T-Mobile',
      code: 'TMOB',
      color: '#ec4899', // Magenta
      requiredCapacity: 90,
      contactPerson: 'David Miller (Telecom Delivery)',
      notes: 'Network provisioning and billing support',
    },
  });

  const wayfair = await prisma.program.create({
    data: {
      name: 'Wayfair',
      code: 'WAYF',
      color: '#8b5cf6', // Purple
      requiredCapacity: 60,
      contactPerson: 'Kavita Patel (E-Commerce Lead)',
      notes: 'Catalog management and logistics coordination',
    },
  });

  const healthcare = await prisma.program.create({
    data: {
      name: 'Healthcare Global',
      code: 'HCG',
      color: '#06b6d4', // Cyan
      requiredCapacity: 40,
      contactPerson: 'Dr. Joseph Nair (Healthcare Ops)',
      notes: 'Clinical claims and telehealth scheduling',
    },
  });

  console.log('--- Creating Architectural Objects ---');
  // 1. Boundary External Walls (Layer: architecture)
  const floorBoundary = await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'wall',
      subType: 'perimeter',
      layer: 'architecture',
      x: 40,
      y: 40,
      width: 2720,
      height: 1720,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#475569',
        strokeWidth: 10,
        fill: 'none',
      }),
      properties: JSON.stringify({
        label: 'External Building Envelope',
        thickness: 200,
      }),
    },
  });

  // 2. Core Service Shaft & Elevator Bank (X: 1200, Y: 600, W: 400, H: 450)
  const coreLobby = await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'serviceCore',
      layer: 'architecture',
      x: 1200,
      y: 650,
      width: 400,
      height: 480,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#334155',
        strokeWidth: 8,
        fill: '#1e293b',
      }),
      properties: JSON.stringify({
        label: 'Central Core & Elevator Lobby',
        roomType: 'Utility/Core',
        areaSqFt: 3200,
      }),
    },
  });

  // 4 Elevators in Core
  for (let i = 0; i < 4; i++) {
    const elX = 1240 + (i % 2) * 180;
    const elY = 690 + Math.floor(i / 2) * 110;
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'facility',
        subType: 'elevator',
        layer: 'facilities',
        x: elX,
        y: elY,
        width: 140,
        height: 90,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#0f172a',
          stroke: '#64748b',
          components: [
            { type: 'rect', x: 10, y: 10, width: 120, height: 70, stroke: '#94a3b8' },
            { type: 'line', points: [{ x: 10, y: 10 }, { x: 130, y: 80 }], stroke: '#64748b' },
            { type: 'line', points: [{ x: 10, y: 80 }, { x: 130, y: 10 }], stroke: '#64748b' },
          ],
        }),
        properties: JSON.stringify({
          label: `Lift L-0${i + 1}`,
          facilityType: 'Elevator',
        }),
      },
    });
  }

  // Emergency Fire Stairs (2 locations)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'facility',
      subType: 'stairs',
      layer: 'safety',
      x: 1240,
      y: 930,
      width: 140,
      height: 160,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        fill: '#0f172a',
        stroke: '#ef4444',
      }),
      properties: JSON.stringify({
        label: 'Fire Exit Stairs North',
        safetyType: 'Emergency Exit',
      }),
    },
  });

  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'facility',
      subType: 'stairs',
      layer: 'safety',
      x: 1420,
      y: 930,
      width: 140,
      height: 160,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        fill: '#0f172a',
        stroke: '#ef4444',
      }),
      properties: JSON.stringify({
        label: 'Fire Exit Stairs South',
        safetyType: 'Emergency Exit',
      }),
    },
  });

  // 3. Executive Board Room (X: 100, Y: 80, W: 520, H: 380)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'boardroom',
      layer: 'rooms',
      x: 100,
      y: 80,
      width: 520,
      height: 380,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#3b82f6',
        strokeWidth: 4,
        fill: 'rgba(59, 130, 246, 0.05)',
      }),
      properties: JSON.stringify({
        label: 'Executive Boardroom (Olympus)',
        roomType: 'Board room',
        capacity: 22,
        areaSqFt: 1850,
      }),
    },
  });

  // Boardroom Table & Display
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'furniture',
      subType: 'boardroomTable',
      layer: 'furniture',
      x: 210,
      y: 180,
      width: 300,
      height: 140,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#854d0e',
        fill: '#713f12',
      }),
      properties: JSON.stringify({
        label: 'Boardroom Conference Table (20 Seats)',
        chairCount: 20,
      }),
    },
  });

  // Boardroom 98" AV Display & VC Camera
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'it',
      subType: 'displayScreen',
      layer: 'it',
      x: 110,
      y: 200,
      width: 20,
      height: 100,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        fill: '#38bdf8',
        stroke: '#0284c7',
      }),
      properties: JSON.stringify({
        label: '98" Dual 4K Presentation Display + VC Camera',
        itType: 'AV Screen',
      }),
    },
  });

  // 4. Theater / Auditorium (X: 100, Y: 1250, W: 680, H: 450)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'theater',
      layer: 'rooms',
      x: 100,
      y: 1250,
      width: 680,
      height: 450,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#8b5cf6',
        strokeWidth: 4,
        fill: 'rgba(139, 92, 246, 0.05)',
      }),
      properties: JSON.stringify({
        label: 'Main Auditorium & Townhall (Turing Hall)',
        roomType: 'Auditorium',
        capacity: 120,
        areaSqFt: 3500,
      }),
    },
  });

  // Auditorium Stage & Screen
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'furniture',
      subType: 'stage',
      layer: 'furniture',
      x: 130,
      y: 1380,
      width: 90,
      height: 200,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        fill: '#4338ca',
        stroke: '#6366f1',
      }),
      properties: JSON.stringify({
        label: 'Auditorium Presentation Stage & Podium',
      }),
    },
  });

  // 5. Training Rooms (2 adjacent rooms in South-East: X: 2150, Y: 1250)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'trainingRoom',
      layer: 'rooms',
      x: 2150,
      y: 1250,
      width: 550,
      height: 450,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#06b6d4',
        strokeWidth: 3,
        fill: 'rgba(6, 182, 212, 0.05)',
      }),
      properties: JSON.stringify({
        label: 'Global Training & Learning Center (Newton)',
        roomType: 'Training room',
        capacity: 36,
        areaSqFt: 2200,
      }),
    },
  });

  // 6. Cafeteria & Pantry (X: 2050, Y: 80, W: 650, H: 400)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'cafeteria',
      layer: 'rooms',
      x: 2050,
      y: 80,
      width: 650,
      height: 400,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#f59e0b',
        strokeWidth: 3,
        fill: 'rgba(245, 158, 11, 0.05)',
      }),
      properties: JSON.stringify({
        label: 'Oasis Cafeteria & Breakout Lounge',
        roomType: 'Cafeteria',
        capacity: 80,
        areaSqFt: 2900,
      }),
    },
  });

  // 7. Server Room / Datacenter (X: 1200, Y: 1250, W: 400, H: 450)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'serverRoom',
      layer: 'rooms',
      x: 1200,
      y: 1250,
      width: 400,
      height: 450,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#0ea5e9',
        strokeWidth: 4,
        fill: 'rgba(14, 165, 233, 0.06)',
      }),
      properties: JSON.stringify({
        label: 'MDF / Server Room & Telecom Core',
        roomType: 'Server room',
        capacity: 4,
        areaSqFt: 1800,
      }),
    },
  });

  // Server Racks in Server Room
  for (let r = 0; r < 6; r++) {
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'it',
        subType: 'serverRack',
        layer: 'it',
        x: 1240 + (r % 3) * 110,
        y: 1300 + Math.floor(r / 3) * 150,
        width: 80,
        height: 100,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#0284c7',
          stroke: '#38bdf8',
        }),
        properties: JSON.stringify({
          label: `42U Rack R-${r + 1}`,
          itType: 'Server Rack',
        }),
      },
    });
  }

  // 8. Meeting Cabins along the North Corridor (X: 700 to 1950, Y: 80)
  for (let c = 0; c < 5; c++) {
    const cabX = 700 + c * 240;
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'room',
        subType: 'meetingRoom',
        layer: 'rooms',
        x: cabX,
        y: 80,
        width: 220,
        height: 220,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          stroke: '#38bdf8',
          strokeWidth: 2,
          fill: 'rgba(56, 189, 248, 0.04)',
        }),
        properties: JSON.stringify({
          label: `Meeting Room M-${c + 1}`,
          roomType: 'Meeting room',
          capacity: 6,
          areaSqFt: 450,
        }),
      },
    });
  }

  // 9. Reception & Security Turnstiles at Main Entrance (X: 1200, Y: 80, W: 400, H: 450)
  await prisma.floorObject.create({
    data: {
      floorId: floor.id,
      type: 'room',
      subType: 'reception',
      layer: 'rooms',
      x: 1200,
      y: 80,
      width: 400,
      height: 480,
      rotation: 0,
      geometry: JSON.stringify({
        shape: 'rect',
        stroke: '#10b981',
        strokeWidth: 3,
        fill: 'rgba(16, 185, 129, 0.05)',
      }),
      properties: JSON.stringify({
        label: 'Main Executive Reception & Visitor Access',
        roomType: 'Reception',
        capacity: 30,
        areaSqFt: 2100,
      }),
    },
  });

  // Turnstiles in Reception
  for (let t = 0; t < 3; t++) {
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'door',
        subType: 'turnstile',
        layer: 'doors',
        x: 1280 + t * 75,
        y: 380,
        width: 50,
        height: 40,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#047857',
          stroke: '#34d399',
        }),
        properties: JSON.stringify({
          label: `RFID Turnstile T-0${t + 1}`,
          doorType: 'Turnstile',
          turnstileDirection: 'bidirectional',
        }),
      },
    });
  }

  // Wi-Fi Access Points distributed across floor
  const wifiLocations = [
    { x: 400, y: 300, name: 'AP-W01' },
    { x: 900, y: 400, name: 'AP-W02' },
    { x: 1900, y: 400, name: 'AP-W03' },
    { x: 400, y: 900, name: 'AP-W04' },
    { x: 1000, y: 900, name: 'AP-W05' },
    { x: 1800, y: 900, name: 'AP-W06' },
    { x: 2400, y: 900, name: 'AP-W07' },
    { x: 400, y: 1500, name: 'AP-W08' },
    { x: 2400, y: 1500, name: 'AP-W09' },
  ];

  for (const ap of wifiLocations) {
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'it',
        subType: 'wifi',
        layer: 'it',
        x: ap.x,
        y: ap.y,
        width: 32,
        height: 32,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'circle',
          fill: '#0284c7',
          stroke: '#38bdf8',
        }),
        properties: JSON.stringify({
          label: ap.name,
          itType: 'Wi-Fi 6E AP',
        }),
      },
    });
  }

  // Fire Extinguishers & Safety Equipment
  const safetyLocations = [
    { x: 80, y: 80, name: 'FE-01' },
    { x: 1180, y: 640, name: 'FE-02' },
    { x: 1620, y: 640, name: 'FE-03' },
    { x: 2700, y: 80, name: 'FE-04' },
    { x: 80, y: 1700, name: 'FE-05' },
    { x: 2700, y: 1700, name: 'FE-06' },
  ];

  for (const fe of safetyLocations) {
    await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'safety',
        subType: 'fireExtinguisher',
        layer: 'safety',
        x: fe.x,
        y: fe.y,
        width: 24,
        height: 24,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#dc2626',
          stroke: '#fca5a5',
        }),
        properties: JSON.stringify({
          label: fe.name,
          safetyType: 'CO2 Fire Extinguisher',
        }),
      },
    });
  }

  console.log('--- Generating 500+ Workstations and Seats ---');

  // We will build:
  // Zone A: South Wing (Amazon dedicated zone)
  // - 16 Y-Shaped Bays (6 seats each = 96 seats)
  // - 16 Linear Benches (8 seats each = 128 seats)
  // Total Zone A = 224 seats (Amazon: 210, Blocked for Maintenance: 8, Vacant: 6)

  // Zone B: Central Core (McAfee & T-Mobile)
  // - 12 Linear Benches (8 seats each = 96 seats)
  // - 14 6-Seat Pod Clusters = 84 seats
  // Total Zone B = 180 seats (McAfee: 105, T-Mobile: 65, Blocked for IT issue: 10)

  // Zone C: North Wing (Wayfair, Healthcare Global, & Vacant Flex)
  // - 10 8-Seat Benches = 80 seats
  // - 8 6-Seat Pods = 48 seats
  // Total Zone C = 128 seats (Wayfair: 55, Healthcare: 35, Unallocated/Vacant: 38)
  // Grand Total = 532 seats!

  const allSeats: any[] = [];
  const allAllocations: any[] = [];
  const allBlocks: any[] = [];

  // Helper to generate seat ID
  const formatSeatId = (zone: string, num: number) => {
    return `CHN-F03-${zone}-${String(num).padStart(3, '0')}`;
  };

  let seatCountA = 0;

  // === ZONE A: Y-BAYS (16 bays) ===
  // Positioned in Left Section: X from 120 to 1050, Y from 500 to 1150
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const bayNum = row * 4 + col + 1;
      const bayCode = `Y-BAY-${String(bayNum).padStart(2, '0')}`;
      const bx = 140 + col * 250;
      const by = 520 + row * 160;

      // Create Workstation FloorObject
      const bayObj = await prisma.floorObject.create({
        data: {
          floorId: floor.id,
          type: 'bay',
          subType: 'yBay',
          layer: 'workstations',
          x: bx,
          y: by,
          width: 180,
          height: 120,
          rotation: 0,
          geometry: JSON.stringify({
            shape: 'polygon',
            fill: '#1e293b',
            stroke: '#3b82f6',
          }),
          properties: JSON.stringify({
            label: bayCode,
            tableType: 'Y-Shape 120-degree Pod',
            capacity: 6,
          }),
        },
      });

      // 6 Seats around the Y-Bay
      const offsets = [
        { dx: 30, dy: 15, rot: 0 },
        { dx: 90, dy: 15, rot: 0 },
        { dx: 150, dy: 50, rot: 60 },
        { dx: 130, dy: 105, rot: 120 },
        { dx: 50, dy: 105, rot: 180 },
        { dx: 10, dy: 50, rot: 240 },
      ];

      for (let s = 0; s < 6; s++) {
        seatCountA++;
        const sId = formatSeatId('A', seatCountA);
        const seat = await prisma.seat.create({
          data: {
            seatId: sId,
            floorId: floor.id,
            zoneId: zoneA.id,
            floorObjectId: bayObj.id,
            bayCode: bayCode,
            seatType: s === 0 ? 'team_lead' : 'standard',
            x: bx + offsets[s].dx,
            y: by + offsets[s].dy,
            rotation: offsets[s].rot,
          },
        });

        // Allocation: 90% Amazon, 5% Blocked, 5% Vacant
        if (seatCountA <= 88) {
          await prisma.seatAllocation.create({
            data: {
              seatId: seat.id,
              programId: amazon.id,
              status: 'ALLOCATED',
              shift: '09:00 - 18:00',
              employeeName: `Amazon Associate #${seatCountA}`,
              effectiveDate: new Date('2026-01-01'),
            },
          });
        } else if (seatCountA <= 92) {
          // Blocked for maintenance
          await prisma.seatAllocation.create({
            data: {
              seatId: seat.id,
              programId: amazon.id,
              status: 'ALLOCATED',
              shift: '09:00 - 18:00',
              effectiveDate: new Date('2026-01-01'),
            },
          });
          await prisma.seatBlock.create({
            data: {
              seatId: seat.id,
              reason: 'Maintenance',
              startDate: new Date('2026-09-01'),
              notes: 'Desk power module replacement scheduled',
              active: true,
            },
          });
        }
        // remaining 4 vacant
      }
    }
  }

  // === ZONE A: LINEAR BENCHES (16 benches of 8 seats) ===
  // Positioned in Left-Middle Section: X from 140 to 1050, Y from 1200 to 1700
  for (let b = 0; b < 16; b++) {
    const col = b % 4;
    const row = Math.floor(b / 4);
    const benchCode = `LIN-A-${String(b + 1).padStart(2, '0')}`;
    const bx = 140 + col * 250;
    const by = 1200 + row * 120;

    const benchObj = await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'bay',
        subType: 'linearBench',
        layer: 'workstations',
        x: bx,
        y: by,
        width: 200,
        height: 80,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#1e293b',
          stroke: '#475569',
        }),
        properties: JSON.stringify({
          label: benchCode,
          tableType: 'Back-to-Back 8-Seat Linear Bench',
          capacity: 8,
        }),
      },
    });

    for (let s = 0; s < 8; s++) {
      seatCountA++;
      const sId = formatSeatId('A', seatCountA);
      const isTop = s < 4;
      const sx = bx + 25 + (s % 4) * 45;
      const sy = isTop ? by + 15 : by + 65;

      const seat = await prisma.seat.create({
        data: {
          seatId: sId,
          floorId: floor.id,
          zoneId: zoneA.id,
          floorObjectId: benchObj.id,
          bayCode: benchCode,
          seatType: 'standard',
          x: sx,
          y: sy,
          rotation: isTop ? 0 : 180,
        },
      });

      // Amazon allocation
      if (seatCountA <= 218) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: amazon.id,
            status: 'ALLOCATED',
            shift: seatCountA % 2 === 0 ? '08:00 - 17:00' : '13:00 - 22:00',
            employeeName: `Amazon Specialist #${seatCountA}`,
            effectiveDate: new Date('2026-02-01'),
          },
        });
      } else if (seatCountA <= 222) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: amazon.id,
            status: 'ALLOCATED',
            shift: '08:00 - 17:00',
            effectiveDate: new Date('2026-02-01'),
          },
        });
        await prisma.seatBlock.create({
          data: {
            seatId: seat.id,
            reason: 'IT issue',
            startDate: new Date('2026-09-10'),
            notes: 'Cat6 network drop re-termination in progress',
            active: true,
          },
        });
      }
      // Remaining are vacant
    }
  }

  // === ZONE B: CENTRAL WING (McAfee & T-Mobile) ===
  // X: 1680 to 2050, Y: 520 to 1680
  let seatCountB = 0;

  // 12 Linear Benches in Zone B (8 seats each = 96 seats)
  for (let b = 0; b < 12; b++) {
    const col = b % 2;
    const row = Math.floor(b / 2);
    const benchCode = `MCF-B-${String(b + 1).padStart(2, '0')}`;
    const bx = 1680 + col * 200;
    const by = 540 + row * 110;

    const benchObj = await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'bay',
        subType: 'linearBench',
        layer: 'workstations',
        x: bx,
        y: by,
        width: 170,
        height: 75,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#1e293b',
          stroke: '#ef4444',
        }),
        properties: JSON.stringify({
          label: benchCode,
          tableType: 'McAfee SOC Dedicated Bench',
          capacity: 8,
        }),
      },
    });

    for (let s = 0; s < 8; s++) {
      seatCountB++;
      const sId = formatSeatId('B', seatCountB);
      const isTop = s < 4;
      const sx = bx + 20 + (s % 4) * 40;
      const sy = isTop ? by + 15 : by + 60;

      const seat = await prisma.seat.create({
        data: {
          seatId: sId,
          floorId: floor.id,
          zoneId: zoneB.id,
          floorObjectId: benchObj.id,
          bayCode: benchCode,
          seatType: s === 0 ? 'ops_manager' : 'standard',
          x: sx,
          y: sy,
          rotation: isTop ? 0 : 180,
        },
      });

      // McAfee Allocation
      if (seatCountB <= 88) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: mcafee.id,
            status: 'ALLOCATED',
            shift: '24/7 Rotational SOC',
            employeeName: `McAfee Analyst #${seatCountB}`,
            effectiveDate: new Date('2026-01-15'),
          },
        });
      } else if (seatCountB <= 94) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: mcafee.id,
            status: 'ALLOCATED',
            shift: '24/7 Rotational SOC',
            effectiveDate: new Date('2026-01-15'),
          },
        });
        await prisma.seatBlock.create({
          data: {
            seatId: seat.id,
            reason: 'Cleaning',
            startDate: new Date('2026-09-18'),
            notes: 'Deep carpet shampooing and ergonomic chair sanitization',
            active: true,
          },
        });
      }
    }
  }

  // 14 6-Seat Pod Clusters in Zone B (84 seats for T-Mobile & McAfee)
  for (let p = 0; p < 14; p++) {
    const col = p % 2;
    const row = Math.floor(p / 2);
    const podCode = `POD-B-${String(p + 1).padStart(2, '0')}`;
    const px = 1680 + col * 200;
    const py = 1200 + row * 110;

    const podObj = await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'bay',
        subType: 'pod6',
        layer: 'workstations',
        x: px,
        y: py,
        width: 160,
        height: 80,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#1e293b',
          stroke: '#ec4899',
        }),
        properties: JSON.stringify({
          label: podCode,
          tableType: 'Collaborative 6-Pod',
          capacity: 6,
        }),
      },
    });

    for (let s = 0; s < 6; s++) {
      seatCountB++;
      const sId = formatSeatId('B', seatCountB);
      const isTop = s < 3;
      const sx = px + 25 + (s % 3) * 50;
      const sy = isTop ? py + 15 : py + 65;

      const seat = await prisma.seat.create({
        data: {
          seatId: sId,
          floorId: floor.id,
          zoneId: zoneB.id,
          floorObjectId: podObj.id,
          bayCode: podCode,
          seatType: 'standard',
          x: sx,
          y: sy,
          rotation: isTop ? 0 : 180,
        },
      });

      // T-Mobile Allocation
      if (seatCountB <= 165) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: tmobile.id,
            status: 'ALLOCATED',
            shift: '10:00 - 19:00',
            employeeName: `T-Mobile Support #${seatCountB}`,
            effectiveDate: new Date('2026-03-01'),
          },
        });
      } else if (seatCountB <= 172) {
        // T-Mobile allocated + Blocked
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: tmobile.id,
            status: 'ALLOCATED',
            shift: '10:00 - 19:00',
            effectiveDate: new Date('2026-03-01'),
          },
        });
        await prisma.seatBlock.create({
          data: {
            seatId: seat.id,
            reason: 'Reserved',
            startDate: new Date('2026-09-20'),
            notes: 'Reserved for incoming T-Mobile regional QA team',
            active: true,
          },
        });
      }
      // Remaining are vacant
    }
  }

  // === ZONE C: NORTH-EAST WING (Wayfair, Healthcare Global & Flexible Seats) ===
  // X: 2150 to 2650, Y: 520 to 1180
  let seatCountC = 0;

  // 10 8-Seat Benches in Zone C (80 seats)
  for (let b = 0; b < 10; b++) {
    const col = b % 2;
    const row = Math.floor(b / 2);
    const benchCode = `FLX-C-${String(b + 1).padStart(2, '0')}`;
    const bx = 2150 + col * 260;
    const by = 540 + row * 115;

    const benchObj = await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'bay',
        subType: 'linearBench',
        layer: 'workstations',
        x: bx,
        y: by,
        width: 210,
        height: 80,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#1e293b',
          stroke: '#a855f7',
        }),
        properties: JSON.stringify({
          label: benchCode,
          tableType: 'Wayfair / Enterprise Flex Bench',
          capacity: 8,
        }),
      },
    });

    for (let s = 0; s < 8; s++) {
      seatCountC++;
      const sId = formatSeatId('C', seatCountC);
      const isTop = s < 4;
      const sx = bx + 25 + (s % 4) * 48;
      const sy = isTop ? by + 15 : by + 65;

      const seat = await prisma.seat.create({
        data: {
          seatId: sId,
          floorId: floor.id,
          zoneId: zoneC.id,
          floorObjectId: benchObj.id,
          bayCode: benchCode,
          seatType: s === 0 ? 'team_lead' : 'standard',
          x: sx,
          y: sy,
          rotation: isTop ? 0 : 180,
        },
      });

      // Wayfair Allocation (55 seats)
      if (seatCountC <= 55) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: wayfair.id,
            status: 'ALLOCATED',
            shift: '09:30 - 18:30',
            employeeName: `Wayfair Ops #${seatCountC}`,
            effectiveDate: new Date('2026-04-01'),
          },
        });
      } else if (seatCountC <= 80) {
        // Healthcare Global Allocation (25 seats)
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: healthcare.id,
            status: 'ALLOCATED',
            shift: '07:00 - 16:00',
            employeeName: `Healthcare Associate #${seatCountC}`,
            effectiveDate: new Date('2026-05-01'),
          },
        });
      }
    }
  }

  // 8 6-Seat Pods in Zone C (48 seats)
  for (let p = 0; p < 8; p++) {
    const col = p % 2;
    const row = Math.floor(p / 2);
    const podCode = `POD-C-${String(p + 1).padStart(2, '0')}`;
    const px = 2150 + col * 260;
    const py = 1120 + row * 115;

    const podObj = await prisma.floorObject.create({
      data: {
        floorId: floor.id,
        type: 'bay',
        subType: 'pod6',
        layer: 'workstations',
        x: px,
        y: py,
        width: 200,
        height: 80,
        rotation: 0,
        geometry: JSON.stringify({
          shape: 'rect',
          fill: '#1e293b',
          stroke: '#64748b',
        }),
        properties: JSON.stringify({
          label: podCode,
          tableType: 'Flexible Hot-Desk Pod',
          capacity: 6,
        }),
      },
    });

    for (let s = 0; s < 6; s++) {
      seatCountC++;
      const sId = formatSeatId('C', seatCountC);
      const isTop = s < 3;
      const sx = px + 30 + (s % 3) * 60;
      const sy = isTop ? py + 15 : py + 65;

      const seat = await prisma.seat.create({
        data: {
          seatId: sId,
          floorId: floor.id,
          zoneId: zoneC.id,
          floorObjectId: podObj.id,
          bayCode: podCode,
          seatType: 'hot_desk',
          x: sx,
          y: sy,
          rotation: isTop ? 0 : 180,
        },
      });

      // 10 Healthcare, remaining 38 are unallocated/vacant
      if (seatCountC <= 90) {
        await prisma.seatAllocation.create({
          data: {
            seatId: seat.id,
            programId: healthcare.id,
            status: 'ALLOCATED',
            shift: '14:00 - 23:00',
            employeeName: `Healthcare Associate #${seatCountC}`,
            effectiveDate: new Date('2026-05-01'),
          },
        });
      } else if (seatCountC <= 95) {
        // Blocked for construction
        await prisma.seatBlock.create({
          data: {
            seatId: seat.id,
            reason: 'Construction',
            startDate: new Date('2026-09-15'),
            notes: 'Ceiling HVAC duct inspection zone',
            active: true,
          },
        });
      }
      // Remaining are totally unallocated vacant hot desks!
    }
  }

  console.log(`--- Created ${seatCountA + seatCountB + seatCountC} total physical seats! ---`);

  console.log('--- Creating Initial Baseline Floor Version ---');
  await prisma.floorVersion.create({
    data: {
      floorId: floor.id,
      versionName: 'v1.0 - Q3 Baseline Layout',
      description: 'Initial operational layout with Amazon, McAfee, T-Mobile, Wayfair & Healthcare allocations',
      // A full snapshot, so restoring the baseline actually rebuilds this layout
      snapshotJson: JSON.stringify(await captureFloorSnapshot(prisma, floor.id)),
      createdBy: 'Administrator',
    },
  });

  console.log('--- Creating Audit Logs ---');
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'INITIAL_FLOOR_SETUP',
        entityType: 'FLOOR',
        entityId: floor.id,
        user: 'Chief Facility Planner',
        userRole: 'Administrator',
        newValue: JSON.stringify({ floor: 'Floor 3', seats: seatCountA + seatCountB + seatCountC }),
        reason: 'Master facility planning rollout',
        source: 'SYSTEM_INIT',
      },
      {
        action: 'BULK_ASSIGN_PROGRAM',
        entityType: 'PROGRAM',
        entityId: amazon.id,
        user: 'Capacity Planner',
        userRole: 'Capacity Planner',
        newValue: JSON.stringify({ program: 'Amazon', seatsAssigned: 214 }),
        reason: 'Q3 AWS Expansion Contract',
        source: 'BULK_ACTION',
      },
      {
        action: 'BLOCK_SEATS',
        entityType: 'SEAT_BLOCK',
        user: 'Facility Ops Manager',
        userRole: 'Facility Manager',
        newValue: JSON.stringify({ count: 8, reason: 'Maintenance' }),
        reason: 'Floor socket power testing',
        source: 'WEB_UI',
      },
    ],
  });

  console.log('=== Seed Completed Successfully! ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
