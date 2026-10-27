# Home Plan Pro Web: Architectural CAD & Official Blueprint Suite

A dedicated single-user Computer-Aided Design (CAD) workstation engineered for creating professional, official-purpose printable floor plans and permit-ready engineering drawings. Reimagining the legendary Windows software **Home Plan Pro**, this web workstation incorporates seamless auto-merging wall junctions (L-corners, T-intersections, continuous mitered cavities), customizable wall thicknesses, structural column placement, editable symbol nomenclature/labeling, precision Imperial dimensioning, and high-fidelity vector PDF generation complete with official engineering title blocks.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements have been incorporated into the architectural blueprint based on your revised feedback:

- **Target Persona & Purpose**: Single-user CAD workstation crafted specifically for official submissions (building permits, contractor execution, client review, and municipal engineering drawings).
- **Auto-Merging Wall Geometry**: Intelligent polygon wall junction engine that automatically unites intersecting and perpendicular wall segments into seamless L-corners, T-junctions, and X-crossings without disjointed line overlaps or internal line artifacts.
- **Dynamic Wall Width Selection**: Real-time wall thickness control (e.g. 4" interior partition, 6" standard exterior, 8" load-bearing, 10"/12" foundation/masonry, plus custom values).
- **Structural Columns & Pillars**: Dedicated column tool supporting rectangular, square, and round architectural columns with structural cross-hatching, precise grid snap, and load annotation.
- **Custom Symbol Nomenclature & Labels**: User option to assign, edit, and toggle visible names/labels for any placed symbol, fixture, or room space (e.g., "KITCHEN ISLAND - 36x72", "WC-01", "COLUMN C-4").
- **Official-Grade Vector PDF Export**: Full vector sheet printing with architectural border, scale bar (`1/4" = 1'-0"`), project title block, revision stamp, and engineer notes.
- **Style Constraints Maintained**: Deep dark friendly slate workstation UI (`#090D16` / `#111827`) with zero gradients, crisp CAD coordinate rulers, and fluid responsiveness.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an exact 2D CAD drafting environment with intelligent vector wall intersections, parametric doors and windows, structural columns, drag-and-drop symbols with editable naming tags, real-time coordinate tracking ("odometer"), and vector-scaled export for print and PDF.
- **Why It Matters for Official Drawings**: Building departments and structural contractors require clear, unfragmented wall outlines (continuous hatching/fill), clear column centers, accurate wall thicknesses, and identifiable equipment tags rather than rough sketches.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Project Initiation & Canvas Setup**:
   - The user opens the canvas with an official drawing sheet (Letter, Arch D 24"×36", Tabloid 11"×17").
   - Instant scale selection (`1/4" = 1'-0"` standard architectural scale or `1/8" = 1'-0"`).
2. **Drafting Auto-Merging Walls**:
   - The user selects the Wall tool (shortcut `W`) and selects the Wall Width from the top context bar (`4"`, `6"`, `8"`, `10"`, or custom).
   - Drawing a wall perpendicular to an existing corner snaps the endpoint: the geometry engine merges the wall centers and outlines into a clean mitered corner or T-joint with seamless internal fill.
3. **Inserting Structural Columns & Openings**:
   - User picks the Column tool (shortcut `C`), configures dimensions (e.g. `12" × 12"` or `16" Ø`), and places it on structural grid intersections with auto-centering.
   - User drags a Door or Window from the left palette onto a wall; the opening cuts the wall and draws architectural swing arcs and sill lines.
4. **Custom Symbol Placement & Nomenclature**:
   - Drag a fixture (sink, panel, desk, generator, HVAC unit) onto the plan.
   - An inline badge or inspector field allows editing the symbol's official display name (e.g., `HVAC-UNIT-1`, `ELEC-PANEL-200A`, `REFRIG-36`). Users can toggle label visibility and text size.
5. **Dimensioning & Area Auditing**:
   - Precision dimension tool with automatic architectural ticks, witness lines, and text (`16'-4 1/2"`).
   - Instant square-footage calculation for enclosed wall perimeters.
6. **Exporting Official High-Resolution Vector PDF**:
   - With one click, generate an official scaled PDF document with border line, title block (Project Name, Date, Scale, Drafter, Sheet Number), north arrow, and legend.

### Visual Identity & Layout Architecture

- **Docked CAD Workstation**:
  - **Left Vertical Toolstrip (48px)**: Primary CAD tools (Select, Wall, Column, Door, Window, Arc/Circle, Rect, Dimension, Text, Area Measure, Symbol Library).
  - **Left Expanded Symbol Drawer (260px, collapsible)**: Categorized pre-drawn symbols (Architectural, Kitchen/Bath, Furniture, Structural, Electrical/Plumbing) with drag-to-canvas affordance.
  - **Top Contextual Ribbon (42px)**: Wall Width selector (`4"`, `6"`, `8"`, `10"`), Snap toggles (Grid, Ortho 90°, Endpoint snap), Active Layer selector, Scale dropdown, and "Export Official PDF" button.
  - **Center Canvas Viewport**: Dark drafting surface with major/minor grid lines, crosshair cursor, zoom/pan navigation HUD, and real-time snapping indicators.
  - **Right Properties & Layers Inspector (280px)**: Selected object geometry, Wall thickness, Column size, Symbol Name & Tag editor, and Layer Manager (Structural, Architectural, Electrical, Plumbing, Annotations).
  - **Bottom Status & Odometer Bar (28px)**: Real-time cursor coordinates (`X: 24'-6"  Y: 14'-2"`), current line length (`L: 12'-0"`), angle (`90.0°`), and active tool tips.

---

## 3. Key Product Decisions & Trade-Offs

- **Wall Auto-Merge Engine (Constructive Solid Geometry / Polygon Union)**:
  - *Chosen Approach*: Walls are maintained as linear parametric centerlines with assigned thicknesses. When walls share start/end vertices within a snapping threshold ($<2"$), the renderer computes offset polygon contours and joins them using 2D polygon union (miter and bevel joins for L-corners, T-junctions, and X-intersections).
  - *Why*: Gives architects the intuitive CAD feeling of drawing natural continuous floor plans without unsightly overlapping rect boundaries or disjointed gaps.
  - *Alternatives Considered*: Independent overlapping rectangles (causes disjointed inner borders that look unprofessional on official prints).
- **Parametric Columns vs Plain Clip-Art**:
  - *Chosen Approach*: Structural columns are first-class CAD objects with configurable width, depth/diameter, column grid tags (e.g., Grid A-1), and engineering cross-hatch fill.
  - *Why*: Permits and engineering drawings treat columns differently from furniture—they require distinct line weights, hatching, and dimension alignment.
- **Vector PDF Output with Official Architectural Sheet Format**:
  - *Chosen Approach*: Direct vector PDF compilation (crisp scalable vector paths, real text strings, standardized title block and border) rather than canvas screenshot conversion.
  - *Why*: Official permit offices and printing reprographics require vector precision so lines remain crisp when zoomed or printed on large plotters.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top CAD Context Ribbon                          │
│ [Logo] [Wall W: 6"] [Snap: Grid/Ortho] [Scale: 1/4"=1'] [PDF Export]   │
├────────────┬────────────────────────────────────────────┬──────────────┤
│ Left Tool  │         Central CAD Drafting Viewport      │ Right Panels │
│ Rail &     │  ┌──────────────────────────────────────┐  │              │
│ Symbol     │  │ Interactive High-DPI Vector Canvas   │  │ • Selected   │
│ Palette    │  │ • Auto-Merge Wall Polygon Engine     │  │   Properties │
│            │  │ • Structural Column Layer            │  │ • Symbol     │
│ • Select   │  │ • Dynamic Door/Window Wall Cutouts   │  │   Name Tag   │
│ • Wall     │  │ • Symbol Staging + Editable Labels   │  │ • Wall Width │
│ • Column   │  │ • Precision Dimensioning Ticks       │  │ • Column Dim │
│ • Door/Win │  │ • Room Area Vector Polygons          │  │ • Layers Mgr │
│ • Dim/Text │  │ • Infinite Pan & Smooth Zoom Handlers│  │              │
│ • Symbols  │  └──────────────────────────────────────┘  │              │
├────────────┴────────────────────────────────────────────┴──────────────┤
│ Bottom Odometer: [X: 18'-4 1/2"  Y: 12'-0"]  [Len: 8'-6"]  [Ang: 90°]  │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Data Schema

```typescript
export interface Point {
  x: number; // inches
  y: number; // inches
}

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // 4, 6, 8, 10, or custom inches
  type: 'interior' | 'exterior';
  layerId: string;
}

export interface ColumnElement {
  id: string;
  position: Point;
  shape: 'rect' | 'circle';
  width: number;  // e.g. 12 inches
  height: number; // e.g. 12 inches
  rotation: number;
  label?: string; // e.g. "C1"
  hatchPattern: 'solid' | 'cross' | 'diagonal' | 'none';
  layerId: string;
}

export interface PlacedSymbol {
  id: string;
  type: string;
  name: string; // User-editable official name (e.g. "KITCHEN ISLAND")
  showLabel: boolean;
  category: 'architectural' | 'furnishing' | 'structural' | 'electrical';
  position: Point;
  rotation: number;
  width: number;
  height: number;
  layerId: string;
}

export interface DimensionLine {
  id: string;
  start: Point;
  end: Point;
  offset: number;
  text: string;
  layerId: string;
}
```

### Initial UI Demonstration Plan

As requested in the user prompt ("generate a demo - non-functional UI first for the dashboard including a drag-and-drop tool palette and canvas grid"):
1. Build the complete, interactive CAD workstation interface:
   - Left drag-and-drop tool palette featuring architectural symbols, columns, furniture, and engineering items.
   - Central drafting canvas with high-contrast precision CAD grid, ruler guides, and sample pre-merged floor plan layout.
   - Wall width selector and snap tools in the top ribbon.
   - Right inspector with symbol naming field, column sizing, wall width controls, and layer manager.
   - Bottom status bar displaying real-time coordinate odometers.
2. Wire up the full drawing interactions, auto-merging wall math, and vector PDF export immediately following the UI presentation.
