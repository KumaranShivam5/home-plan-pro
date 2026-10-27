import {
  WallSegment,
  WallOpening,
  ColumnElement,
  PlacedSymbol,
  DimensionLine,
  RoomArea,
  ProjectInfo,
  CADLayer,
} from '../types/cad';

export const INITIAL_LAYERS: CADLayer[] = [
  { id: 'structural', name: '01. Structural & Columns', visible: true, locked: false, color: '#F59E0B' },
  { id: 'walls', name: '02. Walls & Partitions', visible: true, locked: false, color: '#38BDF8' },
  { id: 'architectural', name: '03. Doors & Windows', visible: true, locked: false, color: '#A855F7' },
  { id: 'fixtures', name: '04. Fixtures & Symbols', visible: true, locked: false, color: '#10B981' },
  { id: 'dimensions', name: '05. Dimensions & Annotations', visible: true, locked: false, color: '#0284C7' },
];

export const INITIAL_PROJECT_INFO: ProjectInfo = {
  name: 'SINGLE-FAMILY RESIDENCE PERMIT SET',
  client: 'ROBERT & ELENA STERLING',
  address: '742 HIGHLAND RIDGE CREST, AUSTIN, TX',
  drafter: 'J. MORGAN, PE / AIA',
  sheetNo: 'A-101',
  date: '2026-10-27',
  scaleString: '1/4" = 1\'-0"',
  scaleRatio: 1 / 48,
  sheetSize: 'Letter',
  northAngle: 0,
  notes: 'PERMIT SUBMISSION DRAWINGS - ALL DIMENSIONS TO FACE OF STUD. CONTRACTOR SHALL VERIFY ALL CONDITIONS IN FIELD BEFORE CONSTRUCTION.',
};

