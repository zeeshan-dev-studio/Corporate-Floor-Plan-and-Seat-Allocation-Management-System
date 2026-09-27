# Code Review: Bugs and Improvements

Reviewed 2026-09-25 at commit `22d299f`. Items 1–6 were fixed the same day; line references below point to the current code.

How this was checked: every file in `src/` and `prisma/` was read; `tsc --noEmit` and `next build` were run (both pass); `npm audit` was run; and the app was used in a browser at 1440x900. Items marked **Verified** were reproduced in the running app. The rest come from reading the code. The fixes for 1–6 were tested in a separate copy of the project, so no real data was touched.

Contents: [P0 fix first](#p0--fix-first) · [P1 important bugs](#p1--important-bugs) · [P2 minor bugs and polish](#p2--minor-bugs-and-polish) · [Performance](#performance) · [Engineering and tooling](#engineering-and-tooling) · [Missing features](#missing-features) · [Suggested order](#suggested-order)

---

## P0 — Fix first

### 1. Restoring the built-in baseline snapshot deleted the whole floor — Fixed
Was: the seeded snapshot "v1.0 - Q3 Baseline Layout" only held totals, and restore deleted every seat, allocation and object before finding nothing to rebuild from (532 seats gone, reported as "Successfully restored").

Now: restore refuses a snapshot that has no layout data ("...can't be restored. Nothing was changed."). Before every restore it saves the current floor as the snapshot "Auto-backup before restore", so any restore can be undone. The seed creates a full baseline snapshot, and loading the floor no longer reads snapshot contents. Databases seeded before this fix still hold the old, empty baseline: restoring it shows the error, and `start-app.bat reset` replaces it with a working one (this erases all data).
- Where: [floorSnapshot.ts](src/lib/floorSnapshot.ts), [versions/route.ts:79-100](src/app/api/versions/route.ts#L79), [seed.ts:1223](prisma/seed.ts#L1223)

### 2. "Confirm Allocation" did nothing the first time — Fixed
Was: the dialog's program state was set before programs loaded, so it stayed empty while the dropdown displayed the first program, and Confirm silently returned.

Now: until you choose, the dialog uses the program the dropdown shows. Confirm is disabled only when there are no programs at all.
- Where: [BulkAssignModal.tsx:28](src/components/modals/BulkAssignModal.tsx#L28)

### 3. The building outline hid every room and blocked box-selection — Fixed
Was: the 2720x1720 building envelope was a filled rectangle drawn over the rooms, so room outlines and labels were hidden and every click inside the building hit the wall.

Now: walls whose geometry says `fill: "none"` (the envelope) are drawn as outlines, so rooms are visible. A selection box can start on empty floor or inside a room, since several desks sit inside rooms (see P2). A plain click inside a room still selects the room, and the click that ends a box drawn inside a room no longer replaces the selection.
- Where: [FloorObjectElement.tsx:89](src/components/canvas/FloorObjectElement.tsx#L89), [FloorPlanCanvas.tsx:203](src/components/canvas/FloorPlanCanvas.tsx#L203), [:383](src/components/canvas/FloorPlanCanvas.tsx#L383)

### 4. Deleting objects was never saved — Fixed
Was: Delete only removed objects from the screen; Save never deleted anything, so they came back on reload.

Now: Save deletes every object that was saved before but is no longer on the plan (deleted, or an add that was undone), scoped to the floor. An object deleted by an earlier save and brought back with undo is re-created with its original id.
- Where: [useFloorPlanStore.ts:515](src/store/useFloorPlanStore.ts#L515), [objects/route.ts:92-126](src/app/api/objects/route.ts#L92)

### 5. Every Save duplicated newly added objects — Fixed
Was: new objects kept their `temp-...` ids after saving, so each Save created them again.

Now: Save returns the new database ids, and the editor swaps them in everywhere, including undo history.
- Where: [useFloorPlanStore.ts:539](src/store/useFloorPlanStore.ts#L539)

### 6. Canvas keyboard shortcuts kept working behind open dialogs — Fixed
Was: Esc cleared the selection and left the dialog flagged open (so it popped up on the next seat click); Ctrl+A widened a 1-seat assignment to all 532 seats; Delete and +/- acted on the canvas.

Now: while a dialog is open, canvas shortcuts are ignored and Esc closes the dialog, keeping the selection. Clearing the selection also closes the dialogs that act on it.
- Where: [FloorPlanCanvas.tsx:93](src/components/canvas/FloorPlanCanvas.tsx#L93), [useFloorPlanStore.ts:168](src/store/useFloorPlanStore.ts#L168), [:332](src/store/useFloorPlanStore.ts#L332)

### 7. Next.js 14.2.15 has critical vulnerabilities, including remote code execution on Windows — Verified with `npm audit`
- [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) (published 2026-09-08): unauthenticated remote code execution for Pages and App Router apps served from Windows. There is no workaround. It is fixed only in **15.5.24+ / 16.3.3+**, so patching to 14.2.35 does not help.
- Also: a critical middleware bypass (not exploitable here, since there is no middleware), a dev-server information leak, several denial-of-service, SSRF and cache-poisoning issues, plus `postcss` (high) and `uuid` via `exceljs` (moderate).
- Already mitigated: `start-app.bat` binds the server to 127.0.0.1, so it isn't reachable from other machines.
- Fix: upgrade to Next 15.5.26 (the maintained 15.x line) or 16.3.6 (latest). Either needs React 19. Also `params` in [floors/[id]/route.ts:7-12](src/app/api/floors/%5Bid%5D/route.ts#L7) becomes a Promise, and `experimental.serverComponentsExternalPackages` in [next.config.js:5](next.config.js#L5) becomes `serverExternalPackages`.

### 8. No sign-in; roles and audit users are whatever the browser sends
The role dropdown is the only access control, and it lives in the browser. Every API route takes `user`/`userRole` from the request body and never checks them. Anyone who can reach the server can change or delete anything and put any name in the audit trail, so the audit trail can't be trusted.
- Where: [TopNavBar.tsx:335-348](src/components/navigation/TopNavBar.tsx#L335), e.g. [bulk-assign/route.ts:7-15](src/app/api/allocation/bulk-assign/route.ts#L7)
- Fix (before anyone else uses it): real sign-in (for a corporate app, Microsoft Entra ID via Auth.js is typical), role checks in every API route, and the audit user taken from the session.

---

## P1 — Important bugs

### 9. PNG and PDF exports are a tiny crop of the screen — Verified
The canvas `<svg>` has no `width`, `height` or `viewBox`, so the serialized image loads at the browser default of 300x150. The "high-res" PNG comes out at 600x300 and shows only the top-left corner of the current view, and the PDF embeds the same crop. SVG export keeps the current pan/zoom, so it also shows only what is on screen. The dialog's Operational/Architectural choice is ignored (exports always match the on-screen mode), and selection and hover rings are included.
- Where: [pdf.ts:52-61](src/lib/export/pdf.ts#L52), [:93-103](src/lib/export/pdf.ts#L93), [:318-352](src/lib/export/pdf.ts#L318), [FloorPlanCanvas.tsx:305-310](src/components/canvas/FloorPlanCanvas.tsx#L305)
- Fix: build a dedicated export SVG: clone it, drop the pan/zoom transform, set `viewBox`/`width`/`height` to the floor size, strip selection UI, and render in the chosen mode.

### 10. The importer can't read the app's own Excel export — Verified
Rows with Program "Unallocated" (every vacant seat in an export) fail as "Unknown Program". The export's "Employee Name" column is ignored because the importer only knows "Employee", so names are dropped. Also:
- A row with a Seat ID but a *blank* Program de-allocates that seat on commit. The preview shows only 8 rows, so this is easy to miss, and it's inconsistent with rejecting an explicit "Unallocated".
- Header cells are read with `eachCell` (which skips empty cells) but looked up by column number, so one blank header shifts every later column.
- Commit trusts the `dbSeatId`/`programId` values sent back by the browser without re-validating them.
- `.xls` files are offered, but ExcelJS can't read them. The Zone column is parsed and then ignored.
- Where: [import/excel/route.ts:41-65](src/app/api/import/excel/route.ts#L41), [:109-141](src/app/api/import/excel/route.ts#L109), [ExcelImportModal.tsx:56-66](src/components/modals/ExcelImportModal.tsx#L56), [:164](src/components/modals/ExcelImportModal.tsx#L164), [excel.ts:49-64](src/lib/export/excel.ts#L49)
- Fix: treat "Unallocated" and blank the same way, explicitly; accept both header names; map headers by column number; re-validate on commit; accept only `.xlsx`.

### 11. Excel export has wrong or missing data
- The Zone column is guessed from the bay code, so every Y-bay seat shows "Zone BAY".
- The "Allocation History" sheet is always empty, because the store's `auditLogs` is never filled.
- Area, surplus and utilization are written as text, so they can't be summed or sorted.
- Where: [excel.ts:75](src/lib/export/excel.ts#L75), [:135-136](src/lib/export/excel.ts#L135), [:176](src/lib/export/excel.ts#L176), [useFloorPlanStore.ts:186](src/store/useFloorPlanStore.ts#L186), [ExportModal.tsx:56](src/components/modals/ExportModal.tsx#L56)
- Fix: map `zoneId` to the zone name; fetch `/api/audit-logs` at export time; write numbers as numbers with number formats.

### 12. Utilization counts blocked seats as used — Verified
Utilization is computed as allocated seats (including 21 that are allocated but blocked) divided by (total - blocked), which gives 478/506 = 94%. Counting only usable allocated seats gives 457/506 = 90%, and the current formula can exceed 100%. The dashboard's stacked bar adds 478 + 26 + 49 = 553 of 532 seats, so it overflows, and with zero seats it divides by zero.
- Where: [floors/[id]/route.ts:208-214](src/app/api/floors/%5Bid%5D/route.ts#L208), [CapacityDashboard.tsx:32-38](src/components/analytics/CapacityDashboard.tsx#L32), [:121-137](src/components/analytics/CapacityDashboard.tsx#L121)
- Fix: use mutually exclusive categories: allocated and usable, blocked, vacant.

### 13. Hover tooltip and ruler cursor are drawn in the wrong place — Verified
The cursor is stored in page coordinates but drawn inside the canvas, so the tooltip appears 288 px right and 55 px below the pointer (the sidebar width and header height), and the ruler's cursor marker is 288 px off.
- Where: [FloorPlanCanvas.tsx:219](src/components/canvas/FloorPlanCanvas.tsx#L219), [:575-580](src/components/canvas/FloorPlanCanvas.tsx#L575), [Rulers.tsx:69-76](src/components/canvas/Rulers.tsx#L69), [:95-101](src/components/canvas/Rulers.tsx#L95)
- Fix: subtract the canvas container's bounding rect.

### 14. Ctrl+scroll and trackpad pinch also zoom the browser page — Verified
React registers wheel listeners as passive, so `preventDefault()` in `handleWheel` has no effect.
- Where: [FloorPlanCanvas.tsx:162-164](src/components/canvas/FloorPlanCanvas.tsx#L162), [:285](src/components/canvas/FloorPlanCanvas.tsx#L285)
- Fix: add a native `wheel` listener with `{ passive: false }` in a `useEffect`.

### 15. Most layer controls do nothing
The canvas groups objects by *type* and checks a layer toggle chosen per group, not the `layer` stored on the object:
- The Walls, Glass, Dimensions and Allocation toggles are never read.
- Fire stairs (layer "safety") follow the Facilities toggle, and the service core (layer "architecture") follows Rooms.
- Lock is never enforced, and there is no opacity control, although the README lists both.
- Where: [FloorPlanCanvas.tsx:370-515](src/components/canvas/FloorPlanCanvas.tsx#L370), [ObjectLibrarySidebar.tsx:416-452](src/components/library/ObjectLibrarySidebar.tsx#L416)
- Fix: render and filter by `obj.layer`, honour visible/locked/opacity, and add an opacity slider.

### 16. Objects can't be dragged on the canvas
The drag handlers exist, but `setDraggingObjectId` is only ever called with `null`, so only the X/Y fields can move objects. If it were wired up as written, every mouse move would push a deep copy of all seats and objects into undo history.
- Where: [FloorPlanCanvas.tsx:235-246](src/components/canvas/FloorPlanCanvas.tsx#L235), [:264-266](src/components/canvas/FloorPlanCanvas.tsx#L264), [useFloorPlanStore.ts:434-439](src/store/useFloorPlanStore.ts#L434)
- Fix: start the drag on object mousedown and push history once when the drag starts.

### 17. Workstations and seats aren't connected
Placing a bench from the library creates a desk with no seats, and the UI has no way to add seats. Moving a bay leaves its seats behind, because seats have absolute coordinates. Deleting a bay also leaves its seats (and now that deletes are saved, those seats lose their bay link).
- Where: [ObjectLibrarySidebar.tsx:291-319](src/components/library/ObjectLibrarySidebar.tsx#L291), [floorplan.ts:142-144](src/types/floorplan.ts#L142)
- Fix: generate seats from the template's capacity when placing a bay, and move and delete seats together with their bay.

### 18. Undo mixes local layout with server data
Undo history stores seats, but allocations live on the server, so undo can show allocations that no longer exist in the database. Reloading never clears the history, so after a snapshot restore, an import or a bulk action, undo brings back the layout from before the reload, and Save then writes it back.
- Where: [useFloorPlanStore.ts:402-432](src/store/useFloorPlanStore.ts#L402), [:482-508](src/store/useFloorPlanStore.ts#L482)
- Fix: limit undo to layout objects and clear it whenever the floor is reloaded.

### 19. The Zone menu closes before you can click it — Verified
It opens on hover with an 8 px gap above the button, and moving the pointer into the gap closes it.
- Where: [BulkActionBar.tsx:156-176](src/components/allocation/BulkActionBar.tsx#L156)
- Fix: open it on click (or remove the gap), and confirm the move.

### 20. The toolbar doesn't fit a 1440 px screen — Verified
The header needs 1573 px, so the Role switcher is cut off (only 32 px visible), and the search box is squeezed to about the width of its icon. Focusing an off-screen control also scrolls the whole workspace sideways. The subtitle "35,000 Sq Ft • 532 Total Workstations" is hard-coded, and so are the fallback building and floor names.
- Where: [TopNavBar.tsx:92](src/components/navigation/TopNavBar.tsx#L92), [:101-107](src/components/navigation/TopNavBar.tsx#L101)
- Fix: move secondary actions into a menu, add responsive breakpoints, and read the numbers from the floor data.

### 21. Dates are off by a day, and history is deleted
- Default dates use UTC (`toISOString().split('T')[0]`), so in the evening in the Americas, or the early morning in Asia, "today" is the wrong day.
- Assigning a program deletes all earlier allocations for those seats, so a future-dated assignment makes the seat show as vacant today. Unblocking deletes the block record, and the `active` flag is never used. There is no real allocation or block history, even though the app advertises date-aware capacity.
- After an import or snapshot action the floor reloads without the chosen "as of" date, so the picker shows one date while the data reflects today.
- A block's end date can be earlier than its start date.
- Where: [useFloorPlanStore.ts:198](src/store/useFloorPlanStore.ts#L198), [BulkAssignModal.tsx:18-20](src/components/modals/BulkAssignModal.tsx#L18), [BulkBlockModal.tsx:16-18](src/components/modals/BulkBlockModal.tsx#L16), [bulk-assign/route.ts:62-66](src/app/api/allocation/bulk-assign/route.ts#L62), [bulk-unblock/route.ts:21-24](src/app/api/allocation/bulk-unblock/route.ts#L21), [ExcelImportModal.tsx:121](src/components/modals/ExcelImportModal.tsx#L121), [VersionSnapshotModal.tsx:47](src/components/history/VersionSnapshotModal.tsx#L47), [:82](src/components/history/VersionSnapshotModal.tsx#L82)
- Fix: add a local-date helper; end-date old allocations instead of deleting them; deactivate blocks instead of deleting them; always pass `asOfDate`; validate date ranges.

### 22. Errors are swallowed
Failed loads, and network errors during bulk actions, only reach the browser console (Save now reports its failures). An empty or unreachable database shows a blank canvas under a hard-coded building name. The APIs have no input validation: `/api/audit-logs?limit=abc` returns a 500 (Verified), `limit` has no maximum, bad dates cause 500s, and raw Prisma error messages are sent to the browser. `alert()` and `confirm()` are used throughout.
- Where: [useFloorPlanStore.ts:482-699](src/store/useFloorPlanStore.ts#L482), [page.tsx:23-40](src/app/page.tsx#L23), [audit-logs/route.ts:9](src/app/api/audit-logs/route.ts#L9)
- Fix: validate input in each route (for example with zod), return consistent error responses, and add toasts and an empty state.

### 23. Reloading the floor throws away unsaved layout edits
Every bulk action (assign, remove, block, unblock, zone), Excel import and snapshot action reloads the floor and replaces the objects with the saved ones. Any layout change made since the last Save (moves, adds, deletes) disappears without warning.
- Where: [useFloorPlanStore.ts:494](src/store/useFloorPlanStore.ts#L494), called from [:578](src/store/useFloorPlanStore.ts#L578), [:605](src/store/useFloorPlanStore.ts#L605), [:636](src/store/useFloorPlanStore.ts#L636), [:663](src/store/useFloorPlanStore.ts#L663), [:690](src/store/useFloorPlanStore.ts#L690), [ExcelImportModal.tsx:121](src/components/modals/ExcelImportModal.tsx#L121), [VersionSnapshotModal.tsx:47](src/components/history/VersionSnapshotModal.tsx#L47), [:82](src/components/history/VersionSnapshotModal.tsx#L82)
- Fix: track unsaved layout changes, and either reload only seats after allocation changes or ask before discarding edits.

---

## P2 — Minor bugs and polish

- **Invalid Tailwind classes** (Verified): `border-slate-750`, `border-slate-850` and `bg-slate-900/98` don't exist, so cards get light-gray borders on the dark theme. `animate-in`, `fade-in` and `slide-in-*` need the `tailwindcss-animate` plugin, which isn't installed. [ObjectLibrarySidebar.tsx:381](src/components/library/ObjectLibrarySidebar.tsx#L381), [:421](src/components/library/ObjectLibrarySidebar.tsx#L421), [PropertiesPanel.tsx:259](src/components/inspector/PropertiesPanel.tsx#L259), [CapacityDashboard.tsx:41](src/components/analytics/CapacityDashboard.tsx#L41)
- **Demo layout overlaps**, visible now that rooms render: 12 of Zone A's 16 benches sit inside the auditorium, the lower Zone C pods sit inside the training room, and meeting rooms M-3 and M-4 overlap the reception. [seed.ts:338](prisma/seed.ts#L338), [:388](prisma/seed.ts#L388), [:492](prisma/seed.ts#L492), [:525](prisma/seed.ts#L525), [:782-783](prisma/seed.ts#L782), [:1139](prisma/seed.ts#L1139)
- **Units and fake drawing metadata**: library cards say "180 × 120 mm" for a six-seat desk. Every PDF prints "Scale 1:100", "STATUS: APPROVED / ISSUED" and "REV: 2.4", and the title-block columns overlap on A4 portrait. [ObjectLibrarySidebar.tsx:388](src/components/library/ObjectLibrarySidebar.tsx#L388), [pdf.ts:244-246](src/lib/export/pdf.ts#L244), [:286-287](src/lib/export/pdf.ts#L286)
- **Search and zoom**: search results never close on an outside click. Jumping to a seat assumes a 1200x800 window, so the seat isn't centered. The zoom buttons and +/- zoom toward the floor's top-left corner instead of the view center, and Reset View isn't fit-to-screen. [TopNavBar.tsx:141-185](src/components/navigation/TopNavBar.tsx#L141), [useFloorPlanStore.ts:237-252](src/store/useFloorPlanStore.ts#L237), [FloorPlanCanvas.tsx:126-130](src/components/canvas/FloorPlanCanvas.tsx#L126)
- **Selection**: Shift/Ctrl-drag replaces the selection instead of adding to it. The selection box also picks up seats hidden by filters or layers. Releasing the mouse outside the canvas leaves panning or selecting stuck, and space-to-pan can stick after Alt+Tab. [useFloorPlanStore.ts:345-359](src/store/useFloorPlanStore.ts#L345), [FloorPlanCanvas.tsx:288](src/components/canvas/FloorPlanCanvas.tsx#L288)
- **Property inputs**: `parseFloat(v) || 0` (and `|| 10`) makes it impossible to clear a field or type a negative number, and every keystroke adds an undo step that deep-copies every seat. [PropertiesPanel.tsx:344-380](src/components/inspector/PropertiesPanel.tsx#L344)
- **Seat labels and room colors**: program codes rotate with the chair, so they're upside-down on the back row of every bench. Room colors defined in the seed's `geometry` are ignored (the renderer reads `properties.fill`), so every room looks the same. [SeatElement.tsx:150-161](src/components/canvas/SeatElement.tsx#L150), [FloorObjectElement.tsx:56-58](src/components/canvas/FloorObjectElement.tsx#L56)
- **Dialog state**: the import dialog keeps the previous file and results when reopened, and picking the same file again does nothing. The export dialog sets its plan type once from the view mode. [ExcelImportModal.tsx:25-28](src/components/modals/ExcelImportModal.tsx#L25), [ExportModal.tsx:35](src/components/modals/ExportModal.tsx#L35)
- **Paging**: only the 10 newest snapshots are listed (automatic restore backups count toward this). The audit dialog loads 50 entries and searches only those, although the API supports `search`. [floors/[id]/route.ts:25-27](src/app/api/floors/%5Bid%5D/route.ts#L25), [AuditHistoryModal.tsx:21-35](src/components/history/AuditHistoryModal.tsx#L21)
- `user-select: none` on `body` prevents copying seat IDs or audit entries. [globals.css:15](src/app/globals.css#L15)
- Locked objects get `pointer-events-none`, so once locked they can't be selected or unlocked, and there's no UI to lock one. [FloorObjectElement.tsx:26](src/components/canvas/FloorObjectElement.tsx#L26)
- Dead code: unused imports; unused store actions (`selectSeatsByZone/Bay/Program/Status`; `setActiveTool` has no UI); drawing tools declared in `ToolMode` but not implemented.

---

## Performance

- **Re-rendering**: components call `useFloorPlanStore()` with no selector, so any store change re-renders everything. The cursor position is React state, so every mouse move re-renders all 532 seats and ~120 objects. `React.memo` on seats and objects is defeated by inline arrow props, and selection checks use `Array.includes` inside the render loop (quadratic on select-all). This is fine at 532 seats but will lag at the "thousands" the README targets. Fix: selectors with `useShallow`, stable callbacks, a `Set` for selection, and the cursor held in a ref. [FloorPlanCanvas.tsx:20-71](src/components/canvas/FloorPlanCanvas.tsx#L20), [:520-532](src/components/canvas/FloorPlanCanvas.tsx#L520)
- **Bundle size**: `next build` reports 416 kB of page JS (503 kB first load), because ExcelJS and jsPDF are imported up front. Load them with `await import()` only when the user exports or imports. [ExcelImportModal.tsx:5](src/components/modals/ExcelImportModal.tsx#L5), [ExportModal.tsx:15-16](src/components/modals/ExportModal.tsx#L15), [BulkActionBar.tsx:15](src/components/allocation/BulkActionBar.tsx#L15)
- **Full reloads**: every bulk action reloads the entire floor, including all allocation history. [useFloorPlanStore.ts:578](src/store/useFloorPlanStore.ts#L578)
- **Indexes**: there are no database indexes on `Seat.floorId`, `FloorObject.floorId`, `SeatAllocation.seatId`, `SeatBlock.seatId` or `AuditLog.timestamp`. Prisma doesn't create foreign-key indexes automatically. [schema.prisma](prisma/schema.prisma)
- **Restore scaling**: snapshot restore saves a backup and then inserts about 1,300 rows one by one, all inside a single transaction with Prisma's default 5 s timeout. It takes under a second for 532 seats, so floors with a few thousand seats will start failing (safely: the transaction rolls back). Use `createMany` and a longer timeout. [versions/route.ts:102-218](src/app/api/versions/route.ts#L102)

---

## Engineering and tooling

- There are no tests, no ESLint config (so the build's lint step checks nothing), no formatter and no CI. Start with API tests for allocation, import and restore (Vitest) and one Playwright smoke test for the canvas.
- `@types/react` 19 is installed alongside React 18. Upgrading to React 19, which the Next.js upgrade needs anyway, resolves the mismatch.
- Prisma 5.21 is several major versions behind (npm's `latest` tag is 8.0). The `prisma` CLI belongs in `devDependencies`, and `"main": "index.js"` / `"type": "commonjs"` in [package.json](package.json) are `npm init` leftovers.
- `reactStrictMode: false` hides effect bugs. Turn it back on once dragging is implemented properly. [next.config.js:3](next.config.js#L3)
- JSON is stored in string columns (`geometry`, `properties`, `snapshotJson`); on PostgreSQL, use `Json` columns. The README says the app is PostgreSQL-compatible, but `contains` search is case-insensitive on SQLite and case-sensitive on PostgreSQL. Snapshots don't include zones or programs.

---

## Missing features

- Only the first floor of the first building ever loads; there's no building or floor switcher. [page.tsx:23-40](src/app/page.tsx#L23)
- There are no screens for managing programs (names, required capacity), zones, employees, buildings or floors.
- There's no way to add, move or delete individual seats, no rotation handle, and the drawing tools (wall, door, room, dimension) aren't implemented.
- README claims that don't hold today: layer lock and opacity, "high-res" PNG, and allocation history.

---

## Suggested order

1. ~~**Data safety**: guard snapshot restore, persist deletes, stop duplicate saves, and block canvas shortcuts behind dialogs (P0 #1, #4, #5, #6).~~ Done.
2. ~~**Core workflow**: the Assign button, and the perimeter wall that blocks room display and box selection (P0 #2, #3).~~ Done.
3. **Security**: upgrade Next.js to 15.5.26+ or 16.3.x with React 19 (P0 #7); add sign-in before anyone else uses the app (P0 #8).
4. **Unsaved edits and exports**: stop reloads from discarding layout edits (P1 #23), then the export and import round-trip and capacity math (P1 #9–#12).
5. **Canvas interaction and layers** (P1 #13–#16, #19, #20).
6. **Data model**: history-preserving allocations and blocks, seats tied to bays, and management screens (P1 #17, #18, #21; Missing features).
