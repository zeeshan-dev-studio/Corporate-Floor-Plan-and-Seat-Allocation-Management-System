'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import { Boxes, Layers, Eye, EyeOff, Lock, Unlock, Plus } from 'lucide-react';
import { LayerId, FloorObjectDTO, GeometryData, ObjectProperties } from '@/types/floorplan';
import { ShapeId, formatFeet, geometryForShape, newTempId, layoutSpecOf, seatSlots } from '@/lib/floorGeometry';
import { FloorObjectElement } from '@/components/canvas/FloorObjectElement';

interface CatalogItem {
  id: string;
  name: string;
  type: string;
  subType: string;
  layer: LayerId;
  width: number;
  height: number;
  shape?: ShapeId;
  geometry?: GeometryData;
  properties: ObjectProperties;
}

/** A workstation: its desk surface plus the seats laid out inside it. */
const desk = (
  id: string,
  name: string,
  width: number,
  height: number,
  rows: number,
  cols: number,
  capacity: number,
  extra: Partial<CatalogItem> & { arrangement?: 'grid' | 'around' } = {}
): CatalogItem => {
  const { arrangement, ...rest } = extra;
  return {
    id,
    name,
    type: 'bay',
    subType: 'box',
    layer: 'workstations',
    width,
    height,
    properties: {
      label: 'WS-01',
      tableType: name,
      capacity,
      seatRows: rows,
      seatCols: cols,
      arrangement: arrangement || 'grid',
      seatFacing: 'inward',
    },
    ...rest,
  };
};

const room = (id: string, name: string, width: number, height: number, roomType: string, capacity: number, shape?: ShapeId): CatalogItem => ({
  id,
  name,
  type: 'room',
  subType: 'room',
  layer: 'rooms',
  width,
  height,
  shape,
  properties: { label: roomType, roomType, capacity },
});

