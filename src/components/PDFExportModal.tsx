import React, { useState } from 'react';
import { X, Download, FileCheck, CheckSquare, Square, Printer } from 'lucide-react';
import { ProjectInfo } from '../types/cad';
import { PDFExportOptions } from '../utils/pdfExport';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectInfo: ProjectInfo;
  onExport: (options: PDFExportOptions) => void;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  projectInfo,
  onExport,
}) => {
  const [paperSize, setPaperSize] = useState<'letter' | 'tabloid' | 'archD'>('letter');
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeDimensions, setIncludeDimensions] = useState(true);
  const [includeSymbolLabels, setIncludeSymbolLabels] = useState(true);
  const [includeGrid, setIncludeGrid] = useState(true);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onExport({
      orientation: 'landscape',
      paperSize,
      includeTitleBlock,
      includeDimensions,
      includeSymbolLabels,
      includeGrid,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-lg max-w-lg w-full shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-sky-500 rounded flex items-center justify-center text-slate-950">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Official PDF Blueprint Export
              </h2>
              <p className="text-[11px] text-slate-400">
                Vector precision ready for municipal permit review & plotters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Paper Size Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5 uppercase tracking-wider">
              Drawing Sheet Size:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'letter', label: 'Letter (11"×8.5")', desc: 'Office Print' },
                { id: 'tabloid', label: 'Tabloid (17"×11")', desc: 'Standard Half-Size' },
                { id: 'archD', label: 'Arch D (36"×24")', desc: 'Full Architectural Plot' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperSize(p.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    paperSize === p.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                      : 'bg-[#090D16] border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-semibold">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Toggles */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-2 uppercase tracking-wider">
              Sheet Layers & Annotations:
            </label>
            <div className="space-y-2 bg-[#090D16] border border-slate-800 rounded-lg p-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitleBlock}
                  onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <span>Include Official Architectural Title Block & North Arrow</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDimensions}
                  onChange={(e) => setIncludeDimensions(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <span>Include Architectural Dimension Strings & Witness Ticks</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSymbolLabels}
                  onChange={(e) => setIncludeSymbolLabels(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <span>Include Symbol Nomenclature / Equipment Tags</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGrid}
                  onChange={(e) => setIncludeGrid(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                <span>Include Engineering Background Grid Ticks</span>
              </label>
            </div>
          </div>

          {/* Submission Sheet Summary */}
          <div className="bg-[#090D16] border border-slate-800 rounded-lg p-3 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Project:</span>
              <span className="text-slate-200 font-semibold truncate max-w-xs">{projectInfo.name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sheet No:</span>
              <span className="text-sky-300 font-semibold">{projectInfo.sheetNo}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Architectural Scale:</span>
              <span className="text-slate-200">{projectInfo.scaleString}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-3 bg-[#0B0F19]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold rounded text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate & Download Vector PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
