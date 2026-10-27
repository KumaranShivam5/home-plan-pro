import React from 'react';
import {
  Layers,
  FileText,
  RotateCw,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sliders,
  Maximize,
  Boxes,
} from 'lucide-react';
import {
  WallSegment,
  ColumnElement,
  PlacedSymbol,
  DimensionLine,
  CADLayer,
  ProjectInfo,
  ColumnShape,
  ColumnHatch,
} from '../types/cad';
import { formatImperial, distance } from '../utils/cadMath';

interface CADInspectorProps {
  selectedElement:
    | { type: 'wall'; data: WallSegment }
    | { type: 'column'; data: ColumnElement }
    | { type: 'symbol'; data: PlacedSymbol }
    | { type: 'dimension'; data: DimensionLine }
    | null;
  selectedCount: number;
  selectedBreakdown: { walls: number; columns: number; symbols: number; dimensions: number };
  onBulkUpdateWallThickness: (thickness: number) => void;
  onBulkRotateSelected: () => void;
  onGroupSelected: () => void;
  onUpdateWall: (wall: WallSegment) => void;
  onUpdateColumn: (column: ColumnElement) => void;
  onUpdateSymbol: (symbol: PlacedSymbol) => void;
  onUpdateDimension: (dim: DimensionLine) => void;
  onDeleteSelected: () => void;
  layers: CADLayer[];
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  projectInfo: ProjectInfo;
  onUpdateProjectInfo: (info: ProjectInfo) => void;
  totalWallLengthInches: number;
  totalColumnCount: number;
  totalSymbolCount: number;
  estimatedAreaSqFt: number;
}

