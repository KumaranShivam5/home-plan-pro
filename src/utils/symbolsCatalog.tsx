import React from 'react';
import { SymbolCategory } from '../types/cad';

export interface SymbolTemplate {
  id: string;
  name: string; // Official default name
  category: SymbolCategory;
  defaultWidth: number; // inches
  defaultHeight: number; // inches
  description: string;
  renderSvg: (w: number, h: number, isSelected?: boolean) => React.ReactNode;
}

export const SYMBOLS_CATALOG: SymbolTemplate[] = [
  // --- ARCHITECTURAL & STRUCTURAL ---
  {
    id: 'col-rect-12',
    name: 'COLUMN C-12x12',
    category: 'structural',
    defaultWidth: 12,
    defaultHeight: 12,
    description: '12"x12" Structural Reinforced Concrete Column',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Structural cross hatching */}
          <line x1={-w / 2} y1={-h / 2} x2={w / 2} y2={h / 2} stroke="#000000" strokeWidth="0.8" />
          <line x1={w / 2} y1={-h / 2} x2={-w / 2} y2={h / 2} stroke="#000000" strokeWidth="0.8" />
          <rect x={-w / 4} y={-h / 4} width={w / 2} height={h / 2} fill="#000000" stroke="none" />
        </g>
      );
    },
  },
  {
    id: 'col-rect-16',
    name: 'COLUMN C-16x16',
    category: 'structural',
    defaultWidth: 16,
    defaultHeight: 16,
    description: '16"x16" Heavy Load Bearing Column',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2.5' : '1.8'}
          />
          <line x1={-w / 2} y1={-h / 2} x2={w / 2} y2={h / 2} stroke="#000000" strokeWidth="1" />
          <line x1={w / 2} y1={-h / 2} x2={-w / 2} y2={h / 2} stroke="#000000" strokeWidth="1" />
          <rect x={-w / 4} y={-h / 4} width={w / 2} height={h / 2} fill="#000000" stroke="none" />
        </g>
      );
    },
  },
  {
    id: 'col-round-16',
    name: 'PILLAR DIA-16',
    category: 'structural',
    defaultWidth: 16,
    defaultHeight: 16,
    description: '16" Diameter Round Architectural Pillar',
    renderSvg: (w, _h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={w / 2}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#000000" strokeWidth="0.8" />
          <line x1={0} y1={-w / 2} x2={0} y2={w / 2} stroke="#000000" strokeWidth="0.8" />
          <circle cx={0} cy={0} r={w / 4} fill="#000000" stroke="none" />
        </g>
      );
    },
  },
  {
    id: 'stairs-straight',
    name: 'STAIRCASE 36x108',
    category: 'architectural',
    defaultWidth: 36,
    defaultHeight: 108,
    description: '36" Wide Straight Run Staircase with Direction Arrow',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Treads */}
          {Array.from({ length: 9 }).map((_, i) => {
            const y = -h / 2 + (h / 10) * (i + 1);
            return <line key={i} x1={-w / 2} y1={y} x2={w / 2} y2={y} stroke="#000000" strokeWidth="1" />;
          })}
          {/* Walk line and UP arrow */}
          <line x1={0} y1={h / 2 - 12} x2={0} y2={-h / 2 + 18} stroke="#000000" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points={`0,${-h / 2 + 8} -5,${-h / 2 + 18} 5,${-h / 2 + 18}`} fill="#000000" />
          <circle cx={0} cy={h / 2 - 12} r={3} fill="#000000" />
          <text x={8} y={0} fill="#000000" fontSize="10" fontWeight="bold" fontFamily="sans-serif">UP</text>
        </g>
      );
    },
  },

  // --- KITCHEN & BATH ---
  {
    id: 'kitchen-island',
    name: 'KITCHEN ISLAND 72x36',
    category: 'kitchen-bath',
    defaultWidth: 72,
    defaultHeight: 36,
    description: '72"x36" Kitchen Island Counter with Overhang',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Counter base offset */}
          <rect
            x={-w / 2 + 4}
            y={-h / 2 + 4}
            width={w - 8}
            height={h - 14}
            fill="none"
            stroke="#000000"
            strokeDasharray="4 2"
            strokeWidth="1"
          />
          {/* Barstool indicators */}
          <circle cx={-w / 3} cy={h / 2 - 6} r={4} fill="none" stroke="#000000" strokeWidth="1" />
          <circle cx={0} cy={h / 2 - 6} r={4} fill="none" stroke="#000000" strokeWidth="1" />
          <circle cx={w / 3} cy={h / 2 - 6} r={4} fill="none" stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'sink-double',
    name: 'SINK DOUBLE 33x22',
    category: 'kitchen-bath',
    defaultWidth: 33,
    defaultHeight: 22,
    description: '33"x22" Undermount Double-Basin Sink',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={3}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Left Basin */}
          <rect
            x={-w / 2 + 3}
            y={-h / 2 + 3}
            width={w / 2 - 4.5}
            height={h - 6}
            rx={2}
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1"
          />
          <circle cx={-w / 4} cy={0} r={2.5} fill="#000000" />
          {/* Right Basin */}
          <rect
            x={1.5}
            y={-h / 2 + 3}
            width={w / 2 - 4.5}
            height={h - 6}
            rx={2}
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1"
          />
          <circle cx={w / 4} cy={0} r={2.5} fill="#000000" />
          {/* Faucet center */}
          <circle cx={0} cy={-h / 2 + 2} r={2} fill="#000000" />
        </g>
      );
    },
  },
  {
    id: 'range-cooktop',
    name: 'RANGE 30x24',
    category: 'kitchen-bath',
    defaultWidth: 30,
    defaultHeight: 24,
    description: '30" 4-Burner Electric/Gas Cooktop Range',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* 4 Burners */}
          <circle cx={-w / 4} cy={-h / 4} r={4} fill="none" stroke="#000000" strokeWidth="1" />
          <circle cx={w / 4} cy={-h / 4} r={5} fill="none" stroke="#000000" strokeWidth="1" />
          <circle cx={-w / 4} cy={h / 4} r={5} fill="none" stroke="#000000" strokeWidth="1" />
          <circle cx={w / 4} cy={h / 4} r={4} fill="none" stroke="#000000" strokeWidth="1" />
          {/* Control strip */}
          <line x1={-w / 2 + 2} y1={-h / 2 + 3} x2={w / 2 - 2} y2={-h / 2 + 3} stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'refrigerator-36',
    name: 'REFRIGERATOR 36x34',
    category: 'kitchen-bath',
    defaultWidth: 36,
    defaultHeight: 34,
    description: '36" French Door Refrigerator with Handles',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Front door line */}
          <line x1={-w / 2} y1={h / 2 - 4} x2={w / 2} y2={h / 2 - 4} stroke="#000000" strokeWidth="1" />
          <line x1={0} y1={h / 2 - 4} x2={0} y2={h / 2} stroke="#000000" strokeWidth="1" />
          <rect x={-4} y={h / 2 - 2} width={3} height={2} fill="#000000" />
          <rect x={1} y={h / 2 - 2} width={3} height={2} fill="#000000" />
        </g>
      );
    },
  },
  {
    id: 'water-closet',
    name: 'WATER CLOSET WC-01',
    category: 'kitchen-bath',
    defaultWidth: 20,
    defaultHeight: 28,
    description: 'Standard Elongated Water Closet / Toilet',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          {/* Tank */}
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={8}
            rx={2}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Bowl */}
          <path
            d={`M ${-w / 2.5} ${-h / 2 + 8} Q ${-w / 2.5} ${h / 2} 0 ${h / 2} Q ${w / 2.5} ${h / 2} ${w / 2.5} ${-h / 2 + 8} Z`}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Inner Bowl Opening */}
          <ellipse cx={0} cy={2} rx={w / 4} ry={h / 4} fill="none" stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'bathtub-60',
    name: 'BATHTUB 60x32',
    category: 'kitchen-bath',
    defaultWidth: 60,
    defaultHeight: 32,
    description: '60"x32" Standard Alcove Soaking Bathtub',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Tub inner oval */}
          <rect
            x={-w / 2 + 3}
            y={-h / 2 + 3}
            width={w - 6}
            height={h - 6}
            rx={10}
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.2"
          />
          {/* Drain */}
          <circle cx={-w / 2 + 10} cy={0} r={2.5} fill="#000000" />
        </g>
      );
    },
  },

  // --- FURNISHING ---
  {
    id: 'bed-queen',
    name: 'BED QUEEN 60x80',
    category: 'furnishing',
    defaultWidth: 60,
    defaultHeight: 80,
    description: 'Queen Size Bed with Headboard & Pillows',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          {/* Mattress frame */}
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={4}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Headboard */}
          <rect x={-w / 2} y={-h / 2} width={w} height={6} fill="#000000" stroke="#000000" strokeWidth="1" />
          {/* Pillows */}
          <rect x={-w / 2 + 4} y={-h / 2 + 8} width={w / 2 - 8} height={14} rx={3} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          <rect x={4} y={-h / 2 + 8} width={w / 2 - 8} height={14} rx={3} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          {/* Duvet fold */}
          <path d={`M ${-w / 2} ${-h / 2 + 28} Q 0 ${-h / 2 + 32} ${w / 2} ${-h / 2 + 28}`} fill="none" stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'sofa-3seat',
    name: 'SOFA 3-SEATER 84x36',
    category: 'furnishing',
    defaultWidth: 84,
    defaultHeight: 36,
    description: '84"x36" 3-Cushion Living Room Sofa',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          {/* Main body */}
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={4}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Backrest */}
          <rect x={-w / 2} y={-h / 2} width={w} height={8} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          {/* Left Armrest */}
          <rect x={-w / 2} y={-h / 2} width={6} height={h} rx={2} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          {/* Right Armrest */}
          <rect x={w / 2 - 6} y={-h / 2} width={6} height={h} rx={2} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          {/* Cushion dividers */}
          <line x1={-w / 6} y1={-h / 2 + 8} x2={-w / 6} y2={h / 2 - 2} stroke="#000000" strokeWidth="1" />
          <line x1={w / 6} y1={-h / 2 + 8} x2={w / 6} y2={h / 2 - 2} stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'dining-table-6',
    name: 'DINING TABLE 6P 72x38',
    category: 'furnishing',
    defaultWidth: 72,
    defaultHeight: 38,
    description: '6-Person Dining Table with Chairs',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={3}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* 6 Chairs */}
          {[-w / 3, 0, w / 3].map((cx, idx) => (
            <React.Fragment key={idx}>
              <rect x={cx - 7} y={-h / 2 - 5} width={14} height={5} rx={1} fill="#FFFFFF" stroke="#000000" strokeWidth="0.8" />
              <rect x={cx - 7} y={h / 2} width={14} height={5} rx={1} fill="#FFFFFF" stroke="#000000" strokeWidth="0.8" />
            </React.Fragment>
          ))}
        </g>
      );
    },
  },
  {
    id: 'desk-workstation',
    name: 'OFFICE DESK 60x30',
    category: 'furnishing',
    defaultWidth: 60,
    defaultHeight: 30,
    description: '60"x30" Workstation Desk with Chair Well',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          {/* Left Pedestal Drawers */}
          <line x1={-w / 2 + 16} y1={-h / 2} x2={-w / 2 + 16} y2={h / 2} stroke="#000000" strokeWidth="1" />
          {/* Chair cavity arc */}
          <path d={`M ${-w / 2 + 18} ${h / 2} Q 0 ${h / 2 - 8} ${w / 2 - 6} ${h / 2}`} fill="none" stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },

  // --- ELECTRICAL & HVAC ---
  {
    id: 'elec-panel',
    name: 'PANEL MAIN-200A',
    category: 'electrical',
    defaultWidth: 16,
    defaultHeight: 6,
    description: '200A Main Electrical Distribution Panel',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          <line x1={-w / 2} y1={-h / 2} x2={w / 2} y2={h / 2} stroke="#000000" strokeWidth="1" />
          <line x1={-w / 2} y1={h / 2} x2={w / 2} y2={-h / 2} stroke="#000000" strokeWidth="1" />
        </g>
      );
    },
  },
  {
    id: 'elec-receptacle',
    name: 'OUTLET DUPLEX 120V',
    category: 'electrical',
    defaultWidth: 12,
    defaultHeight: 12,
    description: 'Standard 120V Duplex Wall Receptacle Symbol',
    renderSvg: (w, _h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <circle cx={0} cy={0} r={w / 2} fill="#FFFFFF" stroke={strokeColor} strokeWidth={isSelected ? '2' : '1.5'} />
          <line x1={0} y1={-w / 2} x2={0} y2={w / 2} stroke="#000000" strokeWidth="1.2" />
          <line x1={-w / 3} y1={-w / 4} x2={0} y2={-w / 4} stroke="#000000" strokeWidth="1.2" />
          <line x1={-w / 3} y1={w / 4} x2={0} y2={w / 4} stroke="#000000" strokeWidth="1.2" />
        </g>
      );
    },
  },
  {
    id: 'hvac-unit',
    name: 'HVAC UNIT 36x36',
    category: 'hvac',
    defaultWidth: 36,
    defaultHeight: 36,
    description: '3-Ton Outdoor Condenser / HVAC Unit',
    renderSvg: (w, h, isSelected) => {
      const strokeColor = isSelected ? '#C85A32' : '#000000';
      return (
        <g>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth={isSelected ? '2' : '1.5'}
          />
          <circle cx={0} cy={0} r={w / 2.6} fill="#FFFFFF" stroke="#000000" strokeWidth="1.2" />
          <circle cx={0} cy={0} r={w / 6} fill="#000000" />
          <line x1={-w / 2.6} y1={0} x2={w / 2.6} y2={0} stroke="#000000" strokeWidth="0.8" />
          <line x1={0} y1={-h / 2.6} x2={0} y2={h / 2.6} stroke="#000000" strokeWidth="0.8" />
        </g>
      );
    },
  },
];
