import React from 'react';
import {
  Download,
  Grid,
  CornerDownRight,
  RefreshCw,
  PlusCircle,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
} from 'lucide-react';
import { SnapSettings } from '../types/cad';
import { PWAInstallButton } from './PWAInstallButton';

interface CADTopNavProps {
  wallThickness: number;
  onWallThicknessChange: (thickness: number) => void;
  snapSettings: SnapSettings;
  onSnapSettingsChange: (settings: SnapSettings) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onSaveProject: () => void;
  onOpenProjectFile: () => void;
  onExportPDF: () => void;
  onLoadSample: () => void;
  onClearCanvas: () => void;
  scaleString: string;
}

export const CADTopNav: React.FC<CADTopNavProps> = ({
  wallThickness,
  onWallThicknessChange,
  snapSettings,
  onSnapSettingsChange,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onSaveProject,
  onOpenProjectFile,
  onExportPDF,
  onLoadSample,
  onClearCanvas,
  scaleString,
}) => {
  const wallWidthOptions = [
    { label: '4" Interior', val: 4.5 },
    { label: '6" Standard', val: 6 },
    { label: '8" Structural', val: 8 },
    { label: '10" Masonry', val: 10 },
    { label: '12" Heavy', val: 12 },
  ];

  return (
    <header className="h-12 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-4 gap-6 select-none shrink-0 z-30">
      {/* Zone 1: Brand wordmark & Undo/Redo Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center text-slate-950 font-bold text-xs tracking-tighter shadow-sm">
          HP
        </div>
        <div className="text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap">
          Home Plan Pro <span className="text-xs font-normal text-sky-400">Web CAD</span>
        </div>

        {/* Undo & Redo History Action Buttons */}
        <div className="flex items-center gap-0.5 bg-[#090D16] border border-slate-800 rounded p-0.5 ml-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo Last Action (Ctrl+Z)"
            className={`p-1 rounded transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo Action (Ctrl+Y / Ctrl+Shift+Z)"
            className={`p-1 rounded transition-colors ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 2: Navigation & CAD Context Commands */}
      <nav className="flex items-center gap-3 text-xs overflow-x-auto no-scrollbar py-1">
        {/* Wall Width Selector */}
        <div className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded px-2 py-1 shrink-0">
          <span className="text-slate-400 font-mono">Wall Width:</span>
          <div className="flex items-center gap-1">
            {wallWidthOptions.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onWallThicknessChange(opt.val)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  wallThickness === opt.val
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
                title={opt.label}
              >
                {opt.val}"
              </button>
            ))}
          </div>
        </div>

        {/* Snap Toggles */}
        <div className="flex items-center gap-1 bg-[#090D16] border border-slate-800 rounded p-1 shrink-0">
          <button
            type="button"
            onClick={() => onSnapSettingsChange({ ...snapSettings, snapToGrid: !snapSettings.snapToGrid })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              snapSettings.snapToGrid
                ? 'bg-slate-700 text-sky-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Snap to 12-inch Grid"
          >
            <Grid className="w-3 h-3" />
            <span>Grid Snap</span>
          </button>

          <button
            type="button"
            onClick={() => onSnapSettingsChange({ ...snapSettings, orthoLock: !snapSettings.orthoLock })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
              snapSettings.orthoLock
                ? 'bg-slate-700 text-sky-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Lock to 90° Perpendicular / Orthogonal Angles"
          >
            <CornerDownRight className="w-3 h-3" />
            <span>Ortho 90°</span>
          </button>
        </div>

        {/* Scale indicator */}
        <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono px-2 py-1 bg-[#090D16] border border-slate-800 rounded shrink-0">
          <span className="text-slate-500">Scale:</span>
          <span className="text-slate-200">{scaleString}</span>
        </div>

        {/* Project File Save & Open */}
        <div className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded px-1.5 py-1 shrink-0">
          <button
            type="button"
            onClick={onOpenProjectFile}
            className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60 rounded transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Open Saved CAD Blueprint Project File (.json) [Ctrl+O]"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Open File</span>
          </button>
          <button
            type="button"
            onClick={onSaveProject}
            className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
            title="Save CAD Blueprint File (.json) [Ctrl+S]"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span>Save</span>
          </button>
        </div>

        {/* Preset Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onLoadSample}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
            title="Load Sample Permit Blueprint with Merged Walls & Columns"
          >
            <RefreshCw className="w-3 h-3 text-sky-400" />
            <span>Sample Plan</span>
          </button>
          <button
            type="button"
            onClick={onClearCanvas}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
            title="Clear and start new blank drawing"
          >
            <PlusCircle className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </nav>

      {/* Zone 3: Primary action & PWA */}
      <div className="flex items-center gap-2 shrink-0">
        <PWAInstallButton />
        <button
          type="button"
          onClick={onExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export Official PDF</span>
          <span className="md:hidden">Export PDF</span>
        </button>
      </div>
    </header>
  );
};