export function createSamplePermitPlan() {
  // Main building footprint: 36'-0" wide (432") by 24'-0" deep (288")
  // Exterior walls (8" thickness)
  const walls: WallSegment[] = [
    // Exterior Perimeter (36' x 24')
    {
      id: 'ext_north',
      start: { x: 0, y: 0 },
      end: { x: 432, y: 0 },
      thickness: 8,
      type: 'exterior',
      layerId: 'walls',
    },
    {
      id: 'ext_east',
      start: { x: 432, y: 0 },
      end: { x: 432, y: 288 },
      thickness: 8,
      type: 'exterior',
      layerId: 'walls',
    },
    {
      id: 'ext_south',
      start: { x: 432, y: 288 },
      end: { x: 0, y: 288 },
      thickness: 8,
      type: 'exterior',
      layerId: 'walls',
    },
    {
      id: 'ext_west',
      start: { x: 0, y: 288 },
      end: { x: 0, y: 0 },
      thickness: 8,
      type: 'exterior',
      layerId: 'walls',
    },

    // Interior Dividing Partition 1 (separates Master Suite from Living/Dining): X = 252 (21')
    {
      id: 'int_partition_1',
      start: { x: 252, y: 0 },
      end: { x: 252, y: 288 },
      thickness: 4.5,
      type: 'interior',
      layerId: 'walls',
    },

    // Interior Partition 2 (separates Bathroom): Y = 120 (10') from X = 252 to X = 432
    {
      id: 'int_bath_wall',
      start: { x: 252, y: 120 },
      end: { x: 432, y: 120 },
      thickness: 4.5,
      type: 'interior',
      layerId: 'walls',
    },

    // Kitchen partial wing wall: X = 132 (11') from Y = 0 to Y = 96 (8')
    {
      id: 'int_kitchen_stub',
      start: { x: 132, y: 0 },
      end: { x: 132, y: 96 },
      thickness: 4.5,
      type: 'interior',
      layerId: 'walls',
    },
  ];

  // Structural Columns (12"x12" and 16"x16" with cross-hatching)
  const columns: ColumnElement[] = [
    {
      id: 'col_1',
      position: { x: 132, y: 96 },
      shape: 'rect',
      width: 12,
      height: 12,
      rotation: 0,
      label: 'C-1',
      showLabel: true,
      hatchPattern: 'cross',
      layerId: 'structural',
    },
    {
      id: 'col_2',
      position: { x: 132, y: 192 },
      shape: 'rect',
      width: 12,
      height: 12,
      rotation: 0,
      label: 'C-2',
      showLabel: true,
      hatchPattern: 'cross',
      layerId: 'structural',
    },
    {
      id: 'col_3',
      position: { x: 252, y: 192 },
      shape: 'rect',
      width: 12,
      height: 12,
      rotation: 0,
      label: 'C-3',
      showLabel: true,
      hatchPattern: 'cross',
      layerId: 'structural',
    },
    {
      id: 'col_4',
      position: { x: 0, y: 144 },
      shape: 'rect',
      width: 12,
      height: 12,
      rotation: 0,
      label: 'C-4',
      showLabel: true,
      hatchPattern: 'cross',
      layerId: 'structural',
    },
  ];

  // Wall Openings (Doors & Windows)
  const openings: WallOpening[] = [
    // Main Entrance Door (South exterior wall)
    {
      id: 'door_main',
      wallId: 'ext_south',
      type: 'door',
      distanceFromStart: 348, // 84" from south-west corner
      width: 36,
      swing: 'in-right',
      layerId: 'architectural',
    },
    // Master Bedroom Door
    {
      id: 'door_master',
      wallId: 'int_partition_1',
      type: 'door',
      distanceFromStart: 180,
      width: 32,
      swing: 'in-left',
      layerId: 'architectural',
    },
    // Bathroom Door
    {
      id: 'door_bath',
      wallId: 'int_bath_wall',
      type: 'door',
      distanceFromStart: 48,
      width: 30,
      swing: 'in-right',
      layerId: 'architectural',
    },
    // Living Room Front Windows (South wall)
    {
      id: 'win_living',
      wallId: 'ext_south',
      type: 'window',
      distanceFromStart: 240,
      width: 60,
      swing: 'in-left',
      layerId: 'architectural',
    },
    // Master Bedroom East Window
    {
      id: 'win_master',
      wallId: 'ext_east',
      type: 'window',
      distanceFromStart: 200,
      width: 48,
      swing: 'in-left',
      layerId: 'architectural',
    },
    // Kitchen Window (North wall)
    {
      id: 'win_kitchen',
      wallId: 'ext_north',
      type: 'window',
      distanceFromStart: 66,
      width: 42,
      swing: 'in-left',
      layerId: 'architectural',
    },
  ];

  // Pre-placed Fixtures and Symbols with Official Custom Names
  const symbols: PlacedSymbol[] = [
    // Kitchen Island
    {
      id: 'sym_island',
      type: 'kitchen-island',
      name: 'KITCHEN ISLAND 72x36',
      category: 'kitchen-bath',
      position: { x: 72, y: 72 },
      rotation: 0,
      width: 72,
      height: 36,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Kitchen Sink
    {
      id: 'sym_sink',
      type: 'sink-double',
      name: 'SINK DBL 33x22',
      category: 'kitchen-bath',
      position: { x: 66, y: 16 },
      rotation: 0,
      width: 33,
      height: 22,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Refrigerator
    {
      id: 'sym_fridge',
      type: 'refrigerator-36',
      name: 'REFRIGERATOR 36x34',
      category: 'kitchen-bath',
      position: { x: 24, y: 20 },
      rotation: 0,
      width: 36,
      height: 34,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Water Closet
    {
      id: 'sym_toilet',
      type: 'water-closet',
      name: 'WC-01',
      category: 'kitchen-bath',
      position: { x: 276, y: 32 },
      rotation: 0,
      width: 20,
      height: 28,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Bathtub
    {
      id: 'sym_tub',
      type: 'bathtub-60',
      name: 'BATHTUB 60x32',
      category: 'kitchen-bath',
      position: { x: 400, y: 30 },
      rotation: 0,
      width: 60,
      height: 32,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Master Queen Bed
    {
      id: 'sym_bed',
      type: 'bed-queen',
      name: 'MASTER BED QUEEN 60x80',
      category: 'furnishing',
      position: { x: 340, y: 220 },
      rotation: 180,
      width: 60,
      height: 80,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Living Room Sofa
    {
      id: 'sym_sofa',
      type: 'sofa-3seat',
      name: 'SOFA 3-SEATER 84x36',
      category: 'furnishing',
      position: { x: 120, y: 200 },
      rotation: 0,
      width: 84,
      height: 36,
      showLabel: true,
      layerId: 'fixtures',
    },
    // Electrical Main Panel
    {
      id: 'sym_panel',
      type: 'elec-panel',
      name: 'PANEL MAIN-200A',
      category: 'electrical',
      position: { x: 10, y: 278 },
      rotation: 0,
      width: 16,
      height: 6,
      showLabel: true,
      layerId: 'fixtures',
    },
  ];

  // Architectural Dimensions
  const dimensions: DimensionLine[] = [
    // Overall North Wall Dimension (36'-0")
    {
      id: 'dim_overall_width',
      start: { x: 0, y: -24 },
      end: { x: 432, y: -24 },
      offset: 24,
      overrideText: '36\'-0" (OVERALL)',
      layerId: 'dimensions',
    },
    // Overall West Wall Dimension (24'-0")
    {
      id: 'dim_overall_height',
      start: { x: -24, y: 0 },
      end: { x: -24, y: 288 },
      offset: 24,
      overrideText: '24\'-0" (OVERALL)',
      layerId: 'dimensions',
    },
    // Living Area Width
    {
      id: 'dim_living_w',
      start: { x: 0, y: 312 },
      end: { x: 252, y: 312 },
      offset: 24,
      overrideText: '21\'-0"',
      layerId: 'dimensions',
    },
    // Master Suite Width
    {
      id: 'dim_master_w',
      start: { x: 252, y: 312 },
      end: { x: 432, y: 312 },
      offset: 24,
      overrideText: '15\'-0"',
      layerId: 'dimensions',
    },
  ];

  // Room Enclosed Areas
  const rooms: RoomArea[] = [
    {
      id: 'room_living',
      name: 'Great Room & Kitchen',
      points: [
        { x: 4, y: 4 },
        { x: 248, y: 4 },
        { x: 248, y: 284 },
        { x: 4, y: 284 },
      ],
      areaSqFt: 504,
      layerId: 'architectural',
    },
    {
      id: 'room_master',
      name: 'Primary Bedroom',
      points: [
        { x: 256, y: 124 },
        { x: 428, y: 124 },
        { x: 428, y: 284 },
        { x: 256, y: 284 },
      ],
      areaSqFt: 210,
      layerId: 'architectural',
    },
    {
      id: 'room_bath',
      name: 'Ensuite Bath',
      points: [
        { x: 256, y: 4 },
        { x: 428, y: 4 },
        { x: 428, y: 116 },
        { x: 256, y: 116 },
      ],
      areaSqFt: 150,
      layerId: 'architectural',
    },
  ];

  return { walls, columns, openings, symbols, dimensions, rooms };
}
