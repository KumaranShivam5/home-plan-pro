import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { CADTopNav } from './components/CADTopNav';
import { CADToolstrip } from './components/CADToolstrip';
import { SymbolPalette } from './components/SymbolPalette';
import { CADCanvas } from './components/CADCanvas';
import { CADInspector } from './components/CADInspector';
import { CADOdometer } from './components/CADOdometer';
import { PDFExportModal } from './components/PDFExportModal';
import { X } from 'lucide-react';

import {
  WallSegment,
  WallOpening,
  ColumnElement,
  PlacedSymbol,
  DimensionLine,
  RoomArea,
  CADTool,
  SnapSettings,
  ProjectInfo,
  CADLayer,
  Point,
  DrawingSnapshot,
  SavedProjectFile,
  SelectedItem,
  CADGroup,
} from './types/cad';
import {
  INITIAL_LAYERS,
  INITIAL_PROJECT_INFO,
  createSamplePermitPlan,
} from './utils/sampleData';
import { SymbolTemplate } from './utils/symbolsCatalog.tsx';
import { distance } from './utils/cadMath';
import { exportOfficialPlanPDF, PDFExportOptions } from './utils/pdfExport';

export default function App() {
  // Load sample permit drawing on initial startup
  const initialPlan = useMemo(() => createSamplePermitPlan(), []);

  // Blueprint Elements State
  const [walls, setWalls] = useState<WallSegment[]>(initialPlan.walls);
  const [openings, setOpenings] = useState<WallOpening[]>(initialPlan.openings);
  const [columns, setColumns] = useState<ColumnElement[]>(initialPlan.columns);
  const [symbols, setSymbols] = useState<PlacedSymbol[]>(initialPlan.symbols);
  const [dimensions, setDimensions] = useState<DimensionLine[]>(initialPlan.dimensions);
  const [rooms, setRooms] = useState<RoomArea[]>(initialPlan.rooms);
  const [layers, setLayers] = useState<CADLayer[]>(INITIAL_LAYERS);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(INITIAL_PROJECT_INFO);

  // --- STATE HISTORY STACK FOR UNDO / REDO ---
  const [history, setHistory] = useState<DrawingSnapshot[]>([
    {
      walls: initialPlan.walls,
      openings: initialPlan.openings,
      columns: initialPlan.columns,
      symbols: initialPlan.symbols,
      dimensions: initialPlan.dimensions,
      rooms: initialPlan.rooms,
      actionName: 'Initial Blueprint',
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [cancelSignal, setCancelSignal] = useState<number>(0);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Push new state snapshot onto the history stack
  const pushToHistory = useCallback(
    (
      newWalls: WallSegment[],
      newOpenings: WallOpening[],
      newCols: ColumnElement[],
      newSyms: PlacedSymbol[],
      newDims: DimensionLine[],
      newRooms: RoomArea[],
      actionName: string
    ) => {
      const snapshot: DrawingSnapshot = {
        walls: newWalls,
        openings: newOpenings,
        columns: newCols,
        symbols: newSyms,
        dimensions: newDims,
        rooms: newRooms,
        actionName,
      };

      setHistory((prev) => {
        // Discard future redo history if user branched
        const trimmed = prev.slice(0, historyIndex + 1);
        // Keep at most 50 steps
        const next = [...trimmed, snapshot].slice(-50);
        return next;
      });

      setHistoryIndex((prev) => {
        const nextIndex = Math.min(prev + 1, 49);
        return nextIndex;
      });
    },
    [historyIndex]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const targetIndex = historyIndex - 1;
    const target = history[targetIndex];
    if (!target) return;

    setWalls(target.walls);
    setOpenings(target.openings);
    setColumns(target.columns);
    setSymbols(target.symbols);
    setDimensions(target.dimensions);
    setRooms(target.rooms);
    setHistoryIndex(targetIndex);
    setSelectedItems([]);
    showToast(`Undo: ${target.actionName || 'Drawing step'}`);
  }, [canUndo, historyIndex, history, showToast]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const targetIndex = historyIndex + 1;
    const target = history[targetIndex];
    if (!target) return;

    setWalls(target.walls);
    setOpenings(target.openings);
    setColumns(target.columns);
    setSymbols(target.symbols);
    setDimensions(target.dimensions);
    setRooms(target.rooms);
    setHistoryIndex(targetIndex);
    setSelectedItems([]);
    showToast(`Redo: ${target.actionName || 'Drawing step'}`);
  }, [canRedo, historyIndex, history, showToast]);

  // Drafting Settings
  const [activeTool, setActiveTool] = useState<CADTool>('select');
  const [wallThickness, setWallThickness] = useState<number>(6);
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    snapToGrid: true,
    gridSizeInches: 12,
    snapToEndpoints: true,
    orthoLock: true,
  });

  // UI Panels State
  const [isSymbolPaletteOpen, setIsSymbolPaletteOpen] = useState(true);

  // Selection & Grouping State (supports single click, Shift+Click, and Box Select)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    { type: 'wall', id: initialPlan.walls[0]?.id || '' },
  ]);
  const [groups, setGroups] = useState<CADGroup[]>([]);

  // Selection counts and breakdown for bulk actions
  const selectedCount = selectedItems.length;

  const selectedBreakdown = useMemo(() => {
    const counts = { walls: 0, columns: 0, symbols: 0, dimensions: 0 };
    selectedItems.forEach((item) => {
      if (item.type === 'wall') counts.walls++;
      else if (item.type === 'column') counts.columns++;
      else if (item.type === 'symbol') counts.symbols++;
      else if (item.type === 'dimension') counts.dimensions++;
    });
    return counts;
  }, [selectedItems]);

  // Primary selected element for single-item inspector
  const primarySelected = selectedItems.length === 1 ? selectedItems[0] : null;

  // Canvas Viewport & Odometer State
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [activeLineLength, setActiveLineLength] = useState<number | null>(null);
  const [activeLineAngle, setActiveLineAngle] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1.1);

  // PDF Export Modal State
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Hidden File Input Ref for Project Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Properties for selected element (single-item inspector)
  const currentSelectedData = useMemo(() => {
    if (!primarySelected) return null;
    if (primarySelected.type === 'wall') {
      const w = walls.find((item) => item.id === primarySelected.id);
      return w ? { type: 'wall' as const, data: w } : null;
    }
    if (primarySelected.type === 'column') {
      const c = columns.find((item) => item.id === primarySelected.id);
      return c ? { type: 'column' as const, data: c } : null;
    }
    if (primarySelected.type === 'symbol') {
      const s = symbols.find((item) => item.id === primarySelected.id);
      return s ? { type: 'symbol' as const, data: s } : null;
    }
    if (primarySelected.type === 'dimension') {
      const d = dimensions.find((item) => item.id === primarySelected.id);
      return d ? { type: 'dimension' as const, data: d } : null;
    }
    return null;
  }, [primarySelected, walls, columns, symbols, dimensions]);

  // Label for selected element to show in floating canvas HUD
  const selectedElementLabel = useMemo(() => {
    if (selectedItems.length === 0) return undefined;
    if (selectedItems.length > 1) {
      return `${selectedItems.length} Elements Selected (Shift / Marquee)`;
    }
    const single = selectedItems[0];
    if (single.type === 'wall') {
      const w = walls.find((item) => item.id === single.id);
      return w ? `Wall (${w.thickness}")` : 'Wall';
    }
    if (single.type === 'column') {
      const c = columns.find((item) => item.id === single.id);
      return c ? `Column ${c.label}` : 'Column';
    }
    if (single.type === 'symbol') {
      const s = symbols.find((item) => item.id === single.id);
      return s ? s.name : 'Symbol';
    }
    if (single.type === 'dimension') {
      return 'Dimension Line';
    }
    return undefined;
  }, [selectedItems, walls, columns, symbols]);

  // Statistics
  const totalWallLength = useMemo(() => {
    return walls.reduce((sum, w) => sum + distance(w.start, w.end), 0);
  }, [walls]);

  const estimatedAreaSqFt = useMemo(() => {
    return rooms.reduce((sum, r) => sum + r.areaSqFt, 0) || 864;
  }, [rooms]);

  // --- DRAWING ACTION HANDLERS WITH UNDO/REDO REGISTRATION ---

  const handleSelectElement = useCallback(
    (item: SelectedItem | null, isShiftKey: boolean) => {
      if (!item) {
        if (!isShiftKey) {
          setSelectedItems([]);
        }
        return;
      }
      if (isShiftKey) {
        setSelectedItems((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          if (exists) {
            return prev.filter((p) => p.id !== item.id);
          } else {
            return [...prev, item];
          }
        });
      } else {
        setSelectedItems([item]);
      }
    },
    []
  );

  const handleBoxSelectElements = useCallback(
    (newItems: SelectedItem[], isShiftKey: boolean) => {
      if (isShiftKey) {
        setSelectedItems((prev) => {
          const map = new Map<string, SelectedItem>();
          prev.forEach((i) => map.set(i.id, i));
          newItems.forEach((i) => map.set(i.id, i));
          return Array.from(map.values());
        });
      } else {
        setSelectedItems(newItems);
      }
      if (newItems.length > 0) {
        showToast(`Selected ${newItems.length} element${newItems.length > 1 ? 's' : ''}`);
      }
    },
    [showToast]
  );

  const handleGroupSelected = useCallback(() => {
    if (selectedItems.length < 2) {
      showToast('Select 2 or more elements to group (Shift+Click or Box Select)');
      return;
    }
    const newGroup: CADGroup = {
      id: `grp_${Date.now()}`,
      name: `Group (${selectedItems.length} items)`,
      elementIds: selectedItems.map((i) => i.id),
    };
    setGroups((prev) => [...prev, newGroup]);
    showToast(`Created ${newGroup.name}`);
  }, [selectedItems, showToast]);

  const handleBulkUpdateWallThickness = (thickness: number) => {
    const wallIds = new Set(selectedItems.filter((i) => i.type === 'wall').map((i) => i.id));
    if (wallIds.size === 0) return;
    const nextWalls = walls.map((w) => (wallIds.has(w.id) ? { ...w, thickness } : w));
    setWalls(nextWalls);
    pushToHistory(
      nextWalls,
      openings,
      columns,
      symbols,
      dimensions,
      rooms,
      `Set ${wallIds.size} Walls to ${thickness}"`
    );
    showToast(`Updated ${wallIds.size} wall(s) to ${thickness}" thickness`);
  };

  const handleBulkRotateSelected = () => {
    const symIds = new Set(selectedItems.filter((i) => i.type === 'symbol').map((i) => i.id));
    const colIds = new Set(selectedItems.filter((i) => i.type === 'column').map((i) => i.id));
    if (symIds.size === 0 && colIds.size === 0) return;

    let nextSyms = symbols;
    let nextCols = columns;

    if (symIds.size > 0) {
      nextSyms = symbols.map((s) =>
        symIds.has(s.id) ? { ...s, rotation: (s.rotation + 45) % 360 } : s
      );
      setSymbols(nextSyms);
    }
    if (colIds.size > 0) {
      nextCols = columns.map((c) =>
        colIds.has(c.id) ? { ...c, rotation: (c.rotation + 45) % 360 } : c
      );
      setColumns(nextCols);
    }
    pushToHistory(walls, openings, nextCols, nextSyms, dimensions, rooms, 'Bulk Rotate (+45°)');
    showToast(`Rotated ${symIds.size + colIds.size} selected element(s)`);
  };

  const handleAddWall = (newWall: WallSegment) => {
    const nextWalls = [...walls, newWall];
    setWalls(nextWalls);
    setSelectedItems([{ type: 'wall', id: newWall.id }]);
    pushToHistory(nextWalls, openings, columns, symbols, dimensions, rooms, 'Add Wall');
    showToast('Wall segment added & merged');
  };

  const handleAddColumn = (newCol: ColumnElement) => {
    const nextCols = [...columns, newCol];
    setColumns(nextCols);
    setSelectedItems([{ type: 'column', id: newCol.id }]);
    pushToHistory(walls, openings, nextCols, symbols, dimensions, rooms, `Add Column ${newCol.label}`);
    showToast(`Placed Column ${newCol.label}`);
  };

  const handleAddOpening = (newOp: WallOpening) => {
    const nextOps = [...openings, newOp];
    setOpenings(nextOps);
    pushToHistory(walls, nextOps, columns, symbols, dimensions, rooms, `Add ${newOp.type}`);
    showToast(`Added ${newOp.type} opening`);
  };

  const handleAddSymbol = (newSym: PlacedSymbol) => {
    const nextSyms = [...symbols, newSym];
    setSymbols(nextSyms);
    setSelectedItems([{ type: 'symbol', id: newSym.id }]);
    pushToHistory(walls, openings, columns, nextSyms, dimensions, rooms, `Add ${newSym.name}`);
    showToast(`Placed ${newSym.name}`);
  };

  const handleAddDimension = (newDim: DimensionLine) => {
    const nextDims = [...dimensions, newDim];
    setDimensions(nextDims);
    setSelectedItems([{ type: 'dimension', id: newDim.id }]);
    pushToHistory(walls, openings, columns, symbols, nextDims, rooms, 'Add Dimension');
    showToast('Dimension line added');
  };

  const handlePlaceSymbolFromPalette = (template: SymbolTemplate, customName?: string) => {
    if (template.id.startsWith('col-')) {
      const newCol: ColumnElement = {
        id: `col_${Date.now()}`,
        position: { x: 216, y: 144 },
        shape: template.id.includes('round') ? 'circle' : 'rect',
        width: template.defaultWidth,
        height: template.defaultHeight,
        rotation: 0,
        label: customName || template.name,
        showLabel: true,
        hatchPattern: 'cross',
        layerId: 'structural',
      };
      const nextCols = [...columns, newCol];
      setColumns(nextCols);
      setSelectedItems([{ type: 'column', id: newCol.id }]);
      pushToHistory(walls, openings, nextCols, symbols, dimensions, rooms, `Add Column ${newCol.label}`);
      showToast(`Placed Column ${newCol.label}`);
    } else {
      const newSym: PlacedSymbol = {
        id: `sym_${Date.now()}`,
        type: template.id,
        name: customName || template.name,
        category: template.category,
        position: { x: 216, y: 144 },
        rotation: 0,
        width: template.defaultWidth,
        height: template.defaultHeight,
        showLabel: true,
        layerId: 'fixtures',
      };
      const nextSyms = [...symbols, newSym];
      setSymbols(nextSyms);
      setSelectedItems([{ type: 'symbol', id: newSym.id }]);
      pushToHistory(walls, openings, columns, nextSyms, dimensions, rooms, `Add ${newSym.name}`);
      showToast(`Placed ${newSym.name}`);
    }
  };

  const handleUpdateWall = (updatedWall: WallSegment) => {
    const nextWalls = walls.map((w) => (w.id === updatedWall.id ? updatedWall : w));
    setWalls(nextWalls);
    pushToHistory(nextWalls, openings, columns, symbols, dimensions, rooms, `Update Wall Width (${updatedWall.thickness}")`);
  };

  const handleUpdateColumn = (updatedCol: ColumnElement) => {
    const nextCols = columns.map((c) => (c.id === updatedCol.id ? updatedCol : c));
    setColumns(nextCols);
    pushToHistory(walls, openings, nextCols, symbols, dimensions, rooms, `Update Column ${updatedCol.label}`);
  };

  const handleUpdateSymbol = (updatedSym: PlacedSymbol) => {
    const nextSyms = symbols.map((s) => (s.id === updatedSym.id ? updatedSym : s));
    setSymbols(nextSyms);
    pushToHistory(walls, openings, columns, nextSyms, dimensions, rooms, `Update ${updatedSym.name}`);
  };

  const handleUpdateDimension = (updatedDim: DimensionLine) => {
    const nextDims = dimensions.map((d) => (d.id === updatedDim.id ? updatedDim : d));
    setDimensions(nextDims);
    pushToHistory(walls, openings, columns, symbols, nextDims, rooms, 'Update Dimension');
  };

  const handleUpdateSymbolPosition = (id: string, newPos: Point) => {
    setSymbols((prev) => prev.map((s) => (s.id === id ? { ...s, position: newPos } : s)));
  };

  const handleUpdateColumnPosition = (id: string, newPos: Point) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, position: newPos } : c)));
  };

  // Called when dragging finishes to record snapshot
  const handleFinishDragMove = (actionName: string) => {
    pushToHistory(walls, openings, columns, symbols, dimensions, rooms, actionName);
    showToast(actionName);
  };

  // Bulk / Single Deletion Handler
  const handleDeleteSelected = useCallback(() => {
    if (selectedItems.length === 0) return;

    const wallIds = new Set(selectedItems.filter((i) => i.type === 'wall').map((i) => i.id));
    const colIds = new Set(selectedItems.filter((i) => i.type === 'column').map((i) => i.id));
    const symIds = new Set(selectedItems.filter((i) => i.type === 'symbol').map((i) => i.id));
    const dimIds = new Set(selectedItems.filter((i) => i.type === 'dimension').map((i) => i.id));

    const nextWalls = walls.filter((w) => !wallIds.has(w.id));
    const nextOpenings = openings.filter((op) => !wallIds.has(op.wallId));
    const nextCols = columns.filter((c) => !colIds.has(c.id));
    const nextSyms = symbols.filter((s) => !symIds.has(s.id));
    const nextDims = dimensions.filter((d) => !dimIds.has(d.id));

    setWalls(nextWalls);
    setOpenings(nextOpenings);
    setColumns(nextCols);
    setSymbols(nextSyms);
    setDimensions(nextDims);

    const count = selectedItems.length;
    setSelectedItems([]);
    pushToHistory(
      nextWalls,
      nextOpenings,
      nextCols,
      nextSyms,
      nextDims,
      rooms,
      `Delete ${count} Element${count > 1 ? 's' : ''}`
    );
    showToast(`Deleted ${count} element${count > 1 ? 's' : ''}`);
  }, [selectedItems, walls, openings, columns, symbols, dimensions, rooms, pushToHistory, showToast]);

  // Bulk / Single Duplicate Handler
  const handleDuplicateSelected = useCallback(() => {
    if (selectedItems.length === 0) return;

    const newSelected: SelectedItem[] = [];
    const nextWalls = [...walls];
    const nextCols = [...columns];
    const nextSyms = [...symbols];
    const nextDims = [...dimensions];

    selectedItems.forEach((item) => {
      if (item.type === 'wall') {
        const w = walls.find((x) => x.id === item.id);
        if (w) {
          const newW: WallSegment = {
            ...w,
            id: `wall_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            start: { x: w.start.x + 24, y: w.start.y + 24 },
            end: { x: w.end.x + 24, y: w.end.y + 24 },
          };
          nextWalls.push(newW);
          newSelected.push({ type: 'wall', id: newW.id });
        }
      } else if (item.type === 'column') {
        const col = columns.find((c) => c.id === item.id);
        if (col) {
          const newCol: ColumnElement = {
            ...col,
            id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            position: { x: col.position.x + 24, y: col.position.y + 24 },
            label: `${col.label}-COPY`,
          };
          nextCols.push(newCol);
          newSelected.push({ type: 'column', id: newCol.id });
        }
      } else if (item.type === 'symbol') {
        const sym = symbols.find((s) => s.id === item.id);
        if (sym) {
          const newSym: PlacedSymbol = {
            ...sym,
            id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            position: { x: sym.position.x + 24, y: sym.position.y + 24 },
            name: `${sym.name} (Copy)`,
          };
          nextSyms.push(newSym);
          newSelected.push({ type: 'symbol', id: newSym.id });
        }
      } else if (item.type === 'dimension') {
        const d = dimensions.find((x) => x.id === item.id);
        if (d) {
          const newDim: DimensionLine = {
            ...d,
            id: `dim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            start: { x: d.start.x + 24, y: d.start.y + 24 },
            end: { x: d.end.x + 24, y: d.end.y + 24 },
          };
          nextDims.push(newDim);
          newSelected.push({ type: 'dimension', id: newDim.id });
        }
      }
    });

    setWalls(nextWalls);
    setColumns(nextCols);
    setSymbols(nextSyms);
    setDimensions(nextDims);
    setSelectedItems(newSelected);
    pushToHistory(
      nextWalls,
      openings,
      nextCols,
      nextSyms,
      nextDims,
      rooms,
      `Duplicate ${selectedItems.length} Element${selectedItems.length > 1 ? 's' : ''}`
    );
    showToast(`Duplicated ${selectedItems.length} element${selectedItems.length > 1 ? 's' : ''}`);
  }, [selectedItems, walls, openings, columns, symbols, dimensions, rooms, pushToHistory, showToast]);

  // Rotate Selected Element(s) by 45°
  const handleRotateSelected = useCallback(() => {
    if (selectedItems.length === 0) return;
    handleBulkRotateSelected();
  }, [selectedItems, handleBulkRotateSelected]);

  // Unified Escape & Cancellation Handler (called on Esc key, Android tablet back gesture, popstate, or on-screen Stop button)
  const handleEscape = useCallback(() => {
    // 1. If PDF export modal is open, close it
    if (isPDFModalOpen) {
      setIsPDFModalOpen(false);
      showToast('Closed PDF Export (Esc)');
      return;
    }

    // 2. Increment cancelSignal so CADCanvas cancels active wall/dimension drafting chain immediately
    setCancelSignal((prev) => prev + 1);

    // 3. If symbol palette is open, close it
    if (isSymbolPaletteOpen) {
      setIsSymbolPaletteOpen(false);
    }

    // 4. If an active tool is engaged (wall, box-select, dimension, column, door, window), revert to select tool
    if (activeTool !== 'select') {
      setActiveTool('select');
      showToast('Canceled active tool (Esc)');
      return;
    }

    // 5. If any elements are selected, clear selection
    if (selectedItems.length > 0) {
      setSelectedItems([]);
      showToast('Cleared selection (Esc)');
      return;
    }

    showToast('CAD Workstation Ready');
  }, [isPDFModalOpen, isSymbolPaletteOpen, activeTool, selectedItems, showToast]);

  // Cancel active drawing or deselect
  const handleCancelActiveDrawing = useCallback(
    (msg: string) => {
      showToast(msg);
      setCancelSignal((prev) => prev + 1);
      setActiveTool('select');
    },
    [showToast]
  );

  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLayerLock = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleLoadSample = () => {
    const freshSample = createSamplePermitPlan();
    setWalls(freshSample.walls);
    setOpenings(freshSample.openings);
    setColumns(freshSample.columns);
    setSymbols(freshSample.symbols);
    setDimensions(freshSample.dimensions);
    setRooms(freshSample.rooms);
    setSelectedItems([{ type: 'wall', id: freshSample.walls[0].id }]);
    pushToHistory(
      freshSample.walls,
      freshSample.openings,
      freshSample.columns,
      freshSample.symbols,
      freshSample.dimensions,
      freshSample.rooms,
      'Load Sample Blueprint'
    );
    showToast('Loaded Sample Residential Blueprint');
  };

  const handleClearCanvas = () => {
    setWalls([]);
    setOpenings([]);
    setColumns([]);
    setSymbols([]);
    setDimensions([]);
    setRooms([]);
    setSelectedItems([]);
    pushToHistory([], [], [], [], [], [], 'Clear Canvas');
    showToast('Cleared canvas (New Blank Drawing)');
  };

  const handleCursorMove = (
    pos: Point,
    lineLen: number | null,
    lineAng: number | null
  ) => {
    setCursorPos(pos);
    setActiveLineLength(lineLen);
    setActiveLineAngle(lineAng);
  };

  // --- SAVE & OPEN BLUEPRINT PROJECT FILES (.json) ---
  const handleSaveProject = () => {
    const projectData: SavedProjectFile = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      projectInfo,
      layers,
      drawing: {
        walls,
        openings,
        columns,
        symbols,
        dimensions,
        rooms,
      },
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(projectInfo.name || 'Blueprint').replace(/[^a-zA-Z0-9_-]/g, '_')}_Project.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Blueprint saved to JSON project file');
  };

  const handleOpenFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenFileDrop = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed: SavedProjectFile = JSON.parse(event.target?.result as string);
          if (parsed.drawing) {
            const d = parsed.drawing;
            setWalls(d.walls || []);
            setOpenings(d.openings || []);
            setColumns(d.columns || []);
            setSymbols(d.symbols || []);
            setDimensions(d.dimensions || []);
            setRooms(d.rooms || []);
            if (parsed.projectInfo) setProjectInfo(parsed.projectInfo);
            if (parsed.layers) setLayers(parsed.layers);
            setSelectedItems([]);
            pushToHistory(
              d.walls || [],
              d.openings || [],
              d.columns || [],
              d.symbols || [],
              d.dimensions || [],
              d.rooms || [],
              `Open File: ${file.name}`
            );
            showToast(`Loaded blueprint: ${file.name}`);
          }
        } catch (err) {
          console.error('Error importing project:', err);
          showToast('Invalid JSON blueprint file');
        }
      };
      reader.readAsText(file);
    },
    [pushToHistory, showToast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleOpenFileDrop(file);
    // Reset file input value so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleExportPDF = (options: PDFExportOptions) => {
    exportOfficialPlanPDF(
      walls,
      openings,
      columns,
      symbols,
      dimensions,
      rooms,
      projectInfo,
      options
    );
    showToast('Generated Official Vector PDF Blueprint');
  };

  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Escape: Stop active drawing, deselect, or close modal
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleEscape();
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z (without shift)
      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        (cmdOrCtrl && e.key.toLowerCase() === 'y') ||
        (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // Open: Ctrl+O / Cmd+O
      if (cmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFilePicker();
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Group: Ctrl+G / Cmd+G or G
      if ((cmdOrCtrl && e.key.toLowerCase() === 'g') || (!cmdOrCtrl && e.key.toLowerCase() === 'g')) {
        if (selectedItems.length > 1) {
          e.preventDefault();
          handleGroupSelected();
          return;
        }
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Rotate: R key when items selected
      if (e.key.toLowerCase() === 'r' && selectedItems.length > 0) {
        e.preventDefault();
        handleRotateSelected();
        return;
      }

      // Tool switching shortcuts
      if (!cmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        if (e.key.toLowerCase() === 'b') setActiveTool('box-select');
        if (e.key.toLowerCase() === 'w') setActiveTool('wall');
        if (e.key.toLowerCase() === 'c') setActiveTool('column');
        if (e.key.toLowerCase() === 'd') setActiveTool('door');
        if (e.key.toLowerCase() === 'o') setActiveTool('window');
        if (e.key.toLowerCase() === 'm') setActiveTool('dimension');
        if (e.key.toLowerCase() === 'h') setActiveTool('pan');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    handleEscape,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleRotateSelected,
    handleGroupSelected,
    handleOpenFilePicker,
    selectedItems,
  ]);

  // Prevent Android tablets and mobile browsers from closing the app or PWA when pressing Escape or Back gesture
  useEffect(() => {
    // 1. Try to lock Escape key in Chromium / PWA if supported
    if (
      'keyboard' in navigator &&
      typeof (navigator as unknown as { keyboard?: { lock?: (keys: string[]) => Promise<void> } }).keyboard?.lock === 'function'
    ) {
      try {
        (navigator as unknown as { keyboard: { lock: (keys: string[]) => Promise<void> } }).keyboard.lock(['Escape']).catch(() => {});
      } catch (_) {}
    }

    // 2. Setup History guard state to trap Android Back gestures / Esc navigation
    try {
      window.history.pushState({ cadGuard: true }, '', window.location.href);
    } catch (_) {}

    const handlePopState = () => {
      // Re-push history entry immediately so subsequent Back actions never exit the app
      try {
        window.history.pushState({ cadGuard: true }, '', window.location.href);
      } catch (_) {}
      handleEscape();
    };

    // 3. Capture-phase KeyDown and KeyUp handler to intercept Escape before Android / browser default back navigation triggers
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleEscape();
      }
    };

    const handleCaptureKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    window.addEventListener('keyup', handleCaptureKeyUp, { capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
      window.removeEventListener('keyup', handleCaptureKeyUp, { capture: true });
      if (
        'keyboard' in navigator &&
        typeof (navigator as unknown as { keyboard?: { unlock?: () => void } }).keyboard?.unlock === 'function'
      ) {
        try {
          (navigator as unknown as { keyboard: { unlock: () => void } }).keyboard.unlock();
        } catch (_) {}
      }
    };
  }, [handleEscape]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090D16] text-slate-100 select-none">
      {/* Hidden File Input for Opening Project Files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Top CAD Navigation & Context Bar */}
      <CADTopNav
        wallThickness={wallThickness}
        onWallThicknessChange={setWallThickness}
        snapSettings={snapSettings}
        onSnapSettingsChange={setSnapSettings}
        canUndo={canUndo}
        onUndo={handleUndo}
        canRedo={canRedo}
        onRedo={handleRedo}
        onSaveProject={handleSaveProject}
        onOpenProjectFile={handleOpenFilePicker}
        onExportPDF={() => setIsPDFModalOpen(true)}
        onLoadSample={handleLoadSample}
        onClearCanvas={handleClearCanvas}
        scaleString={projectInfo.scaleString}
      />

      {/* 2. Main Workstation Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Docked Left Toolstrip */}
        <CADToolstrip
          activeTool={activeTool}
          onSelectTool={(tool) => setActiveTool(tool)}
          isSymbolPaletteOpen={isSymbolPaletteOpen}
          onToggleSymbolPalette={() => setIsSymbolPaletteOpen(!isSymbolPaletteOpen)}
        />

        {/* Collapsible Drag-and-Drop Symbol & Fixture Palette */}
        <SymbolPalette
          isOpen={isSymbolPaletteOpen}
          onClose={() => setIsSymbolPaletteOpen(false)}
          onPlaceSymbol={handlePlaceSymbolFromPalette}
        />

        {/* Central CAD Drafting Canvas */}
        <CADCanvas
          walls={walls}
          openings={openings}
          columns={columns}
          symbols={symbols}
          dimensions={dimensions}
          rooms={rooms}
          activeTool={activeTool}
          wallThickness={wallThickness}
          snapSettings={snapSettings}
          selectedItems={selectedItems}
          selectedLabel={selectedElementLabel}
          onSelectElement={handleSelectElement}
          onBoxSelectElements={handleBoxSelectElements}
          onAddWall={handleAddWall}
          onAddColumn={handleAddColumn}
          onAddOpening={handleAddOpening}
          onAddSymbol={handleAddSymbol}
          onAddDimension={handleAddDimension}
          onUpdateSymbolPosition={handleUpdateSymbolPosition}
          onUpdateColumnPosition={handleUpdateColumnPosition}
          onFinishDragMove={handleFinishDragMove}
          onCursorMove={handleCursorMove}
          onCancelActiveDrawing={handleCancelActiveDrawing}
          onDuplicateSelected={handleDuplicateSelected}
          onRotateSelected={handleRotateSelected}
          onDeleteSelected={handleDeleteSelected}
          onGroupSelected={handleGroupSelected}
          onOpenFileDrop={handleOpenFileDrop}
          zoom={zoom}
          onZoomChange={setZoom}
          cancelSignal={cancelSignal}
        />

        {/* Docked Right Inspector & Layer Manager */}
        <CADInspector
          selectedElement={currentSelectedData}
          selectedCount={selectedCount}
          selectedBreakdown={selectedBreakdown}
          onBulkUpdateWallThickness={handleBulkUpdateWallThickness}
          onBulkRotateSelected={handleBulkRotateSelected}
          onGroupSelected={handleGroupSelected}
          onUpdateWall={handleUpdateWall}
          onUpdateColumn={handleUpdateColumn}
          onUpdateSymbol={handleUpdateSymbol}
          onUpdateDimension={handleUpdateDimension}
          onDeleteSelected={handleDeleteSelected}
          layers={layers}
          onToggleLayerVisibility={handleToggleLayerVisibility}
          onToggleLayerLock={handleToggleLayerLock}
          projectInfo={projectInfo}
          onUpdateProjectInfo={setProjectInfo}
          totalWallLengthInches={totalWallLength}
          totalColumnCount={columns.length}
          totalSymbolCount={symbols.length}
          estimatedAreaSqFt={estimatedAreaSqFt}
        />
      </div>

      {/* 3. Bottom Odometer & Status Bar */}
      <CADOdometer
        cursorPos={cursorPos}
        activeLineLength={activeLineLength}
        activeLineAngle={activeLineAngle}
        activeTool={activeTool}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.2, 4.5))}
        onZoomOut={() => setZoom((z) => Math.max(z * 0.8, 0.25))}
        onResetView={() => setZoom(1.1)}
      />

      {/* 4. Official PDF Print & Export Dialog */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        projectInfo={projectInfo}
        onExport={handleExportPDF}
      />

      {/* 5. Minimalist Status Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 right-6 bg-[#111827] border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-sky-300 font-mono shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
          <span className="text-slate-400 mr-1.5">●</span>
          {toastMessage}
        </div>
      )}

      {/* 6. Tablet & Mobile Floating Esc / Stop Action */}
      {(activeTool !== 'select' || selectedItems.length > 0) && (
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#111827] border border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xl text-xs text-slate-200">
          <span className="text-slate-400 font-mono text-[11px]">
            {activeTool !== 'select' ? `Tool: ${activeTool.toUpperCase()}` : `${selectedItems.length} selected`}
          </span>
          <button
            type="button"
            onClick={handleEscape}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-medium text-[11px] border border-slate-600 transition-colors cursor-pointer"
            title="Cancel active drawing or selection (Esc)"
          >
            <X className="w-3 h-3 text-sky-400" />
            <span>Stop / Esc</span>
          </button>
        </div>
      )}
    </div>
  );
}
