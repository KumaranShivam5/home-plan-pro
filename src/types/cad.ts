/**
 * CAD Data Types and Models for Home Plan Pro Web
 */

export interface Point {
  x: number; // inches in world space
  y: number; // inches in world space
}

export type WallType = 'exterior' | 'interior' | 'partition' | 'foundation';

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // in inches: 4, 4.5, 6, 8, 10, 12, etc.
  type: WallType;
  layerId: string;
  color?: string;
}

export type OpeningType = 'door' | 'double-door' | 'pocket-door' | 'window' | 'cased-opening';
export type SwingDirection = 'in-left' | 'in-right' | 'out-left' | 'out-right';

export interface WallOpening {
  id: string;
  wallId: string;
  type: OpeningType;
  distanceFromStart: number; // inches along wall centerline
  width: number; // inches (e.g. 32, 36, 60)
  swing: SwingDirection;
  label?: string;
  layerId: string;
}

export type ColumnShape = 'rect' | 'circle';
export type ColumnHatch = 'cross' | 'solid' | 'diagonal' | 'none';

export interface ColumnElement {
  id: string;
  position: Point; // center in inches
  shape: ColumnShape;
  width: number;  // inches
  height: number; // inches
  rotation: number; // degrees
  label: string; // e.g., "C-1", "COL-A1"
  showLabel: boolean;
  hatchPattern: ColumnHatch;
  layerId: string;
}

export type SymbolCategory = 'architectural' | 'furnishing' | 'structural' | 'kitchen-bath' | 'electrical' | 'hvac';

export interface PlacedSymbol {
  id: string;
  type: string; // symbol definition id
  name: string; // user-editable official name (e.g. "KITCHEN ISLAND", "SUB-PANEL 200A")
  category: SymbolCategory;
  position: Point; // center in inches
  rotation: number; // degrees: 0, 45, 90, etc.
  width: number; // inches
  height: number; // inches
  showLabel: boolean;
  layerId: string;
}

export interface DimensionLine {
  id: string;
  start: Point;
  end: Point;
  offset: number; // perpendicular distance in inches
  overrideText?: string;
  layerId: string;
}

export interface RoomArea {
  id: string;
  name: string;
  points: Point[];
  areaSqFt: number;
  layerId: string;
}

export interface CADLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export type CADTool =
  | 'select'
  | 'wall'
  | 'column'
  | 'door'
  | 'window'
  | 'dimension'
  | 'measure-area'
  | 'text'
  | 'delete'
  | 'pan';

export interface SnapSettings {
  snapToGrid: boolean;
  gridSizeInches: number; // e.g. 12 (1 foot) or 6 or 1
  snapToEndpoints: boolean;
  orthoLock: boolean; // lock to 90° / 45°
}

export type SheetSize = 'Letter' | 'Tabloid' | 'ArchD';

export interface ProjectInfo {
  name: string;
  client: string;
  address: string;
  drafter: string;
  sheetNo: string;
  date: string;
  scaleString: string; // e.g. '1/4" = 1\'-0"'
  scaleRatio: number; // 1/48 for 1/4"=1'
  sheetSize: SheetSize;
  northAngle: number;
  notes: string;
}

export interface DrawingSnapshot {
  walls: WallSegment[];
  openings: WallOpening[];
  columns: ColumnElement[];
  symbols: PlacedSymbol[];
  dimensions: DimensionLine[];
  rooms: RoomArea[];
  actionName?: string;
}

export interface SavedProjectFile {
  version: string;
  timestamp: string;
  projectInfo: ProjectInfo;
  layers: CADLayer[];
  drawing: DrawingSnapshot;
}

