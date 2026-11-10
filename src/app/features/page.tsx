import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: 'Features & Guide | Floor Plan & Seat Allocation',
  description: 'What the floor plan and seat allocation system can do, and how to use it.',
};

const TOC = [
  ['overview', 'Overview'],
  ['quickstart', 'Quick start'],
  ['design', 'Designing a floor'],
  ['rooms', 'Rooms of any shape'],
  ['workstations', 'Workstations & seats'],
  ['editing', 'Moving, sizing & aligning'],
  ['allocation', 'Seat allocation'],
  ['excel', 'Excel in and out'],
  ['analytics', 'Capacity analytics'],
  ['export', 'Exports'],
  ['history', 'Snapshots & audit'],
  ['roles', 'Roles'],
  ['keys', 'Keyboard shortcuts'],
  ['limits', 'Good to know'],
] as const;

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-6 mb-12">
    <h2 className="text-xl font-bold text-slate-50 mb-4 pb-2 border-b border-slate-800">{title}</h2>
    <div className="space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <h3 className="font-semibold text-slate-50 mb-1.5">{title}</h3>
    <div className="text-slate-400 text-[13px] leading-relaxed space-y-1.5">{children}</div>
  </div>
);

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200">{children}</kbd>
);

const Steps: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ol className="space-y-2">
    {items.map((t, i) => (
      <li key={i} className="flex gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
        <span>{t}</span>
      </li>
    ))}
  </ol>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left font-semibold text-slate-400 uppercase text-[10px] tracking-wider py-2 pr-4 border-b border-slate-800">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <td className={`py-2 pr-4 border-b border-slate-800/60 align-top ${strong ? 'text-slate-50 font-medium' : ''}`}>{children}</td>
);

const frame = 'rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col items-center gap-1.5';

const ShapeDemos = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <rect x="8" y="8" width="104" height="74" fill="rgba(14,116,144,0.12)" stroke="#1e293b" strokeWidth="3" rx="2" />
      </svg>
      <figcaption className="text-[11px] text-slate-400">Rectangle</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <polygon points="8,8 60,8 60,44 112,44 112,82 8,82" fill="rgba(14,116,144,0.12)" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <figcaption className="text-[11px] text-slate-400">L-shape</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <polygon points="10,10 34,10 34,50 86,50 86,10 110,10 110,82 10,82" fill="rgba(14,116,144,0.12)" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <figcaption className="text-[11px] text-slate-400">U-shape</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <polygon points="10,70 22,22 58,10 100,26 108,60 70,80" fill="rgba(14,116,144,0.12)" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        {[[10, 70], [22, 22], [58, 10], [100, 26], [108, 60], [70, 80]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#b45309" />
        ))}
      </svg>
      <figcaption className="text-[11px] text-slate-400">Any shape you draw</figcaption>
    </figure>
  </div>
);

const Chair: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <circle r="7" fill="#ffffff" stroke="#334155" strokeWidth="1.2" />
    <path d="M -9 6 Q 0 13 9 6" fill="none" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
  </g>
);

const SeatDemos = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <rect x="14" y="22" width="92" height="46" rx="4" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
        <Chair x={37} y={38} r={180} /><Chair x={83} y={38} r={180} />
        <Chair x={37} y={52} /><Chair x={83} y={52} />
      </svg>
      <figcaption className="text-[11px] text-slate-400">4-seat pod, chairs facing</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <rect x="6" y="30" width="108" height="30" rx="4" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
        {[20, 38, 56, 74, 92, 108].map((x) => (
          <Chair key={x} x={x - 1} y={45} />
        ))}
      </svg>
      <figcaption className="text-[11px] text-slate-400">Single-row bench</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <circle cx="60" cy="45" r="36" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
        {Array.from({ length: 6 }).map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          return <Chair key={i} x={60 + 24 * Math.cos(a)} y={45 + 24 * Math.sin(a)} r={(a * 180) / Math.PI - 90} />;
        })}
      </svg>
      <figcaption className="text-[11px] text-slate-400">Round table, seats around</figcaption>
    </figure>
    <figure className={frame}>
      <svg viewBox="0 0 120 90" className="w-full max-w-[140px]">
        <polygon points="14,14 60,14 60,44 106,44 106,76 14,76" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
        <Chair x={37} y={29} r={180} /><Chair x={37} y={60} /><Chair x={83} y={60} />
      </svg>
      <figcaption className="text-[11px] text-slate-400">L-shaped pod</figcaption>
    </figure>
  </div>
);

