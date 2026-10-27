import React, { useState } from 'react';
import { Search, X, Tag, Move } from 'lucide-react';
import { SYMBOLS_CATALOG, SymbolTemplate } from '../utils/symbolsCatalog.tsx';
import { SymbolCategory } from '../types/cad';

interface SymbolPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSymbol: (template: SymbolTemplate, customName?: string) => void;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({
  isOpen,
  onClose,
  onPlaceSymbol,
}) => {
  const [activeCategory, setActiveCategory] = useState<SymbolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');

  if (!isOpen) return null;

  const categories: { id: SymbolCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'architectural', label: 'Arch' },
    { id: 'kitchen-bath', label: 'Kitchen/Bath' },
    { id: 'furnishing', label: 'Furniture' },
    { id: 'structural', label: 'Columns' },
    { id: 'electrical', label: 'Elec/HVAC' },
  ];

  const filteredSymbols = SYMBOLS_CATALOG.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, template: SymbolTemplate) => {
    const payload = {
      templateId: template.id,
      name: customNameInput.trim() || template.name,
      width: template.defaultWidth,
      height: template.defaultHeight,
      category: template.category,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-72 bg-[#111827] border-r border-slate-800 flex flex-col h-full select-none shrink-0 z-20">
      {/* Drawer Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
        <div>
          <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Symbol & Fixture Palette
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Drag to canvas or click to insert</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Symbol Name Customizer Input */}
      <div className="p-3 border-b border-slate-800 bg-[#090D16]">
        <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 mb-1">
          <Tag className="w-3 h-3 text-sky-400" />
          <span>Custom Symbol Name / Tag:</span>
        </label>
        <input
          type="text"
          value={customNameInput}
          onChange={(e) => setCustomNameInput(e.target.value)}
          placeholder="e.g. KITCHEN ISLAND - UNIT 01"
          className="w-full bg-[#111827] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
        />
        <p className="text-[9px] text-slate-500 mt-1">
          Leave blank to use official standard template name
        </p>
      </div>

      {/* Search Input */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fixtures, columns..."
            className="w-full bg-[#090D16] border border-slate-800 rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 pb-2 flex flex-wrap gap-1 border-b border-slate-800">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Symbol List Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSymbols.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onClick={() => onPlaceSymbol(item, customNameInput.trim() || undefined)}
            className="group p-2.5 bg-[#090D16] border border-slate-800 hover:border-sky-500/50 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 font-mono transition-colors">
                  {customNameInput.trim() || item.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {item.description}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono">
                  <span>{item.defaultWidth}" × {item.defaultHeight}"</span>
                  <span>·</span>
                  <span className="capitalize">{item.category}</span>
                </div>
              </div>

              {/* Vector Preview Thumbnail */}
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                <svg
                  viewBox={`-${item.defaultWidth / 1.5} -${item.defaultHeight / 1.5} ${item.defaultWidth * 1.3} ${item.defaultHeight * 1.3}`}
                  className="w-full h-full"
                >
                  {item.renderSvg(item.defaultWidth, item.defaultHeight)}
                </svg>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-slate-400">
              <span className="flex items-center gap-1">
                <Move className="w-3 h-3 text-slate-500" /> Drag to drop
              </span>
              <span className="text-sky-400 font-medium">Click to place</span>
            </div>
          </div>
        ))}

        {filteredSymbols.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No symbols found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