// Sizes are drawing units: 10 units = 1 ft
const CATALOG: Record<string, CatalogItem[]> = {
  workstations: [
    // BPO floors: seats 4.5 ft apart, two rows of seats facing a divider, benches of 6 to 16 seats
    desk('ws-1', 'Single desk (1 seat)', 45, 50, 1, 1, 1),
    desk('ws-2', 'Desk pair (2 seats)', 90, 50, 1, 2, 2),
    desk('ws-4', '4-seat cluster (2 x 2)', 90, 100, 2, 2, 4),
    desk('ws-6', '6-seat bench (3 x 2)', 135, 100, 2, 3, 6),
    desk('ws-8', '8-seat bench (4 x 2)', 180, 100, 2, 4, 8),
    desk('ws-10', '10-seat team bench (5 x 2)', 225, 100, 2, 5, 10),
    desk('ws-12', '12-seat bench (6 x 2)', 270, 100, 2, 6, 12),
    desk('ws-16', '16-seat long bench (8 x 2)', 360, 100, 2, 8, 16),
    desk('ws-row6', 'Wall row (6 seats, one side)', 270, 50, 1, 6, 6),
    desk('ws-l3', 'L-shaped pod (3 seats)', 120, 100, 2, 2, 3, { shape: 'L' }),
    desk('ws-round6', 'Round table (6 seats)', 140, 140, 1, 6, 6, { shape: 'circle', arrangement: 'around' }),
    desk('ws-oval8', 'Oval table (8 seats)', 200, 120, 1, 8, 8, { shape: 'circle', arrangement: 'around' }),
  ],
  rooms: [
    room('room-cabin', 'Manager cabin', 120, 110, 'Cabin', 2),
    room('room-booth', 'Phone booth', 60, 60, 'Phone booth', 1),
    room('room-meet6', 'Meeting room (6 people)', 160, 140, 'Meeting room', 6),
    room('room-meet12', 'Meeting room (12 people)', 240, 180, 'Meeting room', 12),
    room('room-board', 'Boardroom (22 people)', 380, 240, 'Board room', 22),
    room('room-train', 'Training room (30 people)', 400, 260, 'Training room', 30),
    room('room-audit', 'Auditorium (100 people)', 600, 420, 'Auditorium', 100),
    room('room-pantry', 'Pantry / cafeteria', 300, 200, 'Cafeteria', 40),
    room('room-reception', 'Reception', 260, 180, 'Reception', 4),
    room('room-server', 'Server room', 160, 140, 'Server room', 0),
    room('room-wash', 'Washroom', 160, 120, 'Washroom', 0),
    room('room-L', 'L-shaped room', 300, 240, 'Room', 0, 'L'),
    room('room-T', 'T-shaped room', 320, 220, 'Room', 0, 'T'),
    room('room-U', 'U-shaped room', 320, 240, 'Room', 0, 'U'),
    room('room-round', 'Round / oval room', 240, 240, 'Room', 0, 'circle'),
  ],
  architecture: [
    { id: 'int-wall', name: 'Interior wall', type: 'wall', subType: 'interior', layer: 'walls', width: 240, height: 10, geometry: { fill: '#1e293b', stroke: '#475569', strokeWidth: 1.5 }, properties: { label: 'Wall' } },
    { id: 'glass-wall', name: 'Glass partition', type: 'glass', subType: 'glass', layer: 'glass', width: 200, height: 8, properties: { label: 'Glass partition' } },
    { id: 'col-pillar', name: 'Structural column', type: 'wall', subType: 'column', layer: 'architecture', width: 20, height: 20, geometry: { fill: '#334155', stroke: '#64748b', strokeWidth: 1.5 }, properties: { label: 'Column' } },
  ],
  doors: [
    { id: 'single-door', name: 'Single swing door (3 ft)', type: 'door', subType: 'singleDoor', layer: 'doors', width: 30, height: 30, properties: { label: 'Door', doorType: 'Single' } },
    { id: 'double-door', name: 'Double door (6 ft)', type: 'door', subType: 'doubleDoor', layer: 'doors', width: 60, height: 30, properties: { label: 'Double door', doorType: 'Double' } },
    { id: 'rfid-turnstile', name: 'Access turnstile', type: 'door', subType: 'turnstile', layer: 'doors', width: 50, height: 40, properties: { label: 'RFID turnstile', doorType: 'Turnstile', turnstileDirection: 'bidirectional' } },
  ],
  furniture: [
    { id: 'conf-table', name: 'Conference table (10 seats)', type: 'furniture', subType: 'confTable', layer: 'furniture', width: 220, height: 90, properties: { label: 'Conference table', chairCount: 10 } },
    { id: 'lounge-sofa', name: 'Sofa', type: 'furniture', subType: 'sofa', layer: 'furniture', width: 140, height: 60, properties: { label: 'Sofa' } },
    { id: 'cabinet', name: 'Storage cabinet', type: 'furniture', subType: 'cabinet', layer: 'furniture', width: 80, height: 30, properties: { label: 'Cabinet' } },
    { id: 'planter-box', name: 'Planter', type: 'furniture', subType: 'plant', layer: 'furniture', width: 30, height: 30, properties: { label: 'Planter' } },
  ],
  facilities: [
    { id: 'pass-lift', name: 'Passenger lift', type: 'facility', subType: 'elevator', layer: 'facilities', width: 80, height: 70, properties: { label: 'Lift', facilityType: 'Elevator' } },
    { id: 'fire-stairs', name: 'Fire stairs', type: 'facility', subType: 'stairs', layer: 'safety', width: 100, height: 160, properties: { label: 'Fire stairs', safetyType: 'Emergency exit' } },
    { id: 'fire-extinguisher', name: 'Fire extinguisher', type: 'safety', subType: 'fireExtinguisher', layer: 'safety', width: 24, height: 24, properties: { label: 'FE', safetyType: 'Fire extinguisher' } },
    { id: 'wifi-ap', name: 'Wi-Fi access point', type: 'it', subType: 'wifi', layer: 'it', width: 32, height: 32, properties: { label: 'AP', itType: 'Wi-Fi AP' } },
    { id: 'server-rack', name: 'Server rack', type: 'it', subType: 'serverRack', layer: 'it', width: 60, height: 100, properties: { label: 'Rack', itType: 'Server rack' } },
  ],
};

/** Small drawing of a catalog item, rendered with the same code as the canvas so it looks the same once placed. */
const CatalogPreview: React.FC<{ item: CatalogItem }> = ({ item }) => {
  const obj: FloorObjectDTO = {
    id: 'preview',
    floorId: '',
    type: item.type,
    subType: item.subType,
    layer: item.layer,
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
    rotation: 0,
    geometry: item.geometry ? { ...item.geometry } : { shape: 'rect' },
    properties: { ...item.properties },
    locked: false,
    hidden: false,
  };
  if (item.shape) obj.geometry = geometryForShape(obj, item.shape);
  const seats = item.type === 'bay' ? seatSlots(obj, layoutSpecOf(obj)) : [];
  // Doors swing outside their box; give every drawing some air so nothing is clipped
  const pad = Math.max(item.width, item.height) * 0.08 + 4;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${item.width + pad * 2} ${item.height + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-16 h-12 shrink-0 bg-white border border-slate-700 rounded-lg [&_*]:[vector-effect:non-scaling-stroke] [&_text]:hidden"
      aria-hidden="true"
    >
      <FloorObjectElement object={obj} isSelected={false} isHovered={false} interactive={false} onSelect={() => {}} onHover={() => {}} />
      {seats.map((sl, i) => (
        <circle key={i} cx={sl.x} cy={sl.y} r={Math.min(10, Math.max(5, Math.min(item.width, item.height) / 6))} fill="#ffffff" stroke="#1e293b" strokeWidth={1.2} />
      ))}
    </svg>
  );
};

const CATEGORIES = [
  { id: 'workstations', label: 'Workstations' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'architecture', label: 'Walls' },
  { id: 'doors', label: 'Doors' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'facilities', label: 'Facilities / IT' },
];

