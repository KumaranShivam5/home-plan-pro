import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Compass } from 'lucide-react';
import { Point, CADTool } from '../types/cad';
import { formatImperial, formatMetric } from '../utils/cadMath';

interface CADOdometerProps {
  cursorPos: Point;
  activeLineLength: number | null;
  activeLineAngle: number | null;
  activeTool: CADTool;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const CADOdometer: React.FC<CADOdometerProps> = ({
  cursorPos,
  activeLineLength,
  activeLineAngle,
  activeTool,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const getToolTip = (tool: CADTool): string => {
    switch (tool) {
      case 'wall':
        return 'Wall Tool: Click on grid to start. Click on corners to auto-merge L & T junctions. Press ESC to finish chain.';
      case 'column':
        return 'Column Tool: Click to place structural column. Use Inspector to change dimensions & crosshatch.';
      case 'door':
        return 'Door Tool: Hover near any wall to snap opening and architectural swing arc.';
      case 'window':
        return 'Window Tool: Click along wall centerline to insert glazed window opening.';
      case 'dimension':
        return 'Dimension Tool: Click start point, then click end point to add architectural dimension with tick marks.';
      case 'measure-area':
        return 'Area Tool: Click corners of a room to calculate square footage.';
      case 'select':
        return 'Select Tool: Click wall, column or fixture to inspect, edit symbol name, resize or drag.';
      case 'pan':
        return 'Pan Tool: Click and drag canvas to navigate workspace.';
      case 'delete':
        return 'Delete Tool: Click any element to remove from blueprint.';
      default:
        return 'Ready.';
    }
  };

  return (
    <footer className="h-8 bg-[#111827] border-t border-slate-800 flex items-center justify-between px-3 text-xs select-none shrink-0 z-30 font-mono">
      {/* Odometer Coordinates */}
      <div className="flex items-center gap-4 text-slate-300">
        <div className="flex items-center gap-2 bg-[#090D16] border border-slate-800 rounded px-2 py-0.5">
          <span className="text-slate-500 font-semibold">X:</span>
          <span className="text-sky-300 font-semibold">{formatImperial(cursorPos.x)}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 font-semibold">Y:</span>
          <span className="text-sky-300 font-semibold">{formatImperial(cursorPos.y)}</span>
          <span className="text-[10px] text-slate-500 hidden md:inline">
            ({formatMetric(cursorPos.x)}, {formatMetric(cursorPos.y)})
          </span>
        </div>

        {/* Active Line Length and Angle if drawing */}
        {activeLineLength !== null && activeLineAngle !== null && (
          <div className="flex items-center gap-2 bg-[#090D16] border border-amber-500/40 rounded px-2 py-0.5 text-amber-300">
            <span className="text-amber-500 font-semibold">LEN:</span>
            <span className="font-semibold">{formatImperial(activeLineLength)}</span>
            <span className="text-amber-600">|</span>
            <span className="text-amber-500 font-semibold flex items-center gap-0.5">
              <Compass className="w-3 h-3 inline" /> ANG:
            </span>
            <span className="font-semibold">{activeLineAngle.toFixed(1)}°</span>
          </div>
        )}
      </div>

      {/* Tool Tip / Status */}
      <div className="hidden lg:block text-[11px] text-slate-400 font-sans truncate max-w-md">
        {getToolTip(activeTool)}
      </div>

      {/* Zoom and Navigation */}
      <div className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded px-1.5 py-0.5 text-slate-400">
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          className="hover:text-slate-100 p-0.5 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-slate-300 min-w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          className="hover:text-slate-100 p-0.5 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-slate-800" />
        <button
          type="button"
          onClick={onResetView}
          title="Fit Floor Plan to Screen"
          className="hover:text-slate-100 p-0.5 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
