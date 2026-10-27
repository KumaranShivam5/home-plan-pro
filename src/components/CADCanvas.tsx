import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

import { Copy, RotateCw, Trash2, X, Boxes } from 'lucide-react';
import { SelectedItem } from '../types/cad';

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
  selectedItems: SelectedItem[];
  selectedLabel?: string;
  onSelectElement: (item: SelectedItem | null, isShiftKey: boolean) => void;
  onBoxSelectElements: (items: SelectedItem[], isShiftKey: boolean) => void;
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
  onGroupSelected?: () => void;
  onOpenFileDrop?: (file: File) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  cancelSignal?: number;
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
  selectedItems,
  selectedLabel,
  onSelectElement,
  onBoxSelectElements,
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
  onGroupSelected,
  onOpenFileDrop,
  zoom,
  onZoomChange,
  cancelSignal,
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

  // Set of selected element IDs for fast lookup
  const selectedIdSet = useMemo(() => new Set(selectedItems.map((i) => i.id)), [selectedItems]);
  // Box marquee selection in world inches
  const [boxSelectBox, setBoxSelectBox] = useState<{ start: Point; current: Point } | null>(null);
  const [isShiftDown, setIsShiftDown] = useState(false);

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

    // Handle box selection drag
    if (boxSelectBox) {
      setBoxSelectBox((prev) => (prev ? { ...prev, current: rawWorld } : null));
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Right-click immediately finishes or stops active wall or dimension drafting!
    if (e.button === 2) {
      e.preventDefault();
      if (wallStartPoint) {
        setWallStartPoint(null);
        onCancelActiveDrawing?.('Finished wall chain (Right-click)');
        return;
      }
      if (dimensionStartPoint) {
        setDimensionStartPoint(null);
        onCancelActiveDrawing?.('Cancelled dimension (Right-click)');
        return;
      }
      return;
    }

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
      onSelectElement({ type: 'column', id: colId }, false);
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

    // 6. SELECT OR BOX-SELECT TOOL
    if (activeTool === 'select' || activeTool === 'box-select') {
      const isShift = e.shiftKey || isShiftDown;

      // If active tool is explicitly 'box-select', start marquee immediately
      if (activeTool === 'box-select') {
        setBoxSelectBox({ start: rawWorld, current: rawWorld });
        return;
      }

      // In 'select' tool: check if clicked on any existing elements
      // Check column
      for (const col of columns) {
        if (
          Math.abs(snappedWorld.x - col.position.x) <= col.width / 2 + 6 &&
          Math.abs(snappedWorld.y - col.position.y) <= col.height / 2 + 6
        ) {
          onSelectElement({ type: 'column', id: col.id }, isShift);
          if (!isShift) {
            setDraggingItem({
              id: col.id,
              type: 'column',
              offset: { x: snappedWorld.x - col.position.x, y: snappedWorld.y - col.position.y },
            });
          }
          return;
        }
      }

      // Check symbol
      for (const sym of symbols) {
        if (
          Math.abs(snappedWorld.x - sym.position.x) <= sym.width / 2 + 6 &&
          Math.abs(snappedWorld.y - sym.position.y) <= sym.height / 2 + 6
        ) {
          onSelectElement({ type: 'symbol', id: sym.id }, isShift);
          if (!isShift) {
            setDraggingItem({
              id: sym.id,
              type: 'symbol',
              offset: { x: snappedWorld.x - sym.position.x, y: snappedWorld.y - sym.position.y },
            });
          }
          return;
        }
      }

      // Check wall
      const wallHit = findClosestWall(snappedWorld, walls, 12);
      if (wallHit) {
        onSelectElement({ type: 'wall', id: wallHit.wall.id }, isShift);
        return;
      }

      // Check dimension
      for (const dim of dimensions) {
        const mid = { x: (dim.start.x + dim.end.x) / 2, y: (dim.start.y + dim.end.y) / 2 };
        if (distance(snappedWorld, mid) < 18) {
          onSelectElement({ type: 'dimension', id: dim.id }, isShift);
          return;
        }
      }

      // Clicked empty canvas: start drag box marquee selection
      setBoxSelectBox({ start: rawWorld, current: rawWorld });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    if (draggingItem) {
      onFinishDragMove?.(`Moved ${draggingItem.type}`);
      setDraggingItem(null);
    }

    // Process box marquee selection if active
    if (boxSelectBox) {
      const minX = Math.min(boxSelectBox.start.x, boxSelectBox.current.x);
      const maxX = Math.max(boxSelectBox.start.x, boxSelectBox.current.x);
      const minY = Math.min(boxSelectBox.start.y, boxSelectBox.current.y);
      const maxY = Math.max(boxSelectBox.start.y, boxSelectBox.current.y);

      const boxWidth = maxX - minX;
      const boxHeight = maxY - minY;

      if (boxWidth > 6 || boxHeight > 6) {
        const boxedItems: SelectedItem[] = [];

        // Columns in box
        for (const col of columns) {
          if (
            col.position.x >= minX &&
            col.position.x <= maxX &&
            col.position.y >= minY &&
            col.position.y <= maxY
          ) {
            boxedItems.push({ type: 'column', id: col.id });
          }
        }

        // Symbols in box
        for (const sym of symbols) {
          if (
            sym.position.x >= minX &&
            sym.position.x <= maxX &&
            sym.position.y >= minY &&
            sym.position.y <= maxY
          ) {
            boxedItems.push({ type: 'symbol', id: sym.id });
          }
        }

        // Walls in box
        for (const w of walls) {
          const midX = (w.start.x + w.end.x) / 2;
          const midY = (w.start.y + w.end.y) / 2;
          const inside =
            (w.start.x >= minX && w.start.x <= maxX && w.start.y >= minY && w.start.y <= maxY) ||
            (w.end.x >= minX && w.end.x <= maxX && w.end.y >= minY && w.end.y <= maxY) ||
            (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY);
          if (inside) {
            boxedItems.push({ type: 'wall', id: w.id });
          }
        }

        // Dimensions in box
        for (const dim of dimensions) {
          const midX = (dim.start.x + dim.end.x) / 2;
          const midY = (dim.start.y + dim.end.y) / 2;
          if (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) {
            boxedItems.push({ type: 'dimension', id: dim.id });
          }
        }

        onBoxSelectElements(boxedItems, e.shiftKey || isShiftDown);
      } else {
        // Simple click on empty canvas with no drag
        if (!e.shiftKey && !isShiftDown) {
          onSelectElement(null, false);
        }
      }

      setBoxSelectBox(null);
    }
  };

  // Track shift key for multi-select
  useEffect(() => {
    const handleShift = (e: KeyboardEvent) => {
      setIsShiftDown(e.shiftKey);
    };
    window.addEventListener('keydown', handleShift);
    window.addEventListener('keyup', handleShift);
    return () => {
      window.removeEventListener('keydown', handleShift);
      window.removeEventListener('keyup', handleShift);
    };
  }, []);

  // Reset active drawing if cancelSignal changes or active tool reverts to select/pan
  useEffect(() => {
    setWallStartPoint(null);
    setDimensionStartPoint(null);
    setBoxSelectBox(null);
    setDraggingItem(null);
  }, [cancelSignal]);

  useEffect(() => {
    if (activeTool === 'select' || activeTool === 'pan') {
      setWallStartPoint(null);
      setDimensionStartPoint(null);
    }
  }, [activeTool]);

  // Keyboard shortcut handler (Escape, Enter, or Space to stop active wall / cancel drawing)
  // Uses capture phase to intercept Escape before Android / browser default back navigation triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEscape = e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27;

      if (isEscape || e.key === 'Enter' || (e.key === ' ' && (wallStartPoint || dimensionStartPoint))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        if (wallStartPoint) {
          setWallStartPoint(null);
          onCancelActiveDrawing?.('Finished / Stopped active wall');
        } else if (dimensionStartPoint) {
          setDimensionStartPoint(null);
          onCancelActiveDrawing?.('Cancelled dimension line');
        } else if (selectedItems.length > 0 && isEscape) {
          onSelectElement(null, false);
          onCancelActiveDrawing?.('Deselected');
        } else if (isEscape) {
          onCancelActiveDrawing?.('Active tool reset to select');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [wallStartPoint, dimensionStartPoint, selectedItems, onCancelActiveDrawing, onSelectElement]);

  // HTML5 Drag and Drop from Left Symbol Palette & Project File Drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // 1. Check if user dropped a .json blueprint file onto the canvas to open it!
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        onOpenFileDrop?.(file);
        return;
      }
    }

    // 2. Otherwise handle symbol drop from palette
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
        onSelectElement({ type: 'column', id: newCol.id }, false);
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
        onSelectElement({ type: 'symbol', id: newSym.id }, false);
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
      onContextMenu={(e) => {
        e.preventDefault();
        if (wallStartPoint) {
          setWallStartPoint(null);
          onCancelActiveDrawing?.('Finished wall chain (Right-click)');
        } else if (dimensionStartPoint) {
          setDimensionStartPoint(null);
          onCancelActiveDrawing?.('Cancelled dimension (Right-click)');
        }
      }}
      onDoubleClick={() => {
        if (wallStartPoint) {
          setWallStartPoint(null);
          onCancelActiveDrawing?.('Finished wall chain (Double-click)');
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 h-full w-full bg-[#FFFFFF] relative overflow-hidden cursor-crosshair-cad select-none"
    >
      {/* Visual Active Wall Guidance Banner with Direct Stop Button */}
      {wallStartPoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#F4EFEA] border border-[#DFD3C7] rounded-full px-4 py-1.5 flex items-center gap-3 shadow-md z-30 select-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs text-[#2B231F]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32] animate-pulse" />
            <span className="font-semibold text-[#C85A32]">Wall in Progress:</span>
            <span className="text-[#5C4D43]">Click endpoint to place · Right-click or Esc to finish</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setWallStartPoint(null);
              onCancelActiveDrawing?.('Stopped wall drawing');
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-[#C85A32] hover:bg-[#B64F2A] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer"
            title="Stop / Finish Wall Drawing (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Stop Drawing</span>
          </button>
        </div>
      )}

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
            <circle cx="0" cy="0" r="0.8" fill="#D4D4D4" />
            <path
              d={`M ${12 * zoom} 0 L 0 0 0 ${12 * zoom}`}
              fill="none"
              stroke="#EAEAEA"
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
              stroke="#D4D4D4"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* 1. Grid Background Field */}
        <rect width="100%" height="100%" fill="url(#cad-grid-5ft)" />

        {/* 2. World Coordinate Origin Marker (0,0) */}
        <g transform={`translate(${pan.x}, ${pan.y})`}>
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#000000" strokeWidth="1.2" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke="#000000" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="2.5" fill="#000000" />
          <text x="6" y="-6" fill="#000000" fontSize="10" fontWeight="600" fontFamily="monospace">
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
                <polygon points={pointsStr} fill="#000000" fillOpacity="0.03" stroke="#D4D4D4" strokeWidth="0.8" strokeDasharray="4 2" />
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fill="#000000"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {room.name.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  fill="#555555"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {room.areaSqFt} SQ FT
                </text>
              </g>
            );
          })}

          {/* 4. Render Auto-Merged Walls */}
          {wallPolygons.map((wp) => {
            const isSelected = selectedIdSet.has(wp.wallId);
            const pts = wp.points.map((p) => `${p.x},${p.y}`).join(' ');

            return (
              <g key={wp.wallId} className="transition-all">
                {/* Wall Solid Cavity */}
                <polygon
                  points={pts}
                  fill="#000000"
                  stroke={isSelected ? '#C85A32' : '#000000'}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  strokeLinejoin="round"
                />

                {/* Centerline trace */}
                <line
                  x1={wp.centerline.start.x}
                  y1={wp.centerline.start.y}
                  x2={wp.centerline.end.x}
                  y2={wp.centerline.end.y}
                  stroke={isSelected ? '#C85A32' : '#666666'}
                  strokeWidth="0.6"
                  strokeDasharray="4 2"
                />

                {/* Wall dimension readout on hover/select */}
                {isSelected && (
                  <g>
                    <rect
                      x={(wp.centerline.start.x + wp.centerline.end.x) / 2 - 42}
                      y={(wp.centerline.start.y + wp.centerline.end.y) / 2 - 20}
                      width="84"
                      height="16"
                      rx="3"
                      fill="#FFFFFF"
                      stroke="#C85A32"
                      strokeWidth="1"
                    />
                    <text
                      x={(wp.centerline.start.x + wp.centerline.end.x) / 2}
                      y={(wp.centerline.start.y + wp.centerline.end.y) / 2 - 8}
                      textAnchor="middle"
                      fill="#C85A32"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {formatImperial(distance(wp.centerline.start, wp.centerline.end))} ({wp.thickness}")
                    </text>
                  </g>
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
                {/* Wall Opening Cutout (clears the wall cavity on pure white canvas) */}
                <rect
                  x={centerPos.x - (op.width / 2) * Math.abs(ux) - (parentWall.thickness / 2 + 1) * Math.abs(nx)}
                  y={centerPos.y - (op.width / 2) * Math.abs(uy) - (parentWall.thickness / 2 + 1) * Math.abs(ny)}
                  width={Math.max(op.width * Math.abs(ux), (parentWall.thickness + 2) * Math.abs(nx))}
                  height={Math.max(op.width * Math.abs(uy), (parentWall.thickness + 2) * Math.abs(ny))}
                  fill="#FFFFFF"
                />

                {op.type === 'door' || op.type === 'pocket-door' ? (
                  <g>
                    {/* Door jambs */}
                    <line
                      x1={pStart.x + nx * (parentWall.thickness / 2)}
                      y1={pStart.y + ny * (parentWall.thickness / 2)}
                      x2={pStart.x - nx * (parentWall.thickness / 2)}
                      y2={pStart.y - ny * (parentWall.thickness / 2)}
                      stroke="#000000"
                      strokeWidth="1.8"
                    />
                    <line
                      x1={pEnd.x + nx * (parentWall.thickness / 2)}
                      y1={pEnd.y + ny * (parentWall.thickness / 2)}
                      x2={pEnd.x - nx * (parentWall.thickness / 2)}
                      y2={pEnd.y - ny * (parentWall.thickness / 2)}
                      stroke="#000000"
                      strokeWidth="1.8"
                    />

                    {/* Swing Leaf Line */}
                    <line
                      x1={pStart.x}
                      y1={pStart.y}
                      x2={pStart.x + nx * op.width}
                      y2={pStart.y + ny * op.width}
                      stroke="#000000"
                      strokeWidth="1.5"
                    />

                    {/* Architectural 90° Swing Arc */}
                    <path
                      d={`M ${pStart.x + nx * op.width} ${pStart.y + ny * op.width} A ${op.width} ${op.width} 0 0 1 ${pEnd.x} ${pEnd.y}`}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                  </g>
                ) : (
                  // Glazed Window
                  <g>
                    <line x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} stroke="#000000" strokeWidth="2" />
                    <line
                      x1={pStart.x + nx * 2}
                      y1={pStart.y + ny * 2}
                      x2={pEnd.x + nx * 2}
                      y2={pEnd.y + ny * 2}
                      stroke="#000000"
                      strokeWidth="1"
                    />
                    <line
                      x1={pStart.x - nx * 2}
                      y1={pStart.y - ny * 2}
                      x2={pEnd.x - nx * 2}
                      y2={pEnd.y - ny * 2}
                      stroke="#000000"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* 6. Render Structural Columns */}
          {columns.map((col) => {
            const isSelected = selectedIdSet.has(col.id);
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
                    fill="#000000"
                    stroke={isSelected ? '#C85A32' : '#000000'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                ) : (
                  <rect
                    x={-col.width / 2}
                    y={-col.height / 2}
                    width={col.width}
                    height={col.height}
                    fill="#000000"
                    stroke={isSelected ? '#C85A32' : '#000000'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                )}

                {/* Structural Hatching */}
                {col.hatchPattern === 'cross' && (
                  <g stroke="#FFFFFF" strokeWidth="1">
                    <line x1={-col.width / 2} y1={-col.height / 2} x2={col.width / 2} y2={col.height / 2} />
                    <line x1={col.width / 2} y1={-col.height / 2} x2={-col.width / 2} y2={col.height / 2} />
                    <rect x={-col.width / 4} y={-col.height / 4} width={col.width / 2} height={col.height / 2} fill="#000000" stroke="#FFFFFF" strokeWidth="0.8" />
                  </g>
                )}
                {col.hatchPattern === 'solid' && (
                  <rect x={-col.width / 3} y={-col.height / 3} width={(col.width * 2) / 3} height={(col.height * 2) / 3} fill="#FFFFFF" />
                )}

                {/* Column Center Grid Tag / Label */}
                {col.showLabel && col.label && (
                  <text
                    x="0"
                    y={col.height / 2 + 10}
                    textAnchor="middle"
                    fill={isSelected ? '#C85A32' : '#000000'}
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
            const isSelected = selectedIdSet.has(sym.id);
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
                    fill="#FFFFFF"
                    stroke={isSelected ? '#C85A32' : '#000000'}
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
                      fill={isSelected ? '#C85A32' : '#000000'}
                      fontSize="9"
                      fontWeight="700"
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
            const isSelected = selectedIdSet.has(dim.id);
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
                  stroke={isSelected ? '#C85A32' : '#000000'}
                  strokeWidth="1.2"
                />

                {/* 45° Architectural Slash Tick Marks */}
                <line
                  x1={dim.start.x - 4}
                  y1={dim.start.y + 4}
                  x2={dim.start.x + 4}
                  y2={dim.start.y - 4}
                  stroke={isSelected ? '#C85A32' : '#000000'}
                  strokeWidth="2"
                />
                <line
                  x1={dim.end.x - 4}
                  y1={dim.end.y + 4}
                  x2={dim.end.x + 4}
                  y2={dim.end.y - 4}
                  stroke={isSelected ? '#C85A32' : '#000000'}
                  strokeWidth="2"
                />

                {/* Dimension Text Badge */}
                <g>
                  <rect
                    x={midX - Math.max(22, text.length * 4)}
                    y={midY - 14}
                    width={Math.max(44, text.length * 8)}
                    height="14"
                    rx="2"
                    fill="#FFFFFF"
                    stroke={isSelected ? '#C85A32' : '#000000'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fill={isSelected ? '#C85A32' : '#000000'}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {text}
                  </text>
                </g>
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
                stroke="#000000"
                strokeWidth={wallThickness}
                strokeOpacity="0.35"
              />
              <line
                x1={wallStartPoint.x}
                y1={wallStartPoint.y}
                x2={hoveredPoint.x}
                y2={hoveredPoint.y}
                stroke="#C85A32"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              {/* Length tooltip on active line */}
              <g>
                <rect
                  x={(wallStartPoint.x + hoveredPoint.x) / 2 - 32}
                  y={(wallStartPoint.y + hoveredPoint.y) / 2 - 20}
                  width="64"
                  height="16"
                  rx="3"
                  fill="#FFFFFF"
                  stroke="#C85A32"
                  strokeWidth="1"
                />
                <text
                  x={(wallStartPoint.x + hoveredPoint.x) / 2}
                  y={(wallStartPoint.y + hoveredPoint.y) / 2 - 8}
                  textAnchor="middle"
                  fill="#C85A32"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {formatImperial(distance(wallStartPoint, hoveredPoint))}
                </text>
              </g>
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
                stroke="#C85A32"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <circle cx={dimensionStartPoint.x} cy={dimensionStartPoint.y} r="3" fill="#C85A32" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="3" fill="#C85A32" />
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
                stroke="#C85A32"
                strokeWidth="1.8"
              />
              <circle
                cx="0"
                cy="0"
                r="2"
                fill="#C85A32"
              />
            </g>
          )}
          {/* Marquee Box Selection Preview */}
          {boxSelectBox && (
            <rect
              x={Math.min(boxSelectBox.start.x, boxSelectBox.current.x)}
              y={Math.min(boxSelectBox.start.y, boxSelectBox.current.y)}
              width={Math.abs(boxSelectBox.current.x - boxSelectBox.start.x)}
              height={Math.abs(boxSelectBox.current.y - boxSelectBox.start.y)}
              fill="#C85A32"
              fillOpacity="0.08"
              stroke="#C85A32"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
          )}
        </g>
      </svg>

      {/* Floating Quick Action HUD Bar for Selected Element(s) */}
      {selectedItems.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#F4EFEA] border border-[#DFD3C7] rounded-lg px-3 py-1.5 flex items-center gap-2.5 shadow-xl z-20 font-sans text-xs select-none animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-[#2B231F] font-mono text-[11px] pr-2 border-r border-[#DFD3C7]">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="font-semibold text-[#2B231F] max-w-[180px] truncate">
              {selectedItems.length > 1
                ? `${selectedItems.length} Elements Selected`
                : selectedLabel || 'Selected Element'}
            </span>
          </div>

          {selectedItems.length > 1 && onGroupSelected && (
            <button
              type="button"
              onClick={onGroupSelected}
              className="flex items-center gap-1 text-[#5C4D43] hover:text-[#C85A32] hover:bg-[#ECE3DB] px-2 py-1 rounded transition-colors cursor-pointer"
              title="Group Selected Elements (Ctrl+G)"
            >
              <Boxes className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Group</span>
            </button>
          )}

          {onRotateSelected && (
            <button
              type="button"
              onClick={onRotateSelected}
              className="flex items-center gap-1 text-[#5C4D43] hover:text-[#C85A32] hover:bg-[#ECE3DB] px-2 py-1 rounded transition-colors cursor-pointer"
              title="Rotate 45° (R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Rotate</span>
            </button>
          )}

          {onDuplicateSelected && (
            <button
              type="button"
              onClick={onDuplicateSelected}
              className="flex items-center gap-1 text-[#5C4D43] hover:text-[#C85A32] hover:bg-[#ECE3DB] px-2 py-1 rounded transition-colors cursor-pointer"
              title="Duplicate / Clone (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Clone</span>
            </button>
          )}

          {onDeleteSelected && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex items-center gap-1 text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
              title={selectedItems.length > 1 ? `Delete All (${selectedItems.length})` : 'Delete Element (Del)'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete{selectedItems.length > 1 ? ` (${selectedItems.length})` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectElement(null, false)}
            className="text-[#8C7C71] hover:text-[#2B231F] p-1 hover:bg-[#ECE3DB] rounded transition-colors ml-1 cursor-pointer"
            title="Deselect (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
