# Corporate Floor Plan & Seat Allocation Management System

An enterprise-grade, high-performance web application designed for corporate and BPO office facilities managing hundreds or thousands of workstations, business programs, capacity planning, and CAD exports.

---

## Key Features

1. **Decoupled Architecture**:
   - **Layer A (Physical Architecture)**: Complete corporate floor layout with walls, glass partitions, 4 passenger elevators, fire emergency stairs, executive boardroom, 120-seat townhall auditorium, training center, cafeteria/pantry, MDF server room with 42U racks, meeting cabins, and reception with turnstiles.
   - **Layer B (Business Allocation & Capacity)**: Multi-program allocations (Rubber Duck Logistics, Sneaky Squirrel Security, Llama Telecom, Wobbly Table Retail, Happy Hippo Health). Seat allocation and seat blocking are strictly orthogonal. De-allocation preserves physical geometry.
2. **Vector SVG CAD Canvas Engine**:
   - Pan & zoom (0.15x to 4.0x) with mouse wheel zoom centering at cursor and spacebar pan.
   - Precision CAD rulers, 20px/100px grid, and snap-to-grid.
   - Marquee rubberband box selection across desks.
   - Interactive MiniMap navigator.
   - Operational View (color-coded program markup) vs. Architectural View (clean CAD blueprint).
   - 13 independent layers with show/hide, lock/unlock, and opacity controls.
3. **Bulk Operations & Capacity Planning**:
   - Floating bulk action toolbar with program breakdown badges.
   - Bulk program assignment with overwrite conflict warnings.
   - Bulk blocking with reasons, date ranges, and work order notes.
   - Bulk de-allocation and zone reassignment.
   - Slide-out capacity analytics drawer with required vs. usable capacity, shortage/surplus deltas, fulfillment bars, and date-aware capacity queries.
4. **Export & Import Suite**:
   - 5-sheet formatted Excel workbook (`Seat Master`, `Program Summary`, `Floor Summary`, `Allocation History`, `Blocked Seats`) with employee confidentiality masking toggle.
   - Excel import with validation for missing IDs, duplicate IDs, and unknown programs.
   - Print-ready CAD PDF (A4, A3, A2, A1; Landscape/Portrait) with title block, north arrow compass, program legend, scale bar, plus vector SVG and PNG downloads.
5. **Enterprise Governance**:
   - Point-in-time immutable floor snapshots with one-click restoration.
   - Full system audit trail tracking user, action, old/new values, and reason.
   - Granular role switching (Administrator, Facility Manager, Capacity Planner, Program Manager, Viewer).

---

## Designing a Floor

Use the tools at the top-left of the canvas to draw walls, glass partitions, rooms (rectangle or any polygon, including L/T/U shapes) and workstations. A workstation is a box that fills with seats automatically. Objects can be moved, resized, rotated and have their corners edited, and seats travel with their workstation. Press Save to store the layout. The full guide is in the app at `/features` (the **Guide** button in the top bar).

## Excel Floor Maps

Floors drawn in Excel can be read straight into the app (top bar: **Excel Map**).

How the workbook is read:

- **One bordered cell = one seat.** The text in the cell is the seat number (`A-001`). Empty cells are corridors.
- **The border colour is the category.** The `Legend` sheet lists each colour with its meaning: a program, Vacant, Non-usable or Support. A colour close to a legend colour still matches; anything else is reported, never silently dropped. If a cell has no border, its fill colour is used.
- **A merged, bordered block is a room** (meeting room, pantry, lift). Do not merge seat cells.
- The map sheet is the one named like *Floor Plan*; the `Legend` sheet has the columns Swatch, Hex, Meaning, Category, Program code.

In the app you can look at the map as HTML, fix categories and seat numbers (Select / Paint / Erase), download the result as Excel or a standalone HTML page, and either:

- **Create a new floor** from it. Seat A-001 becomes `<prefix>-A-001`.
- **Update this floor**: each seat number in the map is matched to the same seat on the open floor (`A-001` becomes `<this floor's prefix>-A-001`) and the map's colours are applied. Program colours assign the seat to that program, Vacant clears it, Non-usable blocks it. Seat positions never change. Seats that have an employee assigned are left alone unless you untick that option. Seats missing from the map are untouched. A restore point named "Before Excel colour update" is saved first (Version Manager), and the change is written to the audit log.

Try it: press **Use sample** in the dialog, or run `npm run sample:excel` to write `samples/Sample-Floor-Plan.xlsx` and `samples/Sample-Floor-Plan.html`. `npm run check:excel-map` checks that a workbook survives write, read and compare.

## Tech Stack

- **Framework**: Next.js (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons
- **State Management**: Zustand
- **Database & ORM**: Prisma ORM with SQLite (PostgreSQL compatible)
- **Exports**: ExcelJS, jsPDF

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed
```bash
npx prisma db push
npm run seed
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Production Build

```bash
npm run build
npm run start
```
