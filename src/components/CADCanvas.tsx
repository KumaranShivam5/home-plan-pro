import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Point,
  WallSegment,
  WallOpening,
  ColumnElement,
  PlacedSymbol,
  DimensionLine,
  RoomArea,
  CADTool,
  SnapSettings,
} from '../types/cad';
import {
  distance,
  angleDegrees,
  snapToGridPoint,
  snapAngle,
  computeWallPolygons,
  findClosestWall,
  formatImperial,
} from '../utils/cadMath';
import { SYMBOLS_CATALOG } from '../utils/symbolsCatalog';

import { Copy, RotateCw, Trash2, X } from 'lucide-react';

interface CADCanvasProps {
  walls: WallSegment[];
  openings: WallOpening[];
  columns: ColumnElement[];
  symbols: PlacedSymbol[];
  dimensions: DimensionLine[];
  rooms: RoomArea[];
  activeTool: CADTool;
  wallThickness: number;
  snapSettings: SnapSettings;
  selectedId: string | null;
  selectedLabel?: string;
  onSelectElement: (type: 'wall' | 'column' | 'symbol' | 'dimension' | null, id: string | null) => void;
  onAddWall: (wall: WallSegment) => void;
  onAddColumn: (column: ColumnElement) => void;
  onAddOpening: (opening: WallOpening) => void;
  onAddSymbol: (symbol: PlacedSymbol) => void;
  onAddDimension: (dim: DimensionLine) => void;
  onUpdateSymbolPosition: (id: string, newPos: Point) => void;
  onUpdateColumnPosition: (id: string, newPos: Point) => void;
  onFinishDragMove?: (actionName: string) => void;
  onCursorMove: (pos: Point, lineLength: number | null, lineAngle: number | null) => void;
  onCancelActiveDrawing?: (message: string) => void;
  onDuplicateSelected?: () => void;
  onRotateSelected?: () => void;
  onDeleteSelected?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const CADCanvas: React.FC<CADCanvasProps> = ({
  walls,
  openings,
  columns,
  symbols,
  dimensions,
  rooms,
  activeTool,
  wallThickness,
  snapSettings,
  selectedId,
  selectedLabel,
  onSelectElement,
  onAddWall,
  onAddColumn,
  onAddOpening,
  onAddSymbol,
  onAddDimension,
  onUpdateSymbolPosition,
  onUpdateColumnPosition,
  onFinishDragMove,
  onCursorMove,
  onCancelActiveDrawing,
  onDuplicateSelected,
  onRotateSelected,
  onDeleteSelected,
  zoom,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan offset in screen pixels
  const [pan, setPan] = useState<Point>({ x: 140, y: 120 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Interactive drawing states
  const [wallStartPoint, setWallStartPoint] = useState<Point | null>(null);
  const [dimensionStartPoint, setDimensionStartPoint] = useState<Point | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point>({ x: 0, y: 0 });
  const [snappedIndicator, setSnappedIndicator] = useState<{ point: Point; type: 'grid' | 'vertex' } | null>(null);

  // Dragging selected object
  const [draggingItem, setDraggingItem] = useState<{ id: string; type: 'symbol' | 'column'; offset: Point } | null>(null);

  // Convert client pixel coordinates to blueprint world coordinates (inches)
  const clientToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Convert blueprint world coordinates (inches) to screen pixels
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Point => {
      return {
        x: pan.x + worldX * zoom,
        y: pan.y + worldY * zoom,
      };
    },
    [pan, zoom]
  );

  // Find nearest vertex from existing walls for magnetic snapping
  const findNearestVertex = useCallback(
    (p: Point, tolerance = 14): Point | null => {
      let nearest: Point | null = null;
      let minD = tolerance;

      for (const w of walls) {
        const d1 = distance(p, w.start);
        if (d1 < minD) {
          minD = d1;
          nearest = w.start;
        }
        const d2 = distance(p, w.end);
        if (d2 < minD) {
          minD = d2;
          nearest = w.end;
        }
      }

      for (const c of columns) {
        const d = distance(p, c.position);
        if (d < minD) {
          minD = d;
          nearest = c.position;
        }
      }

      return nearest;
    },
    [walls, columns]
  );

  // Apply snapping logic
  const resolveSnappedPoint = useCallback(
    (rawWorld: Point, startRef?: Point | null): { point: Point; isSnapped: boolean; type: 'grid' | 'vertex' | 'none' } => {
      // 1. Check Vertex snap (highest precedence)
      if (snapSettings.snapToEndpoints) {
        const vertex = findNearestVertex(rawWorld, 12);
        if (vertex) {
          return { point: vertex, isSnapped: true, type: 'vertex' };
        }
      }

      // 2. Check Ortho snap if start point exists
      let p = rawWorld;
      if (startRef && snapSettings.orthoLock) {
        p = snapAngle(startRef, p, true);
      }

      // 3. Check Grid snap
      if (snapSettings.snapToGrid) {
        const gridP = snapToGridPoint(p, snapSettings.gridSizeInches);
        if (distance(p, gridP) < snapSettings.gridSizeInches * 0.8) {
          return { point: gridP, isSnapped: true, type: 'grid' };
        }
      }

      return { point: p, isSnapped: false, type: 'none' };
    },
    [findNearestVertex, snapSettings]
  );

  // Mouse wheel zoom centered at cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 4.5);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Preserve world coordinate under mouse
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setPan({ x: newPanX, y: newPanY });
    onZoomChange(newZoom);
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rawWorld = clientToWorld(e.clientX, e.clientY);

    // If panning canvas
    if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x),
        y: pan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Resolve snapping
    const activeStart = wallStartPoint || dimensionStartPoint;
    const { point: snappedWorld, isSnapped, type } = resolveSnappedPoint(rawWorld, activeStart);

    setHoveredPoint(snappedWorld);
    setSnappedIndicator(isSnapped ? { point: snappedWorld, type: type as any } : null);

    // Compute active line length and angle for odometer
    let lineLength: number | null = null;
    let lineAngle: number | null = null;

    if (activeStart) {
      lineLength = distance(activeStart, snappedWorld);
      lineAngle = angleDegrees(activeStart, snappedWorld);
    }

    onCursorMove(snappedWorld, lineLength, lineAngle);

    // Handle dragging selected items
    if (draggingItem) {
      const snappedTarget = snapSettings.snapToGrid
        ? snapToGridPoint({ x: rawWorld.x - draggingItem.offset.x, y: rawWorld.y - draggingItem.offset.y }, 6)
        : { x: rawWorld.x - draggingItem.offset.x, y: rawWorld.y - draggingItem.offset.y };

      if (draggingItem.type === 'symbol') {
        onUpdateSymbolPosition(draggingItem.id, snappedTarget);
      } else if (draggingItem.type === 'column') {
        onUpdateColumnPosition(draggingItem.id, snappedTarget);
      }
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Pan tool activates pan
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return; // Only primary click

    const rawWorld = clientToWorld(e.clientX, e.clientY);
    const activeStart = wallStartPoint || dimensionStartPoint;
    const { point: snappedWorld } = resolveSnappedPoint(rawWorld, activeStart);

    // 1. WALL DRAWING TOOL
    if (activeTool === 'wall') {
      if (!wallStartPoint) {
        setWallStartPoint(snappedWorld);
      } else {
        // Complete current wall segment and auto-merge
        if (distance(wallStartPoint, snappedWorld) > 4) {
          const newWall: WallSegment = {
            id: `wall_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            start: wallStartPoint,
            end: snappedWorld,
            thickness: wallThickness,
            type: wallThickness >= 8 ? 'exterior' : 'interior',
            layerId: 'walls',
          };
          onAddWall(newWall);
          // Chain to next wall from endpoint for continuous drafting!
          setWallStartPoint(snappedWorld);
        }
      }
      return;
    }

    // 2. COLUMN TOOL
    if (activeTool === 'column') {
      const colId = `col_${Date.now()}`;
      const newCol: ColumnElement = {
        id: colId,
        position: snappedWorld,
        shape: 'rect',
        width: 12,
        height: 12,
        rotation: 0,
        label: `C-${columns.length + 1}`,
        showLabel: true,
        hatchPattern: 'cross',
        layerId: 'structural',
      };
      onAddColumn(newCol);
      onSelectElement('column', colId);
      return;
    }

    // 3. DOOR TOOL
    if (activeTool === 'door') {
      const nearest = findClosestWall(snappedWorld, walls, 36);
      if (nearest) {
        const newDoor: WallOpening = {
          id: `door_${Date.now()}`,
          wallId: nearest.wall.id,
          type: 'door',
          distanceFromStart: nearest.distanceFromStart,
          width: 36,
          swing: 'in-right',
          layerId: 'architectural',
        };
        onAddOpening(newDoor);
      }
      return;
    }

    // 4. WINDOW TOOL
    if (activeTool === 'window') {
      const nearest = findClosestWall(snappedWorld, walls, 36);
      if (nearest) {
        const newWindow: WallOpening = {
          id: `win_${Date.now()}`,
          wallId: nearest.wall.id,
          type: 'window',
          distanceFromStart: nearest.distanceFromStart,
          width: 48,
          swing: 'in-left',
          layerId: 'architectural',
        };
        onAddOpening(newWindow);
      }
      return;
    }

    // 5. DIMENSION TOOL
    if (activeTool === 'dimension') {
      if (!dimensionStartPoint) {
        setDimensionStartPoint(snappedWorld);
      } else {
        if (distance(dimensionStartPoint, snappedWorld) > 4) {
          const newDim: DimensionLine = {
            id: `dim_${Date.now()}`,
            start: dimensionStartPoint,
            end: snappedWorld,
            offset: 24,
            layerId: 'dimensions',
          };
          onAddDimension(newDim);
          setDimensionStartPoint(null);
        }
      }
      return;
    }

    // 6. SELECT TOOL: Click detection
    if (activeTool === 'select') {
      // Check if clicked a column
      for (const col of columns) {
        if (
          Math.abs(snappedWorld.x - col.position.x) <= col.width / 2 + 6 &&
          Math.abs(snappedWorld.y - col.position.y) <= col.height / 2 + 6
        ) {
          onSelectElement('column', col.id);
          setDraggingItem({
            id: col.id,
            type: 'column',
            offset: { x: snappedWorld.x - col.position.x, y: snappedWorld.y - col.position.y },
          });
          return;
        }
      }

      // Check if clicked a symbol
      for (const sym of symbols) {
        if (
          Math.abs(snappedWorld.x - sym.position.x) <= sym.width / 2 + 6 &&
          Math.abs(snappedWorld.y - sym.position.y) <= sym.height / 2 + 6
        ) {
          onSelectElement('symbol', sym.id);
          setDraggingItem({
            id: sym.id,
            type: 'symbol',
            offset: { x: snappedWorld.x - sym.position.x, y: snappedWorld.y - sym.position.y },
          });
          return;
        }
      }

      // Check if clicked a wall
      const wallHit = findClosestWall(snappedWorld, walls, 12);
      if (wallHit) {
        onSelectElement('wall', wallHit.wall.id);
        return;
      }

      // Check dimension
      for (const dim of dimensions) {
        const mid = { x: (dim.start.x + dim.end.x) / 2, y: (dim.start.y + dim.end.y) / 2 };
        if (distance(snappedWorld, mid) < 18) {
          onSelectElement('dimension', dim.id);
          return;
        }
      }

      // Clicked empty canvas: deselect
      onSelectElement(null, null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingItem) {
      onFinishDragMove?.(`Moved ${draggingItem.type}`);
      setDraggingItem(null);
    }
  };

  // Keyboard shortcut handler (Escape to stop active wall / cancel drawing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (wallStartPoint) {
          setWallStartPoint(null);
          onCancelActiveDrawing?.('Stopped active wall chain');
        } else if (dimensionStartPoint) {
          setDimensionStartPoint(null);
          onCancelActiveDrawing?.('Cancelled dimension line');
        } else if (selectedId) {
          onSelectElement(null, null);
          onCancelActiveDrawing?.('Deselected');
        } else {
          onCancelActiveDrawing?.('Active tool cancelled');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wallStartPoint, dimensionStartPoint, selectedId, onCancelActiveDrawing, onSelectElement]);

  // HTML5 Drag and Drop from Left Symbol Palette
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      const worldDrop = clientToWorld(e.clientX, e.clientY);
      const dropPos = snapSettings.snapToGrid ? snapToGridPoint(worldDrop, 6) : worldDrop;

      if (data.templateId?.startsWith('col-')) {
        // Drop as structural column
        const newCol: ColumnElement = {
          id: `col_${Date.now()}`,
          position: dropPos,
          shape: data.templateId.includes('round') ? 'circle' : 'rect',
          width: data.width || 16,
          height: data.height || 16,
          rotation: 0,
          label: data.name || `C-${columns.length + 1}`,
          showLabel: true,
          hatchPattern: 'cross',
          layerId: 'structural',
        };
        onAddColumn(newCol);
        onSelectElement('column', newCol.id);
      } else {
        // Drop as placed fixture/symbol
        const newSym: PlacedSymbol = {
          id: `sym_${Date.now()}`,
          type: data.templateId,
          name: data.name || 'CUSTOM FIXTURE',
          category: data.category || 'furnishing',
          position: dropPos,
          rotation: 0,
          width: data.width || 36,
          height: data.height || 36,
          showLabel: true,
          layerId: 'fixtures',
        };
        onAddSymbol(newSym);
        onSelectElement('symbol', newSym.id);
      }
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  };

  // Calculate Wall Polygons with Auto-Merging
  const wallPolygons = computeWallPolygons(walls);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 h-full w-full bg-[#0B0F19] relative overflow-hidden cursor-crosshair-cad select-none"
    >
      <svg className="w-full h-full pointer-events-none">
        <defs>
          {/* Minor Grid Pattern (1 foot = 12 inches) */}
          <pattern
            id="cad-grid-major"
            width={12 * zoom}
            height={12 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (12 * zoom)}, ${pan.y % (12 * zoom)})`}
          >
            {/* Grid Dots */}
            <circle cx="0" cy="0" r="1" fill="#334155" />
            <path
              d={`M ${12 * zoom} 0 L 0 0 0 ${12 * zoom}`}
              fill="none"
              stroke="#1E293B"
              strokeWidth="0.5"
            />
          </pattern>

          {/* Large Sub-grid Pattern (5 feet = 60 inches) */}
          <pattern
            id="cad-grid-5ft"
            width={60 * zoom}
            height={60 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (60 * zoom)}, ${pan.y % (60 * zoom)})`}
          >
            <rect width={60 * zoom} height={60 * zoom} fill="url(#cad-grid-major)" />
            <path
              d={`M ${60 * zoom} 0 L 0 0 0 ${60 * zoom}`}
              fill="none"
              stroke="#2A374A"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* 1. Grid Background Field */}
        <rect width="100%" height="100%" fill="url(#cad-grid-5ft)" />

        {/* 2. World Coordinate Origin Marker (0,0) */}
        <g transform={`translate(${pan.x}, ${pan.y})`}>
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#38BDF8" strokeWidth="1.5" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#38BDF8" />
          <text x="6" y="-6" fill="#38BDF8" fontSize="10" fontFamily="monospace">
            (0,0)
          </text>
        </g>

        {/* MAIN BLUEPRINT TRANSFORM GROUP */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 3. Render Room Enclosed Area Overlays */}
          {rooms.map((room) => {
            const pointsStr = room.points.map((p) => `${p.x},${p.y}`).join(' ');
            let cx = 0;
            let cy = 0;
            for (const p of room.points) {
              cx += p.x;
              cy += p.y;
            }
            cx /= room.points.length;
            cy /= room.points.length;

            return (
              <g key={room.id}>
                <polygon points={pointsStr} fill="#0284C7" fillOpacity="0.08" stroke="none" />
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {room.name.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {room.areaSqFt} SQ FT
                </text>
              </g>
            );
          })}

          {/* 4. Render Auto-Merged Walls */}
          {wallPolygons.map((wp) => {
            const isSelected = selectedId === wp.wallId;
            const pts = wp.points.map((p) => `${p.x},${p.y}`).join(' ');

            return (
              <g key={wp.wallId} className="transition-all">
                {/* Wall Solid Cavity */}
                <polygon
                  points={pts}
                  fill="#1E293B"
                  stroke={isSelected ? '#38BDF8' : '#94A3B8'}
                  strokeWidth={isSelected ? '2' : '1.2'}
                  strokeLinejoin="round"
                />

                {/* Centerline trace */}
                <line
                  x1={wp.centerline.start.x}
                  y1={wp.centerline.start.y}
                  x2={wp.centerline.end.x}
                  y2={wp.centerline.end.y}
                  stroke={isSelected ? '#38BDF8' : '#475569'}
                  strokeWidth="0.6"
                  strokeDasharray="4 2"
                />

                {/* Wall dimension readout on hover/select */}
                {isSelected && (
                  <text
                    x={(wp.centerline.start.x + wp.centerline.end.x) / 2}
                    y={(wp.centerline.start.y + wp.centerline.end.y) / 2 - 8}
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {formatImperial(distance(wp.centerline.start, wp.centerline.end))} ({wp.thickness}")
                  </text>
                )}
              </g>
            );
          })}

          {/* 5. Render Openings (Doors & Windows Cutouts) */}
          {openings.map((op) => {
            const parentWall = walls.find((w) => w.id === op.wallId);
            if (!parentWall) return null;

            const dx = parentWall.end.x - parentWall.start.x;
            const dy = parentWall.end.y - parentWall.start.y;
            const wallLen = Math.hypot(dx, dy);
            if (wallLen < 0.1) return null;

            const ux = dx / wallLen;
            const uy = dy / wallLen;
            const nx = -uy;
            const ny = ux;

            const centerPos = {
              x: parentWall.start.x + ux * op.distanceFromStart,
              y: parentWall.start.y + uy * op.distanceFromStart,
            };

            const halfW = op.width / 2;
            const pStart = { x: centerPos.x - ux * halfW, y: centerPos.y - uy * halfW };
            const pEnd = { x: centerPos.x + ux * halfW, y: centerPos.y + uy * halfW };

            return (
              <g key={op.id}>
                {/* Wall Opening Cutout (clears the wall cavity) */}
                <rect
                  x={centerPos.x - (op.width / 2) * Math.abs(ux) - (parentWall.thickness / 2 + 1) * Math.abs(nx)}
                  y={centerPos.y - (op.width / 2) * Math.abs(uy) - (parentWall.thickness / 2 + 1) * Math.abs(ny)}
                  width={Math.max(op.width * Math.abs(ux), (parentWall.thickness + 2) * Math.abs(nx))}
                  height={Math.max(op.width * Math.abs(uy), (parentWall.thickness + 2) * Math.abs(ny))}
                  fill="#0B0F19"
                />

                {op.type === 'door' || op.type === 'pocket-door' ? (
                  <g>
                    {/* Door jambs */}
                    <line
                      x1={pStart.x + nx * (parentWall.thickness / 2)}
                      y1={pStart.y + ny * (parentWall.thickness / 2)}
                      x2={pStart.x - nx * (parentWall.thickness / 2)}
                      y2={pStart.y - ny * (parentWall.thickness / 2)}
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={pEnd.x + nx * (parentWall.thickness / 2)}
                      y1={pEnd.y + ny * (parentWall.thickness / 2)}
                      x2={pEnd.x - nx * (parentWall.thickness / 2)}
                      y2={pEnd.y - ny * (parentWall.thickness / 2)}
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />

                    {/* Swing Leaf Line */}
                    <line
                      x1={pStart.x}
                      y1={pStart.y}
                      x2={pStart.x + nx * op.width}
                      y2={pStart.y + ny * op.width}
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                    />

                    {/* Architectural 90° Swing Arc */}
                    <path
                      d={`M ${pStart.x + nx * op.width} ${pStart.y + ny * op.width} A ${op.width} ${op.width} 0 0 1 ${pEnd.x} ${pEnd.y}`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                  </g>
                ) : (
                  // Glazed Window
                  <g>
                    <line x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="#38BDF8" strokeWidth="2" />
                    <line
                      x1={pStart.x + nx * 2}
                      y1={pStart.y + ny * 2}
                      x2={pEnd.x + nx * 2}
                      y2={pEnd.y + ny * 2}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <line
                      x1={pStart.x - nx * 2}
                      y1={pStart.y - ny * 2}
                      x2={pEnd.x - nx * 2}
                      y2={pEnd.y - ny * 2}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* 6. Render Structural Columns */}
          {columns.map((col) => {
            const isSelected = selectedId === col.id;
            return (
              <g
                key={col.id}
                transform={`translate(${col.position.x}, ${col.position.y}) rotate(${col.rotation})`}
                className="cursor-pointer"
              >
                {col.shape === 'circle' ? (
                  <circle
                    cx="0"
                    cy="0"
                    r={col.width / 2}
                    fill="#1E293B"
                    stroke={isSelected ? '#38BDF8' : '#F1F5F9'}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                  />
                ) : (
                  <rect
                    x={-col.width / 2}
                    y={-col.height / 2}
                    width={col.width}
                    height={col.height}
                    fill="#1E293B"
                    stroke={isSelected ? '#38BDF8' : '#F1F5F9'}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                  />
                )}

                {/* Structural Hatching */}
                {col.hatchPattern === 'cross' && (
                  <g stroke="#94A3B8" strokeWidth="1">
                    <line x1={-col.width / 2} y1={-col.height / 2} x2={col.width / 2} y2={col.height / 2} />
                    <line x1={col.width / 2} y1={-col.height / 2} x2={-col.width / 2} y2={col.height / 2} />
                    <rect x={-col.width / 4} y={-col.height / 4} width={col.width / 2} height={col.height / 2} fill="#334155" stroke="none" />
                  </g>
                )}
                {col.hatchPattern === 'solid' && (
                  <rect x={-col.width / 3} y={-col.height / 3} width={(col.width * 2) / 3} height={(col.height * 2) / 3} fill="#475569" />
                )}

                {/* Column Center Grid Tag / Label */}
                {col.showLabel && col.label && (
                  <text
                    x="0"
                    y={col.height / 2 + 10}
                    textAnchor="middle"
                    fill={isSelected ? '#38BDF8' : '#F8FAFC'}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {col.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 7. Render Placed Symbols & Official Nomenclature Labels */}
          {symbols.map((sym) => {
            const isSelected = selectedId === sym.id;
            const template = SYMBOLS_CATALOG.find((t) => t.id === sym.type);

            return (
              <g
                key={sym.id}
                transform={`translate(${sym.position.x}, ${sym.position.y}) rotate(${sym.rotation})`}
                className="cursor-pointer"
              >
                {/* Symbol Vector Graphics */}
                {template ? (
                  template.renderSvg(sym.width, sym.height, isSelected)
                ) : (
                  <rect
                    x={-sym.width / 2}
                    y={-sym.height / 2}
                    width={sym.width}
                    height={sym.height}
                    fill="#1E293B"
                    stroke={isSelected ? '#38BDF8' : '#94A3B8'}
                    strokeWidth="1.5"
                  />
                )}

                {/* Official Nomenclature Name Badge */}
                {sym.showLabel && sym.name && (
                  <g transform={`translate(0, ${sym.height / 2 + 11})`}>
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fill={isSelected ? '#38BDF8' : '#94A3B8'}
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {sym.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 8. Render Architectural Dimensions */}
          {dimensions.map((dim) => {
            const isSelected = selectedId === dim.id;
            const midX = (dim.start.x + dim.end.x) / 2;
            const midY = (dim.start.y + dim.end.y) / 2;
            const d = distance(dim.start, dim.end);
            const text = dim.overrideText || formatImperial(d);

            return (
              <g key={dim.id} className="cursor-pointer">
                {/* Main Dimension Line */}
                <line
                  x1={dim.start.x}
                  y1={dim.start.y}
                  x2={dim.end.x}
                  y2={dim.end.y}
                  stroke={isSelected ? '#38BDF8' : '#0284C7'}
                  strokeWidth="1.2"
                />

                {/* 45° Architectural Slash Tick Marks */}
                <line
                  x1={dim.start.x - 4}
                  y1={dim.start.y + 4}
                  x2={dim.start.x + 4}
                  y2={dim.start.y - 4}
                  stroke={isSelected ? '#38BDF8' : '#0284C7'}
                  strokeWidth="1.8"
                />
                <line
                  x1={dim.end.x - 4}
                  y1={dim.end.y + 4}
                  x2={dim.end.x + 4}
                  y2={dim.end.y - 4}
                  stroke={isSelected ? '#38BDF8' : '#0284C7'}
                  strokeWidth="1.8"
                />

                {/* Dimension Text Badge */}
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  fill={isSelected ? '#38BDF8' : '#38BDF8'}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {text}
                </text>
              </g>
            );
          })}

          {/* 9. Active Wall Drafting Preview */}
          {wallStartPoint && (
            <g>
              <line
                x1={wallStartPoint.x}
                y1={wallStartPoint.y}
                x2={hoveredPoint.x}
                y2={hoveredPoint.y}
                stroke="#38BDF8"
                strokeWidth={wallThickness}
                strokeOpacity="0.6"
              />
              <line
                x1={wallStartPoint.x}
                y1={wallStartPoint.y}
                x2={hoveredPoint.x}
                y2={hoveredPoint.y}
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              {/* Length tooltip on active line */}
              <text
                x={(wallStartPoint.x + hoveredPoint.x) / 2}
                y={(wallStartPoint.y + hoveredPoint.y) / 2 - 10}
                textAnchor="middle"
                fill="#38BDF8"
                fontSize="11"
                fontWeight="700"
                fontFamily="monospace"
              >
                {formatImperial(distance(wallStartPoint, hoveredPoint))}
              </text>
            </g>
          )}

          {/* 10. Active Dimension Drafting Preview */}
          {dimensionStartPoint && (
            <g>
              <line
                x1={dimensionStartPoint.x}
                y1={dimensionStartPoint.y}
                x2={hoveredPoint.x}
                y2={hoveredPoint.y}
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <circle cx={dimensionStartPoint.x} cy={dimensionStartPoint.y} r="3" fill="#F59E0B" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="3" fill="#F59E0B" />
            </g>
          )}

          {/* 11. Snapping Magnetic Indicator */}
          {snappedIndicator && (
            <g transform={`translate(${snappedIndicator.point.x}, ${snappedIndicator.point.y})`}>
              <circle
                cx="0"
                cy="0"
                r="6"
                fill="none"
                stroke={snappedIndicator.type === 'vertex' ? '#10B981' : '#F59E0B'}
                strokeWidth="1.8"
              />
              <circle
                cx="0"
                cy="0"
                r="2"
                fill={snappedIndicator.type === 'vertex' ? '#10B981' : '#F59E0B'}
              />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Quick Action HUD Bar for Selected Element */}
      {selectedId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2.5 shadow-2xl z-20 font-sans text-xs select-none">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] pr-2 border-r border-slate-800">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-semibold text-slate-100 max-w-[150px] truncate">
              {selectedLabel || 'Selected Element'}
            </span>
          </div>

          {onRotateSelected && (
            <button
              type="button"
              onClick={onRotateSelected}
              className="flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Rotate 45°"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Rotate</span>
            </button>
          )}

          {onDuplicateSelected && (
            <button
              type="button"
              onClick={onDuplicateSelected}
              className="flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Duplicate / Clone (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Clone</span>
            </button>
          )}

          {onDeleteSelected && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Delete Element (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectElement(null, null)}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors ml-1 cursor-pointer"
            title="Deselect (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