export default function FeaturesPage() {
  return (
    <div className="h-screen overflow-y-auto bg-white text-slate-200">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="font-bold text-slate-50 text-sm">Floor Plan &amp; Seat Allocation: Features and Guide</div>
          <Link href="/" className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold">
            Open the app
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 flex gap-10">
        <nav aria-label="On this page" className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-20 space-y-1 text-[13px]">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">On this page</div>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block px-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-50 hover:bg-slate-800/70">
                {label}
              </a>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1 max-w-3xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Plan the floor. Place the seats. Allocate them to programs.</h1>
            <p className="mt-3 text-slate-400 text-[15px] leading-relaxed">
              Draw an office floor the way it really is: rooms of different sizes and shapes, walls, doors, and workstations with their seats. Then
              assign those seats to programs, block the ones that cannot be used, and track capacity across floors.
            </p>
          </div>

          <Section id="overview" title="Overview">
            <div className="grid md:grid-cols-2 gap-3">
              <Card title="The floor drawing">
                <p>Rooms, walls, glass partitions, doors, furniture, lifts, IT and safety equipment, and the workstations with their seats. Edited on the canvas and stored when you press <b>Save</b>.</p>
              </Card>
              <Card title="The seat allocation">
                <p>Which program uses each seat, for which shift and from which date, plus blocked seats. Allocation actions are saved straight away and written to the audit trail.</p>
              </Card>
            </div>
            <p>
              Drawing units are simple: <b>10 units = 1 foot</b>. Sizes in the panels are shown in feet, the grid is 2 ft, and room areas are worked out from the drawn
              shape, so they always agree with what you see.
            </p>
          </Section>

          <Section id="quickstart" title="Quick start">
            <Steps
              items={[
                <>Choose a floor from the floor switcher at the top, or create one from an Excel map (see <a className="text-sky-400 hover:underline" href="#excel">Excel in and out</a>).</>,
                <>Set the drawing area under <b>Floor size</b> in the right-hand panel (click empty floor so nothing is selected).</>,
                <>Draw rooms with the room tools at the top-left of the canvas, then add walls and doors.</>,
                <>Add workstations from the library, or press <Key>B</Key> and drag a box. Seats appear inside it automatically.</>,
                <>Press <b>Save</b> (the dot beside it means there is unsaved work).</>,
                <>Drag a box over seats, then <b>Assign Program</b>. Open <b>Capacity</b> to see shortages and utilization.</>,
              ]}
            />
          </Section>

          <Section id="design" title="Designing a floor">
            <p>The drawing tools sit at the top-left of the canvas. Each one has a shortcut key and shows a one-line hint while it is active.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr><Th>Tool</Th><Th>Key</Th><Th>How it works</Th></tr>
                </thead>
                <tbody>
                  <tr><Td strong>Select</Td><Td><Key>V</Key></Td><Td>Click to select. Drag a selected object to move it. Drag on empty floor to box-select seats.</Td></tr>
                  <tr><Td strong>Pan</Td><Td><Key>H</Key></Td><Td>Drag to move the view. <Key>Space</Key> or the middle mouse button also pan.</Td></tr>
                  <tr><Td strong>Wall</Td><Td><Key>W</Key></Td><Td>Drag from one end to the other. Walls can run at any angle; near-straight ones snap straight.</Td></tr>
                  <tr><Td strong>Glass partition</Td><Td><Key>G</Key></Td><Td>Same as a wall, drawn as glass.</Td></tr>
                  <tr><Td strong>Room (rectangle)</Td><Td><Key>R</Key></Td><Td>Drag a box. Change its shape later in the right-hand panel.</Td></tr>
                  <tr><Td strong>Room (any shape)</Td><Td><Key>P</Key></Td><Td>Click each corner; double-click, <Key>Enter</Key> or click the first point to finish.</Td></tr>
                  <tr><Td strong>Workstation</Td><Td><Key>B</Key></Td><Td>Drag an area: it fills with BPO-style benches (up to 8 seats a side, two rows facing each other, aisles between). A small box gives a single bench.</Td></tr>
                  <tr><Td strong>Single seat</Td><Td><Key>S</Key></Td><Td>Click to drop a loose seat. Click again for more, <Key>Esc</Key> to stop.</Td></tr>
                </tbody>
              </table>
            </div>
            <p>
              The <b>Symbol Library</b> on the left holds ready-made items in real sizes: ten workstation types, fifteen room types, walls, doors, furniture, lifts, stairs, Wi-Fi
              points, racks and extinguishers. Click <b>+</b> to place one in the middle of your view, then drag, resize or rotate it.
            </p>
            <p>
              The <b>Layers</b> tab shows, hides and locks each kind of object, and sets its opacity. A locked layer cannot be clicked, so you can work on desks without
              disturbing walls. <b>Operational</b> view colours seats by program; <b>Architectural</b> view shows a clean drawing.
            </p>
          </Section>

          <Section id="rooms" title="Rooms of any size and shape">
            <p>
              Real offices are not all rectangles. Every room can be a rectangle, an L, T or U shape, a cut-corner room, an oval, or any polygon you draw. Pick the shape in the
              right-hand panel, or draw a custom one with the <b>Room (any shape)</b> tool.
            </p>
            <ShapeDemos />
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Reshape:</b> select a room, then drag the yellow corners. Drag a blue dot on an edge to add a corner. <Key>Alt</Key>+click a corner removes it.</li>
              <li><b>Resize and rotate:</b> use the square handles and the round handle above the room (hold <Key>Shift</Key> for 15° steps). Or type exact feet and degrees in the panel.</li>
              <li><b>Details:</b> room type (cabin, meeting room, cafeteria, server room and more), capacity in people, and a colour. The area in square feet is calculated for you.</li>
              <li>Dragging inside a room that is not selected draws a selection box, so you can still pick the desks in it. Click the room first, then drag, to move the room.</li>
            </ul>
          </Section>

          <Section id="workstations" title="Workstations and seats">
            <p>
              A workstation is the desk surface; the chairs on it are the <b>seats</b> that get allocated. Placing a workstation creates its seats, with permanent IDs that continue
              the floor&apos;s numbering (for example <code className="text-sky-300">CHN-F03-A-129</code>).
            </p>
            <SeatDemos />
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>BPO-style defaults:</b> seats sit 4.5 ft apart in two rows either side of a divider screen, in benches of 6, 8, 10, 12 or 16 seats. Leave about 5 ft between benches and 6 ft on main aisles.</li>
              <li><b>Any size:</b> the library has single desks, pairs, clusters, benches, wall rows and tables. For anything else, drag an area with the Workstation tool.</li>
              <li><b>Any shape:</b> rectangle, L, T, U, cut corner or round. Seats are only placed where the shape has room; you are told if it cannot hold them all.</li>
              <li><b>Layout:</b> choose the number of seats and rows, whether seats are in rows or around the edge (round tables), and whether chairs face each other or the same way.</li>
              <li><b>Seat types:</b> standard, hot desk, team lead, ops manager or accessible. Non-standard seats show a small badge.</li>
              <li><b>Moves with the desk:</b> move, rotate or resize a workstation and its seats follow. Allocations are kept when you change the layout.</li>
              <li><b>Individual seats:</b> drag a single seat to fine-tune it, delete it, or add loose seats with the Single seat tool.</li>
              <li><b>Save first:</b> new seats become allocatable after you press Save. Deleting seats that are allocated asks you to confirm.</li>
            </ul>
          </Section>

          <Section id="editing" title="Moving, sizing and aligning">
            <div className="grid md:grid-cols-2 gap-3">
              <Card title="On the canvas">
                <p>Drag to move. Drag the square handles to resize (the opposite edge stays put, even when rotated). Drag the round handle to rotate. Everything snaps to the 2 ft grid; turn that off with the grid button in the top bar.</p>
              </Card>
              <Card title="With the keyboard">
                <p><Key>←</Key><Key>↑</Key><Key>→</Key><Key>↓</Key> nudge the selection. <Key>Shift</Key> moves a full grid step, <Key>Alt</Key> moves 1 unit. <Key>Ctrl</Key>+<Key>D</Key> duplicates, <Key>Del</Key> deletes.</p>
              </Card>
              <Card title="Several objects">
                <p>Shift+click to select more. Drag moves them as a group. The right-hand panel aligns them (left, centre, right, top, middle, bottom).</p>
              </Card>
              <Card title="Undo and redo">
                <p><Key>Ctrl</Key>+<Key>Z</Key> and <Key>Ctrl</Key>+<Key>Shift</Key>+<Key>Z</Key> step through layout edits: objects, seats and their positions. Allocations are saved immediately and are not part of undo.</p>
              </Card>
            </div>
            <p>Lock an object (right-hand panel) to protect it from being moved, resized or deleted. Hidden objects stay on the floor but are not drawn.</p>
          </Section>

          <Section id="allocation" title="Seat allocation">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Select seats:</b> click one, Shift+click to add, drag a box over many, or use the selection bar to pick all seats of a zone, a workstation, a program or a status. <Key>Ctrl</Key>+<Key>A</Key> selects every seat.</li>
              <li><b>Assign a program</b> with a shift and an effective date, <b>remove</b> allocations, <b>block</b> seats (maintenance, IT issue, cleaning, reserved, construction and more, with dates) and <b>unblock</b> them.</li>
              <li><b>Zones:</b> move selected seats into another zone.</li>
              <li><b>Filters:</b> dim everything except one program, or only allocated, vacant or blocked seats.</li>
              <li><b>As-of date:</b> in the Capacity panel, view the floor as it stands on any date.</li>
              <li><b>Search:</b> find a seat or an employee in the top bar and jump to it.</li>
            </ul>
          </Section>

          <Section id="excel" title="Excel in and out">
            <div className="grid md:grid-cols-2 gap-3">
              <Card title="Import allocations">
                <p>Upload a sheet of seat IDs with program, employee, shift and dates. The file is checked first and every problem is listed row by row; nothing is saved until you confirm.</p>
              </Card>
              <Card title="Excel floor maps">
                <p>Floors drawn in Excel, with a coloured border per cell, are read directly. One bordered cell is one seat, the colour tells the program, vacant, non-usable or support. See the map as HTML, fix it, then:</p>
                <ul className="list-disc pl-4">
                  <li><b>Create new floor</b> from it, or</li>
                  <li><b>Update this floor</b>: match seat numbers to the open floor and apply the colours. Seats with employees are left alone unless you say otherwise, and a restore point is saved first.</li>
                </ul>
              </Card>
            </div>
          </Section>

          <Section id="analytics" title="Capacity analytics">
            <p>
              The <b>Capacity</b> panel compares what each program needs with what it has: allocated, blocked, available, shortage or surplus, and utilization. A seat counts as used
              only when it has a program and is not blocked. The right-hand panel shows the same totals for the floor.
            </p>
          </Section>

          <Section id="export" title="Exports">
            <p>
              Export the floor as a <b>PDF</b> (paper size, orientation, legend and title block), <b>PNG</b>, <b>SVG</b>, or an <b>Excel</b> workbook (seat master, program summary, floor summary, allocation history and blocked seats). The picture always covers the whole floor, not just what is on screen. Employee names can be masked for external audiences.
            </p>
          </Section>

          <Section id="history" title="Snapshots and audit trail">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Snapshots</b> save the whole floor (layout, seats, allocations, blocks). Restoring one first saves the current state as an automatic backup, so a restore can itself be undone.</li>
              <li><b>Audit trail</b> records who did what and when: allocations, blocks, imports, layout saves, restores.</li>
            </ul>
          </Section>

          <Section id="roles" title="Roles">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr><Th>Role</Th><Th>Can</Th></tr>
                </thead>
                <tbody>
                  <tr><Td strong>Administrator</Td><Td>Everything: design the layout, allocate, block, import.</Td></tr>
                  <tr><Td strong>Facility Manager</Td><Td>Design the layout, block and unblock seats, change zones.</Td></tr>
                  <tr><Td strong>Capacity Planner</Td><Td>Allocate and remove allocations.</Td></tr>
                  <tr><Td strong>Program Manager</Td><Td>Allocate and remove allocations.</Td></tr>
                  <tr><Td strong>Viewer</Td><Td>Look, search, filter and export.</Td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400">The role is chosen from the switch in the top bar. There is no sign-in yet, so treat roles as a guard against mistakes, not as security.</p>
          </Section>

          <Section id="keys" title="Keyboard shortcuts">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[13px]">
              {[
                ['V  H  W  G  R  P  B  S', 'Choose a tool'],
                ['Esc', 'Cancel drawing, clear selection'],
                ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
                ['Ctrl + D', 'Duplicate selection'],
                ['[  and  ]', 'Hide or show the library panel (left) and the details panel (right)'],
                ['Backslash', 'Hide or show both panels at once, for a full-screen canvas'],
                ['Delete', 'Delete selection'],
                ['Arrow keys', 'Nudge (Shift = grid step, Alt = 1 unit)'],
                ['Ctrl + A', 'Select all seats'],
                ['+  /  -', 'Zoom in / out'],
                ['Mouse wheel', 'Zoom at the pointer'],
                ['Space + drag', 'Pan'],
                ['Enter', 'Finish a polygon room'],
                ['Backspace', 'Remove the last polygon corner'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">{v}</span>
                  <span className="font-mono text-[11px] text-slate-200 text-right">{k}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="limits" title="Good to know">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Layout edits stay on your screen until you press <b>Save</b>. The page warns you before you close it with unsaved work.</li>
              <li>Allocation changes (assign, block, import) are saved immediately.</li>
              <li>Seat IDs are permanent and unique. Saving fails with a clear message if two seats would share an ID.</li>
              <li>Deleting a workstation deletes its seats and their allocations, after you confirm.</li>
              <li>The drawing area is a flat canvas with fixed units, not a CAD file import. Draw it here, or bring seats in from an Excel map.</li>
            </ul>
          </Section>

          <div className="pt-4 pb-16 text-center">
            <Link href="/" className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold">
              Open the app
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
