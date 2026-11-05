'use client';

import React, { useState } from 'react';
import { useFloorPlanStore } from '@/store/useFloorPlanStore';
import {
  Boxes,
  Layers,
  Square,
  DoorOpen,
  LayoutGrid,
  Armchair,
  LifeBuoy,
  Wifi,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Shield,
  Monitor,
  Flame,
  Plus,
} from 'lucide-react';
import { LayerId, FloorObjectDTO } from '@/types/floorplan';

export const ObjectLibrarySidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'layers'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('workstations');

  const {
    floor,
    layers,
    toggleLayer,
    setLayerLocked,
    setLayerOpacity,
    addObject,
    panX,
    panY,
    zoom,
    activeRole,
  } = useFloorPlanStore();

  const canEditLayout =
    activeRole === 'Administrator' || activeRole === 'Facility Manager';

  // Library Items catalog
  const catalog = {
    workstations: [
      {
        id: 'y-bay-6',
        name: 'Y-Bay 120° Pod (6 Seats)',
        type: 'bay',
        subType: 'yBay',
        layer: 'workstations' as LayerId,
        width: 180,
        height: 120,
        properties: { label: 'Y-BAY', tableType: 'Y-Shape 120-degree Pod', capacity: 6 },
      },
      {
        id: 'linear-bench-8',
        name: 'Linear Bench (8 Seats)',
        type: 'bay',
        subType: 'linearBench',
        layer: 'workstations' as LayerId,
        width: 200,
        height: 80,
        properties: { label: 'LIN-BENCH', tableType: 'Back-to-Back 8-Seat Linear Bench', capacity: 8 },
      },
      {
        id: 'pod-6',
        name: 'Collaborative 6-Pod',
        type: 'bay',
        subType: 'pod6',
        layer: 'workstations' as LayerId,
        width: 160,
        height: 80,
        properties: { label: 'POD-06', tableType: 'Collaborative 6-Pod', capacity: 6 },
      },
      {
        id: 'pod-4',
        name: '4-Seat Workstation Pod',
        type: 'bay',
        subType: 'pod4',
        layer: 'workstations' as LayerId,
        width: 120,
        height: 80,
        properties: { label: 'POD-04', tableType: '4-Seat Pod', capacity: 4 },
      },
      {
        id: 'exec-desk',
        name: 'L-Shaped Executive Desk',
        type: 'bay',
        subType: 'execDesk',
        layer: 'workstations' as LayerId,
        width: 90,
        height: 70,
        properties: { label: 'TL-DESK', tableType: 'Team Lead / Manager Desk', capacity: 1 },
      },
    ],
    architecture: [
      {
        id: 'int-wall',
        name: 'Interior Partition Wall',
        type: 'wall',
        subType: 'interior',
        layer: 'architecture' as LayerId,
        width: 240,
        height: 15,
        properties: { label: 'Wall 100mm', thickness: 100 },
      },
      {
        id: 'glass-wall',
        name: 'Acoustic Glass Partition',
        type: 'glass',
        subType: 'glass',
        layer: 'glass' as LayerId,
        width: 200,
        height: 10,
        properties: { label: 'Glass Wall', thickness: 80 },
      },
      {
        id: 'col-pillar',
        name: 'Structural Concrete Pillar',
        type: 'wall',
        subType: 'column',
        layer: 'architecture' as LayerId,
        width: 40,
        height: 40,
        properties: { label: 'Column C-01' },
      },
    ],
    doors: [
      {
        id: 'single-door',
        name: 'Single Swing Door',
        type: 'door',
        subType: 'singleDoor',
        layer: 'doors' as LayerId,
        width: 45,
        height: 45,
        properties: { label: 'Door 900mm', doorType: 'Single' },
      },
      {
        id: 'double-door',
        name: 'Double Glass Door',
        type: 'door',
        subType: 'doubleDoor',
        layer: 'doors' as LayerId,
        width: 90,
        height: 45,
        properties: { label: 'Double Glass Door', doorType: 'Double' },
      },
      {
        id: 'rfid-turnstile',
        name: 'Access Control Turnstile',
        type: 'door',
        subType: 'turnstile',
        layer: 'doors' as LayerId,
        width: 50,
        height: 40,
        properties: { label: 'RFID Turnstile', doorType: 'Turnstile', turnstileDirection: 'bidirectional' },
      },
    ],
    rooms: [
      {
        id: 'meeting-room-6',
        name: 'Meeting Room (6 Pax)',
        type: 'room',
        subType: 'meetingRoom',
        layer: 'rooms' as LayerId,
        width: 220,
        height: 200,
        properties: { label: 'Meeting Room', roomType: 'Meeting room', capacity: 6, areaSqFt: 400 },
      },
      {
        id: 'boardroom-template',
        name: 'Executive Boardroom (22 Pax)',
        type: 'room',
        subType: 'boardroom',
        layer: 'rooms' as LayerId,
        width: 480,
        height: 360,
        properties: { label: 'Boardroom', roomType: 'Board room', capacity: 22, areaSqFt: 1700 },
      },
      {
        id: 'theater-template',
        name: 'Townhall Auditorium (100 Pax)',
        type: 'room',
        subType: 'theater',
        layer: 'rooms' as LayerId,
        width: 600,
        height: 420,
        properties: { label: 'Auditorium', roomType: 'Auditorium', capacity: 100, areaSqFt: 3000 },
      },
      {
        id: 'cabin-manager',
        name: 'Manager Cabin',
        type: 'room',
        subType: 'cabin',
        layer: 'rooms' as LayerId,
        width: 160,
        height: 150,
        properties: { label: 'Manager Cabin', roomType: 'Cabin', capacity: 2, areaSqFt: 220 },
      },
    ],
    furniture: [
      {
        id: 'conf-table',
        name: 'Conference Table (10 Seats)',
        type: 'furniture',
        subType: 'confTable',
        layer: 'furniture' as LayerId,
        width: 220,
        height: 90,
        properties: { label: 'Conference Table', chairCount: 10 },
      },
      {
        id: 'lounge-sofa',
        name: 'Lounge Sofa Set',
        type: 'furniture',
        subType: 'sofa',
        layer: 'furniture' as LayerId,
        width: 140,
        height: 60,
        properties: { label: 'Visitor Sofa' },
      },
      {
        id: 'planter-box',
        name: 'Indoor Plant Pot / Planter',
        type: 'furniture',
        subType: 'plant',
        layer: 'furniture' as LayerId,
        width: 40,
        height: 40,
        properties: { label: 'Planter Box', fill: '#14532d' },
      },
    ],
    facilities: [
      {
        id: 'pass-lift',
        name: 'Passenger Elevator',
        type: 'facility',
        subType: 'elevator',
        layer: 'facilities' as LayerId,
        width: 140,
        height: 90,
        properties: { label: 'Lift', facilityType: 'Elevator' },
      },
      {
        id: 'fire-stairs',
        name: 'Emergency Fire Stairs',
        type: 'facility',
        subType: 'stairs',
        layer: 'safety' as LayerId,
        width: 140,
        height: 160,
        properties: { label: 'Fire Stairs', safetyType: 'Emergency Exit' },
      },
      {
        id: 'fire-extinguisher',
        name: 'Fire Extinguisher (CO2)',
        type: 'safety',
        subType: 'fireExtinguisher',
        layer: 'safety' as LayerId,
        width: 24,
        height: 24,
        properties: { label: 'FE', safetyType: 'Fire Extinguisher' },
      },
      {
        id: 'wifi-ap',
        name: 'Wi-Fi 6E Access Point',
        type: 'it',
        subType: 'wifi',
        layer: 'it' as LayerId,
        width: 32,
        height: 32,
        properties: { label: 'AP', itType: 'Wi-Fi AP' },
      },
      {
        id: 'server-rack',
        name: '42U Server Rack',
        type: 'it',
        subType: 'serverRack',
        layer: 'it' as LayerId,
        width: 80,
        height: 100,
        properties: { label: '42U Rack', itType: 'Server Rack' },
      },
    ],
  };

  const handleAddItem = (item: any) => {
    if (!canEditLayout || !floor) {
      alert('Your current user role does not have permission to modify physical floor layout.');
      return;
    }

    // Place at center of current view
    const centerX = Math.round((-panX + 500) / zoom / 20) * 20;
    const centerY = Math.round((-panY + 350) / zoom / 20) * 20;

    const newObj: FloorObjectDTO = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      floorId: floor.id,
      type: item.type,
      subType: item.subType,
      layer: item.layer,
      x: Math.max(40, centerX),
      y: Math.max(40, centerY),
      width: item.width,
      height: item.height,
      rotation: 0,
      geometry: { shape: 'rect' },
      properties: { ...item.properties },
      locked: false,
      hidden: false,
    };

    addObject(newObj);
  };

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-20 select-none">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-sky-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Symbol Library
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'layers'
              ? 'border-sky-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          CAD Layers
        </button>
      </div>

      {/* Tab 1: Library */}
      {activeTab === 'library' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Pill Buttons */}
          <div className="p-3 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium">
            {[
              { id: 'workstations', label: 'Workstations' },
              { id: 'rooms', label: 'Rooms' },
              { id: 'architecture', label: 'Walls' },
              { id: 'doors', label: 'Doors' },
              { id: 'furniture', label: 'Furniture' },
              { id: 'facilities', label: 'Facilities/IT' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Catalog Items Grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {((catalog as any)[selectedCategory] || []).map((item: any) => (
              <div
                key={item.id}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-xl p-3 flex items-center justify-between transition-all group"
              >
                <div>
                  <div className="font-semibold text-xs text-white group-hover:text-sky-400 transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.width} × {item.height} mm • {item.layer}
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
          <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 bg-slate-950/40">
            Click <Plus className="w-3 h-3 inline text-sky-400" /> to place objects directly onto the active floor coordinates.
          </div>
        </div>
      )}

      {/* Tab 2: Layers Manager */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Visibility & Lock Controls
          </div>
          {Object.entries(layers).map(([layerKey, lState]) => {
            const lid = layerKey as LayerId;
            return (
              <div
                key={lid}
                className="bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 flex items-center justify-between hover:bg-slate-800/80 transition-colors"
              >
                <div className="font-medium text-slate-200 capitalize">
                  {lid.replace('_', ' ')}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Lock Toggle */}
                  <button
                    onClick={() => setLayerLocked(lid, !lState.locked)}
                    title={lState.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className={`p-1 rounded hover:bg-slate-700 ${
                      lState.locked ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {lState.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => toggleLayer(lid)}
                    title={lState.visible ? 'Hide Layer' : 'Show Layer'}
                    className={`p-1 rounded hover:bg-slate-700 ${
                      lState.visible ? 'text-sky-400' : 'text-slate-500'
                    }`}
                  >
                    {lState.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
