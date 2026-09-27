export type LayerId =
  | 'architecture'
  | 'walls'
  | 'doors'
  | 'glass'
  | 'rooms'
  | 'workstations'
  | 'seats'
  | 'furniture'
  | 'facilities'
  | 'it'
  | 'safety'
  | 'dimensions'
  | 'allocation';

export type ToolMode =
  | 'select'
  | 'pan'
  | 'box_select'
  | 'wall'
  | 'glass'
  | 'door'
  | 'room'
  | 'workstation'
  | 'furniture'
  | 'facility'
  | 'it'
  | 'safety'
  | 'dimension';

export type ViewMode = 'operational' | 'architectural';

export type SeatStatus =
  | 'UNALLOCATED'
  | 'ALLOCATED'
  | 'BLOCKED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'UNAVAILABLE';

export type SeatBlockReason =
  | 'Maintenance'
  | 'IT issue'
  | 'Cleaning'
  | 'Reserved'
  | 'Temporary closure'
  | 'Construction'
  | 'Other';

export type SeatType =
  | 'standard'
  | 'hot_desk'
  | 'team_lead'
  | 'ops_manager'
  | 'accessible';

export type UserRole =
  | 'Administrator'
  | 'Facility Manager'
  | 'Capacity Planner'
  | 'Program Manager'
  | 'Viewer';

export interface Point {
  x: number;
  y: number;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeometryData {
  points?: Point[];
  path?: string;
  shape?: 'rect' | 'circle' | 'polygon' | 'path' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  components?: Array<{
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    fill?: string;
    stroke?: string;
    points?: Point[];
    label?: string;
    path?: string;
  }>;
}

export interface ObjectProperties {
  label?: string;
  roomType?: string;
  capacity?: number;
  areaSqFt?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  doorType?: string;
  swingDirection?: 'left' | 'right' | 'double' | 'sliding';
  turnstileDirection?: 'in' | 'out' | 'bidirectional';
  itType?: string;
  safetyType?: string;
  facilityType?: string;
  tableType?: string;
  chairCount?: number;
  notes?: string;
}

export interface FloorObjectDTO {
  id: string;
  floorId: string;
  type: string;
  subType?: string | null;
  layer: LayerId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  geometry: GeometryData;
  properties: ObjectProperties;
  locked: boolean;
  hidden: boolean;
}

export interface SeatDTO {
  id: string;
  seatId: string; // Permanent ID e.g. CHN-F03-A-041
  floorId: string;
  zoneId?: string | null;
  floorObjectId?: string | null;
  bayCode?: string | null;
  seatType: SeatType;
  x: number;
  y: number;
  rotation: number;
  // Allocation data (Layer B)
  programId?: string | null;
  programName?: string | null;
  programCode?: string | null;
  programColor?: string | null;
  allocationStatus: SeatStatus;
  shift?: string | null;
  employeeName?: string | null;
  employeeId?: string | null;
  effectiveDate?: string | null;
  endDate?: string | null;
  // Block data (Layer B)
  isBlocked: boolean;
  blockReason?: SeatBlockReason | string | null;
  blockStartDate?: string | null;
  blockEndDate?: string | null;
  blockNotes?: string | null;
}

export interface ProgramDTO {
  id: string;
  name: string;
  code: string;
  color: string;
  requiredCapacity: number;
  contactPerson?: string | null;
  notes?: string | null;
  allocatedCount: number;
  blockedCount: number;
  availableCount: number;
  netUsable: number;
  shortageSurplus: number;
  utilization: number;
}

export interface ZoneDTO {
  id: string;
  floorId: string;
  code: string;
  name: string;
  color: string;
  polygon?: Point[] | null;
  totalSeats?: number;
  allocatedSeats?: number;
}

export interface BuildingDTO {
  id: string;
  name: string;
  code: string;
  campus: string;
}

export interface FloorDTO {
  id: string;
  buildingId: string;
  name: string;
  floorNumber: number;
  totalArea: number;
  width: number;
  height: number;
  scale: number;
  gridSize: number;
  buildingName?: string;
  buildingCode?: string;
  campus?: string;
  totalSeats?: number;
  allocatedSeats?: number;
  vacantSeats?: number;
  blockedSeats?: number;
  utilization?: number;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  seatId?: string | null;
  user: string;
  userRole: string;
  prevValue?: any;
  newValue?: any;
  reason?: string | null;
  source: string;
  timestamp: string;
}

export interface FloorVersionDTO {
  id: string;
  floorId: string;
  versionName: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface FloorDataResponse {
  building: BuildingDTO;
  floor: FloorDTO;
  zones: ZoneDTO[];
  programs: ProgramDTO[];
  objects: FloorObjectDTO[];
  seats: SeatDTO[];
  versions: FloorVersionDTO[];
}