const LAYER_LABELS: Record<LayerId, string> = {
  rooms: 'Rooms',
  architecture: 'Building outline & columns',
  walls: 'Walls',
  glass: 'Glass partitions',
  doors: 'Doors',
  workstations: 'Workstation desks',
  seats: 'Seats (chairs)',
  furniture: 'Furniture',
  facilities: 'Lifts & facilities',
  it: 'IT equipment',
  safety: 'Safety',
};

export const ObjectLibrarySidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'layers'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('workstations');

  const { floor, objects, layers, toggleLayer, setLayerLocked, setLayerOpacity, addObject, addBay, panX, panY, zoom, viewport, gridSize, activeRole } =
    useFloorPlanStore();

  const canEditLayout = activeRole === 'Administrator' || activeRole === 'Facility Manager';

  const handleAddItem = (item: CatalogItem) => {
    if (!canEditLayout || !floor) {
      alert('Your current user role does not have permission to modify the physical floor layout.');
      return;
    }

    // Place at the centre of what the user is looking at, on the grid, and off any object already placed there
    const snap = (v: number) => Math.round(v / gridSize) * gridSize;
    let x = snap((viewport.width / 2 - panX) / zoom - item.width / 2);
    let y = snap((viewport.height / 2 - panY) / zoom - item.height / 2);
    x = Math.min(Math.max(0, x), Math.max(0, floor.width - item.width));
    y = Math.min(Math.max(0, y), Math.max(0, floor.height - item.height));
    while (objects.some((o) => o.type === item.type && o.x === x && o.y === y)) {
      x += gridSize;
      y += gridSize;
    }

    const obj: FloorObjectDTO = {
      id: newTempId('obj'),
      floorId: floor.id,
      type: item.type,
      subType: item.subType,
      layer: item.layer,
      x,
      y,
      width: item.width,
      height: item.height,
      rotation: 0,
      geometry: item.geometry ? { ...item.geometry } : { shape: 'rect' },
      properties: { ...item.properties },
      locked: false,
      hidden: false,
    };
    if (item.shape) obj.geometry = geometryForShape(obj, item.shape);

    if (item.type === 'bay') addBay(obj);
    else {
      addObject(obj);
      useFloorPlanStore.getState().selectObject(obj.id);
    }
  };

  return (
    <aside className="w-72 h-full min-h-0 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col z-20 select-none">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'library' ? 'border-sky-500 text-slate-50 bg-slate-800/40' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'layers' ? 'border-sky-500 text-slate-50 bg-slate-800/40' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>
      </div>

      {/* Tab 1: Library */}
      {activeTab === 'library' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Pill Buttons */}
          <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-xs font-medium">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Catalog Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {(CATALOG[selectedCategory] || []).map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-xl p-3 flex items-center justify-between transition-all group"
              >
                <CatalogPreview item={item} />
                <div className="flex-1 min-w-0 px-3">
                  <div className="font-semibold text-xs text-slate-50 group-hover:text-sky-400 transition-colors">{item.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatFeet(item.width)} × {formatFeet(item.height)} ft
                    {item.type === 'bay' ? ` • ${item.properties.capacity} seat${item.properties.capacity === 1 ? '' : 's'}` : ''}
                  </div>
                </div>

                <button
                  onClick={() => handleAddItem(item)}
                  title="Add to floor plan"
                  className="p-1.5 bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 bg-slate-950/40 space-y-1">
            <div>
              Click <Plus className="w-3 h-3 inline text-sky-400" /> to place an item in the middle of your view, then drag, resize or rotate it.
            </div>
            <div>Tip: keep about 5 ft between benches and 6 ft on main aisles. Need another size? Draw a box with the Workstation tool.</div>
          </div>
        </div>
      )}

      {/* Tab 2: Layers Manager */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Show, hide and lock</div>
          {(Object.keys(LAYER_LABELS) as LayerId[]).map((lid) => {
            const lState = layers[lid];
            return (
              <div key={lid} className="bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 hover:bg-slate-800/80 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-200">{LAYER_LABELS[lid]}</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLayerLocked(lid, !lState.locked)}
                      title={lState.locked ? 'Unlock layer (objects can be selected and edited)' : 'Lock layer (objects cannot be selected or moved)'}
                      className={`p-1 rounded hover:bg-slate-700 ${lState.locked ? 'text-amber-400' : 'text-slate-400'}`}
                    >
                      {lState.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleLayer(lid)}
                      title={lState.visible ? 'Hide layer' : 'Show layer'}
                      className={`p-1 rounded hover:bg-slate-700 ${lState.visible ? 'text-sky-400' : 'text-slate-500'}`}
                    >
                      {lState.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(lState.opacity * 100)}
                  onChange={(e) => setLayerOpacity(lid, parseInt(e.target.value, 10) / 100)}
                  className="w-full mt-1.5 accent-sky-500"
                  aria-label={`${LAYER_LABELS[lid]} opacity`}
                />
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
