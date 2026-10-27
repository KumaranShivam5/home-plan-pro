import React from 'react';
import {
  MousePointer,
  BoxSelect,
  Square,
  Columns,
  DoorOpen,
  AppWindow,
  Ruler,
  Maximize2,
  Trash2,
  Hand,
  Package,
} from 'lucide-react';
import { CADTool } from '../types/cad';

interface CADToolstripProps {
  activeTool: CADTool;
  onSelectTool: (tool: CADTool) => void;
  isSymbolPaletteOpen: boolean;
  onToggleSymbolPalette: () => void;
}

export const CADToolstrip: React.FC<CADToolstripProps> = ({
  activeTool,
  onSelectTool,
  isSymbolPaletteOpen,
  onToggleSymbolPalette,
}) => {
  const tools: { id: CADTool; label: string; shortcut: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'select', label: 'Select & Move (Click or Shift+Click)', shortcut: 'V', icon: MousePointer },
    { id: 'box-select', label: 'Box Select (Marquee Area)', shortcut: 'B', icon: BoxSelect },
    { id: 'wall', label: 'Continuous Wall (Auto-Merge)', shortcut: 'W', icon: Square },
    { id: 'column', label: 'Structural Column / Pillar', shortcut: 'C', icon: Columns },
    { id: 'door', label: 'Snapping Door Opening', shortcut: 'D', icon: DoorOpen },
    { id: 'window', label: 'Snapping Window', shortcut: 'O', icon: AppWindow },
    { id: 'dimension', label: 'Architectural Dimension', shortcut: 'M', icon: Ruler },
    { id: 'measure-area', label: 'Measure Room Area (Sq Ft)', shortcut: 'A', icon: Maximize2 },
    { id: 'pan', label: 'Pan Canvas', shortcut: 'H', icon: Hand },
    { id: 'delete', label: 'Delete Object', shortcut: 'Del', icon: Trash2 },
  ];

  return (
    <aside className="w-12 bg-[#111827] border-r border-slate-800 flex flex-col items-center py-2 gap-1.5 select-none shrink-0 z-20">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} [${t.shortcut}]`}
            className={`w-9 h-9 rounded flex flex-col items-center justify-center relative transition-colors ${
              isActive
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[8px] font-mono leading-none mt-0.5">{t.shortcut}</span>
          </button>
        );
      })}

      <div className="w-6 h-px bg-slate-800 my-1" />

      {/* Symbol Palette Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleSymbolPalette}
        title="Toggle Drag-and-Drop Symbol & Fixture Palette"
        className={`w-9 h-9 rounded flex flex-col items-center justify-center transition-colors relative ${
          isSymbolPaletteOpen
            ? 'bg-slate-800 text-sky-400 border border-sky-500/50'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        }`}
      >
        <Package className="w-4 h-4" />
        <span className="text-[7px] font-mono leading-none mt-0.5">LIB</span>
      </button>
    </aside>
  );
};