export const CADInspector: React.FC<CADInspectorProps> = ({
  selectedElement,
  selectedCount,
  selectedBreakdown,
  onBulkUpdateWallThickness,
  onBulkRotateSelected,
  onGroupSelected,
  onUpdateWall,
  onUpdateColumn,
  onUpdateSymbol,
  onUpdateDimension,
  onDeleteSelected,
  layers,
  onToggleLayerVisibility,
  onToggleLayerLock,
  projectInfo,
  onUpdateProjectInfo,
  totalWallLengthInches,
  totalColumnCount,
  totalSymbolCount,
  estimatedAreaSqFt,
}) => {
  return (
    <aside className="w-72 bg-[#111827] border-l border-slate-800 flex flex-col h-full select-none shrink-0 z-20 overflow-y-auto">
      {/* Dynamic Inspector Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            {selectedCount > 1
              ? `MULTI-SELECT (${selectedCount})`
              : selectedElement
                ? `${selectedElement.type.toUpperCase()} PROPERTIES`
                : 'DRAWING INSPECTOR'}
          </h2>
        </div>
        {(selectedCount > 0 || selectedElement) && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title={selectedCount > 1 ? `Delete All (${selectedCount})` : 'Delete Selected Item'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-4">
        {/* CASE 0: MULTI-SELECTION ACTIVE */}
        {selectedCount > 1 && (
          <div className="space-y-3 p-3 bg-[#090D16] border border-sky-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-300 font-mono">
                {selectedCount} Elements Selected
              </span>
              <button
                type="button"
                onClick={onGroupSelected}
                className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/50 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="Group into Assembly (Ctrl+G)"
              >
                <Boxes className="w-3 h-3" />
                <span>Group</span>
              </button>
            </div>

            {/* Breakdown Tags */}
            <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 font-mono">
              {selectedBreakdown.walls > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">
                  {selectedBreakdown.walls} Wall{selectedBreakdown.walls > 1 ? 's' : ''}
                </span>
              )}
              {selectedBreakdown.columns > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                  {selectedBreakdown.columns} Col{selectedBreakdown.columns > 1 ? 's' : ''}
                </span>
              )}
              {selectedBreakdown.symbols > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">
                  {selectedBreakdown.symbols} Symbol{selectedBreakdown.symbols > 1 ? 's' : ''}
                </span>
              )}
              {selectedBreakdown.dimensions > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                  {selectedBreakdown.dimensions} Dim{selectedBreakdown.dimensions > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              {selectedBreakdown.walls > 0 && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Set Wall Width for All Selected Walls:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[4.5, 6, 8, 10].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => onBulkUpdateWallThickness(th)}
                        className="px-1.5 py-1 rounded text-[10px] font-mono bg-slate-800 hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        {th}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedBreakdown.symbols > 0 || selectedBreakdown.columns > 0) && (
                <button
                  type="button"
                  onClick={onBulkRotateSelected}
                  className="w-full flex items-center justify-center gap-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rotate Selected (+45°)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDeleteSelected}
                className="w-full flex items-center justify-center gap-1.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All {selectedCount} Selected</span>
              </button>
            </div>
          </div>
        )}
        {/* CASE 1: WALL SELECTED */}
        {selectedElement?.type === 'wall' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Wall Length</label>
              <div className="bg-[#090D16] border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-sky-300">
                {formatImperial(distance(selectedElement.data.start, selectedElement.data.end))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Wall Width / Thickness
              </label>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {[4.5, 6, 8, 10, 12].map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() =>
                      onUpdateWall({ ...selectedElement.data, thickness: th })
                    }
                    className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                      selectedElement.data.thickness === th
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500 font-semibold'
                        : 'border-slate-800 text-slate-300 bg-[#090D16] hover:bg-slate-800'
                    }`}
                  >
                    {th}"
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Custom:</span>
                <input
                  type="number"
                  min="2"
                  max="36"
                  step="0.5"
                  value={selectedElement.data.thickness}
                  onChange={(e) =>
                    onUpdateWall({
                      ...selectedElement.data,
                      thickness: Math.max(2, parseFloat(e.target.value) || 4.5),
                    })
                  }
                  className="w-20 bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
                <span className="text-[11px] text-slate-500 font-mono">inches</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Wall Function</label>
              <select
                value={selectedElement.data.type}
                onChange={(e) =>
                  onUpdateWall({
                    ...selectedElement.data,
                    type: e.target.value as any,
                  })
                }
                className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="exterior">Exterior Envelope (Load-Bearing)</option>
                <option value="interior">Interior Partition</option>
                <option value="foundation">Foundation / Masonry</option>
              </select>
            </div>

            <div className="p-2 bg-[#090D16] border border-slate-800/80 rounded text-[11px] text-slate-400">
              <span className="text-sky-400 font-medium">Auto-Merge active:</span> Corner vertices within 2" automatically fuse with neighboring walls for continuous architectural cavities.
            </div>
          </div>
        )}

        {/* CASE 2: COLUMN SELECTED */}
        {selectedElement?.type === 'column' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-sky-400" />
                <span>Column ID / Grid Label:</span>
              </label>
              <input
                type="text"
                value={selectedElement.data.label}
                onChange={(e) =>
                  onUpdateColumn({ ...selectedElement.data, label: e.target.value })
                }
                placeholder="e.g. C-1, COL-A2"
                className="w-full bg-[#090D16] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id="colShowLabel"
                  checked={selectedElement.data.showLabel}
                  onChange={(e) =>
                    onUpdateColumn({ ...selectedElement.data, showLabel: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <label htmlFor="colShowLabel" className="text-[11px] text-slate-300 cursor-pointer">
                  Show Grid Label on Blueprint
                </label>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Shape</label>
              <div className="grid grid-cols-2 gap-1">
                {(['rect', 'circle'] as ColumnShape[]).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => onUpdateColumn({ ...selectedElement.data, shape })}
                    className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                      selectedElement.data.shape === shape
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500'
                        : 'bg-[#090D16] border border-slate-800 text-slate-400'
                    }`}
                  >
                    {shape === 'rect' ? 'Square / Rect' : 'Round / Pillar'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Width (in)</label>
                <input
                  type="number"
                  min="6"
                  max="48"
                  value={selectedElement.data.width}
                  onChange={(e) =>
                    onUpdateColumn({
                      ...selectedElement.data,
                      width: Math.max(6, parseFloat(e.target.value) || 12),
                    })
                  }
                  className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Depth (in)</label>
                <input
                  type="number"
                  min="6"
                  max="48"
                  value={selectedElement.data.height}
                  onChange={(e) =>
                    onUpdateColumn({
                      ...selectedElement.data,
                      height: Math.max(6, parseFloat(e.target.value) || 12),
                    })
                  }
                  className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Engineering Hatching
              </label>
              <select
                value={selectedElement.data.hatchPattern}
                onChange={(e) =>
                  onUpdateColumn({
                    ...selectedElement.data,
                    hatchPattern: e.target.value as ColumnHatch,
                  })
                }
                className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="cross">Structural Concrete Cross-Hatch</option>
                <option value="solid">Solid Black / Reinforced Core</option>
                <option value="diagonal">Diagonal Masonry Slash</option>
                <option value="none">Clear Hollow</option>
              </select>
            </div>
          </div>
        )}

        {/* CASE 3: SYMBOL SELECTED */}
        {selectedElement?.type === 'symbol' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-sky-400" />
                <span>Official Symbol Name / Tag:</span>
              </label>
              <input
                type="text"
                value={selectedElement.data.name}
                onChange={(e) =>
                  onUpdateSymbol({ ...selectedElement.data, name: e.target.value })
                }
                placeholder="e.g. KITCHEN ISLAND - 72x36"
                className="w-full bg-[#090D16] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id="symShowLabel"
                  checked={selectedElement.data.showLabel}
                  onChange={(e) =>
                    onUpdateSymbol({ ...selectedElement.data, showLabel: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <label htmlFor="symShowLabel" className="text-[11px] text-slate-300 cursor-pointer">
                  Display Name on Blueprint & Export
                </label>
              </div>
            </div>

            {/* Rotation Controls */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Rotation</label>
              <div className="flex items-center gap-1">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onUpdateSymbol({ ...selectedElement.data, rotation: deg })}
                    className={`flex-1 py-1 rounded text-xs font-mono transition-colors ${
                      selectedElement.data.rotation === deg
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500'
                        : 'bg-[#090D16] border border-slate-800 text-slate-400'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSymbol({
                      ...selectedElement.data,
                      rotation: (selectedElement.data.rotation + 45) % 360,
                    })
                  }
                  className="p-1 bg-[#090D16] border border-slate-800 rounded text-slate-300 hover:text-white"
                  title="Rotate +45°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Width (in)</label>
                <input
                  type="number"
                  value={selectedElement.data.width}
                  onChange={(e) =>
                    onUpdateSymbol({
                      ...selectedElement.data,
                      width: Math.max(6, parseFloat(e.target.value) || 12),
                    })
                  }
                  className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Depth (in)</label>
                <input
                  type="number"
                  value={selectedElement.data.height}
                  onChange={(e) =>
                    onUpdateSymbol({
                      ...selectedElement.data,
                      height: Math.max(6, parseFloat(e.target.value) || 12),
                    })
                  }
                  className="w-full bg-[#090D16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* CASE 4: DIMENSION LINE SELECTED */}
        {selectedElement?.type === 'dimension' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Calculated Distance
              </label>
              <div className="bg-[#090D16] border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-sky-300">
                {formatImperial(distance(selectedElement.data.start, selectedElement.data.end))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Custom Text Override (Optional)
              </label>
              <input
                type="text"
                value={selectedElement.data.overrideText || ''}
                onChange={(e) =>
                  onUpdateDimension({
                    ...selectedElement.data,
                    overrideText: e.target.value,
                  })
                }
                placeholder="e.g. 14'-0&quot; CLEAR"
                className="w-full bg-[#090D16] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* GENERAL DRAWING OVERVIEW & LAYER MANAGER (Always accessible) */}
        <div className="pt-3 border-t border-slate-800 space-y-4">
          {/* Layer Manager */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Drawing Layers
              </h3>
            </div>
            <div className="space-y-1 bg-[#090D16] border border-slate-800 rounded p-1.5">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="font-medium text-[11px]">{layer.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleLayerVisibility(layer.id)}
                      className="text-slate-400 hover:text-slate-100 p-0.5"
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? <Eye className="w-3 h-3 text-sky-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLayerLock(layer.id)}
                      className="text-slate-400 hover:text-slate-100 p-0.5"
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-slate-600" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Maximize className="w-3.5 h-3.5 text-sky-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Plan Statistics
              </h3>
            </div>
            <div className="bg-[#090D16] border border-slate-800 rounded p-2.5 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Total Wall Footprint:</span>
                <span className="text-slate-200">{formatImperial(totalWallLengthInches)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Structural Columns:</span>
                <span className="text-sky-300">{totalColumnCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Installed Fixtures:</span>
                <span className="text-sky-300">{totalSymbolCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Living Area:</span>
                <span className="text-emerald-400">{estimatedAreaSqFt} sq ft</span>
              </div>
            </div>
          </div>

          {/* Official Submission Metadata */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Title Block Details
              </h3>
            </div>
            <div className="space-y-2 bg-[#090D16] border border-slate-800 rounded p-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 block">Project Title</label>
                <input
                  type="text"
                  value={projectInfo.name}
                  onChange={(e) => onUpdateProjectInfo({ ...projectInfo, name: e.target.value })}
                  className="w-full bg-[#111827] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Client / Owner</label>
                <input
                  type="text"
                  value={projectInfo.client}
                  onChange={(e) => onUpdateProjectInfo({ ...projectInfo, client: e.target.value })}
                  className="w-full bg-[#111827] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Site Address / Parcel</label>
                <input
                  type="text"
                  value={projectInfo.address}
                  onChange={(e) => onUpdateProjectInfo({ ...projectInfo, address: e.target.value })}
                  className="w-full bg-[#111827] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono mt-0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-slate-500 block">Sheet No</label>
                  <input
                    type="text"
                    value={projectInfo.sheetNo}
                    onChange={(e) => onUpdateProjectInfo({ ...projectInfo, sheetNo: e.target.value })}
                    className="w-full bg-[#111827] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Drafter / Arch</label>
                  <input
                    type="text"
                    value={projectInfo.drafter}
                    onChange={(e) => onUpdateProjectInfo({ ...projectInfo, drafter: e.target.value })}
                    className="w-full bg-[#111827] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
