import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { CADTopNav } from './components/CADTopNav';
import { CADToolstrip } from './components/CADToolstrip';
import { SymbolPalette } from './components/SymbolPalette';
import { CADCanvas } from './components/CADCanvas';
import { CADInspector } from './components/CADInspector';
import { CADOdometer } from './components/CADOdometer';
import { PDFExportModal } from './components/PDFExportModal';

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
    setSelectedElement(null);
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
    setSelectedElement(null);
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
  const [selectedElement, setSelectedElement] = useState<{
    type: 'wall' | 'column' | 'symbol' | 'dimension';
    id: string;
  } | null>({ type: 'wall', id: initialPlan.walls[0]?.id || '' });

  // Canvas Viewport & Odometer State
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [activeLineLength, setActiveLineLength] = useState<number | null>(null);
  const [activeLineAngle, setActiveLineAngle] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1.1);

  // PDF Export Modal State
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Hidden File Input Ref for Project Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Properties for selected element
  const currentSelectedData = useMemo(() => {
    if (!selectedElement) return null;
    if (selectedElement.type === 'wall') {
      const w = walls.find((item) => item.id === selectedElement.id);
      return w ? { type: 'wall' as const, data: w } : null;
    }
    if (selectedElement.type === 'column') {
      const c = columns.find((item) => item.id === selectedElement.id);
      return c ? { type: 'column' as const, data: c } : null;
    }
    if (selectedElement.type === 'symbol') {
      const s = symbols.find((item) => item.id === selectedElement.id);
      return s ? { type: 'symbol' as const, data: s } : null;
    }
    if (selectedElement.type === 'dimension') {
      const d = dimensions.find((item) => item.id === selectedElement.id);
      return d ? { type: 'dimension' as const, data: d } : null;
    }
    return null;
  }, [selectedElement, walls, columns, symbols, dimensions]);

  // Label for selected element to show in floating canvas HUD
  const selectedElementLabel = useMemo(() => {
    if (!selectedElement) return undefined;
    if (selectedElement.type === 'wall') {
      const w = walls.find((item) => item.id === selectedElement.id);
      return w ? `Wall (${w.thickness}")` : 'Wall';
    }
    if (selectedElement.type === 'column') {
      const c = columns.find((item) => item.id === selectedElement.id);
      return c ? `Column ${c.label}` : 'Column';
    }
    if (selectedElement.type === 'symbol') {
      const s = symbols.find((item) => item.id === selectedElement.id);
      return s ? s.name : 'Symbol';
    }
    if (selectedElement.type === 'dimension') {
      return 'Dimension Line';
    }
    return undefined;
  }, [selectedElement, walls, columns, symbols]);

  // Statistics
  const totalWallLength = useMemo(() => {
    return walls.reduce((sum, w) => sum + distance(w.start, w.end), 0);
  }, [walls]);

  const estimatedAreaSqFt = useMemo(() => {
    return rooms.reduce((sum, r) => sum + r.areaSqFt, 0) || 864;
  }, [rooms]);

  // --- DRAWING ACTION HANDLERS WITH UNDO/REDO REGISTRATION ---

  const handleSelectElement = (
    type: 'wall' | 'column' | 'symbol' | 'dimension' | null,
    id: string | null
  ) => {
    if (!type || !id) {
      setSelectedElement(null);
    } else {
      setSelectedElement({ type, id });
    }
  };

  const handleAddWall = (newWall: WallSegment) => {
    const nextWalls = [...walls, newWall];
    setWalls(nextWalls);
    setSelectedElement({ type: 'wall', id: newWall.id });
    pushToHistory(nextWalls, openings, columns, symbols, dimensions, rooms, 'Add Wall');
    showToast('Wall segment added & merged');
  };

  const handleAddColumn = (newCol: ColumnElement) => {
    const nextCols = [...columns, newCol];
    setColumns(nextCols);
    setSelectedElement({ type: 'column', id: newCol.id });
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
    setSelectedElement({ type: 'symbol', id: newSym.id });
    pushToHistory(walls, openings, columns, nextSyms, dimensions, rooms, `Add ${newSym.name}`);
    showToast(`Placed ${newSym.name}`);
  };

  const handleAddDimension = (newDim: DimensionLine) => {
    const nextDims = [...dimensions, newDim];
    setDimensions(nextDims);
    setSelectedElement({ type: 'dimension', id: newDim.id });
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
      setSelectedElement({ type: 'column', id: newCol.id });
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
      setSelectedElement({ type: 'symbol', id: newSym.id });
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

  const handleDeleteSelected = useCallback(() => {
    if (!selectedElement) return;
    let deletedName = 'Item';

    let nextWalls = walls;
    let nextOpenings = openings;
    let nextCols = columns;
    let nextSyms = symbols;
    let nextDims = dimensions;

    if (selectedElement.type === 'wall') {
      deletedName = 'Wall Segment';
      nextWalls = walls.filter((w) => w.id !== selectedElement.id);
      nextOpenings = openings.filter((op) => op.wallId !== selectedElement.id);
      setWalls(nextWalls);
      setOpenings(nextOpenings);
    } else if (selectedElement.type === 'column') {
      const target = columns.find((c) => c.id === selectedElement.id);
      deletedName = target ? `Column ${target.label}` : 'Column';
      nextCols = columns.filter((c) => c.id !== selectedElement.id);
      setColumns(nextCols);
    } else if (selectedElement.type === 'symbol') {
      const target = symbols.find((s) => s.id === selectedElement.id);
      deletedName = target ? target.name : 'Symbol';
      nextSyms = symbols.filter((s) => s.id !== selectedElement.id);
      setSymbols(nextSyms);
    } else if (selectedElement.type === 'dimension') {
      deletedName = 'Dimension Line';
      nextDims = dimensions.filter((d) => d.id !== selectedElement.id);
      setDimensions(nextDims);
    }

    pushToHistory(nextWalls, nextOpenings, nextCols, nextSyms, nextDims, rooms, `Delete ${deletedName}`);
    showToast(`Deleted ${deletedName}`);
    setSelectedElement(null);
  }, [selectedElement, walls, openings, columns, symbols, dimensions, rooms, pushToHistory, showToast]);

  // Duplicate / Clone Selected Element
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'column') {
      const col = columns.find((c) => c.id === selectedElement.id);
      if (!col) return;
      const newCol: ColumnElement = {
        ...col,
        id: `col_${Date.now()}`,
        position: { x: col.position.x + 24, y: col.position.y + 24 },
        label: `${col.label}-COPY`,
      };
      const nextCols = [...columns, newCol];
      setColumns(nextCols);
      setSelectedElement({ type: 'column', id: newCol.id });
      pushToHistory(walls, openings, nextCols, symbols, dimensions, rooms, `Duplicate Column ${col.label}`);
      showToast(`Duplicated ${col.label}`);
    } else if (selectedElement.type === 'symbol') {
      const sym = symbols.find((s) => s.id === selectedElement.id);
      if (!sym) return;
      const newSym: PlacedSymbol = {
        ...sym,
        id: `sym_${Date.now()}`,
        position: { x: sym.position.x + 24, y: sym.position.y + 24 },
        name: `${sym.name} (Copy)`,
      };
      const nextSyms = [...symbols, newSym];
      setSymbols(nextSyms);
      setSelectedElement({ type: 'symbol', id: newSym.id });
      pushToHistory(walls, openings, columns, nextSyms, dimensions, rooms, `Duplicate ${sym.name}`);
      showToast(`Duplicated ${sym.name}`);
    } else if (selectedElement.type === 'wall') {
      const w = walls.find((item) => item.id === selectedElement.id);
      if (!w) return;
      const newWall: WallSegment = {
        ...w,
        id: `wall_${Date.now()}`,
        start: { x: w.start.x + 24, y: w.start.y + 24 },
        end: { x: w.end.x + 24, y: w.end.y + 24 },
      };
      const nextWalls = [...walls, newWall];
      setWalls(nextWalls);
      setSelectedElement({ type: 'wall', id: newWall.id });
      pushToHistory(nextWalls, openings, columns, symbols, dimensions, rooms, 'Duplicate Wall');
      showToast('Duplicated Wall segment');
    }
  }, [selectedElement, columns, symbols, walls, openings, dimensions, rooms, pushToHistory, showToast]);

  // Rotate Selected Element by 45°
  const handleRotateSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'symbol') {
      const sym = symbols.find((s) => s.id === selectedElement.id);
      if (!sym) return;
      const updated: PlacedSymbol = { ...sym, rotation: (sym.rotation + 45) % 360 };
      handleUpdateSymbol(updated);
      showToast(`Rotated ${sym.name} to ${updated.rotation}°`);
    } else if (selectedElement.type === 'column') {
      const col = columns.find((c) => c.id === selectedElement.id);
      if (!col) return;
      const updated: ColumnElement = { ...col, rotation: (col.rotation + 45) % 360 };
      handleUpdateColumn(updated);
      showToast(`Rotated Column ${col.label} to ${updated.rotation}°`);
    }
  }, [selectedElement, symbols, columns, showToast]);

  // Cancel active drawing or deselect
  const handleCancelActiveDrawing = useCallback(
    (msg: string) => {
      showToast(msg);
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
    setSelectedElement({ type: 'wall', id: freshSample.walls[0].id });
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
    setSelectedElement(null);
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

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          pushToHistory(
            d.walls || [],
            d.openings || [],
            d.columns || [],
            d.symbols || [],
            d.dimensions || [],
            d.rooms || [],
            `Import: ${file.name}`
          );
          showToast(`Loaded project: ${file.name}`);
        }
      } catch (err) {
        console.error('Error importing project:', err);
        showToast('Invalid project file format');
      }
    };
    reader.readAsText(file);
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

      // Duplicate: Ctrl+D / Cmd+D
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Rotate: R key when item selected
      if (e.key.toLowerCase() === 'r' && selectedElement) {
        e.preventDefault();
        handleRotateSelected();
        return;
      }

      // Tool switching shortcuts
      if (!cmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
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
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleRotateSelected,
    selectedElement,
  ]);

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
          selectedId={selectedElement?.id || null}
          selectedLabel={selectedElementLabel}
          onSelectElement={handleSelectElement}
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
          zoom={zoom}
          onZoomChange={setZoom}
        />

        {/* Docked Right Inspector & Layer Manager */}
        <CADInspector
          selectedElement={currentSelectedData}
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
    </div>
  );
}
