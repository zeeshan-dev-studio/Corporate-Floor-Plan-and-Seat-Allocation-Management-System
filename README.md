# Corporate Floor Plan & Seat Allocation Management System

An enterprise-grade, high-performance web application designed for corporate and BPO office facilities managing hundreds or thousands of workstations, business programs, capacity planning, and CAD exports.

---

## Key Features

1. **Decoupled Architecture**:
   - **Layer A (Physical Architecture)**: Complete corporate floor layout with walls, glass partitions, 4 passenger elevators, fire emergency stairs, executive boardroom, 120-seat townhall auditorium, training center, cafeteria/pantry, MDF server room with 42U racks, meeting cabins, and reception with turnstiles.
   - **Layer B (Business Allocation & Capacity)**: Multi-program allocations (Amazon, McAfee, T-Mobile, Wayfair, Healthcare Global). Seat allocation and seat blocking are strictly orthogonal. De-allocation preserves physical geometry.
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
