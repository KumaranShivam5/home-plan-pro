import jsPDF from 'jspdf';
import {
  WallSegment,
  WallOpening,
  ColumnElement,
  PlacedSymbol,
  DimensionLine,
  RoomArea,
  ProjectInfo,
} from '../types/cad';
import { formatImperial, distance, computeWallPolygons } from './cadMath';

export interface PDFExportOptions {
  orientation: 'landscape' | 'portrait';
  paperSize: 'letter' | 'tabloid' | 'archD';
  includeTitleBlock: boolean;
  includeDimensions: boolean;
  includeSymbolLabels: boolean;
  includeGrid: boolean;
}

export function exportOfficialPlanPDF(
  walls: WallSegment[],
  openings: WallOpening[],
  columns: ColumnElement[],
  symbols: PlacedSymbol[],
  dimensions: DimensionLine[],
  rooms: RoomArea[],
  project: ProjectInfo,
  options: PDFExportOptions = {
    orientation: 'landscape',
    paperSize: 'letter',
    includeTitleBlock: true,
    includeDimensions: true,
    includeSymbolLabels: true,
    includeGrid: true,
  }
) {
  // Determine sheet dimensions in points (72 points = 1 inch)
  let sheetWidthPt = 792; // 11 inches landscape
  let sheetHeightPt = 612; // 8.5 inches landscape

  if (options.paperSize === 'tabloid') {
    sheetWidthPt = 1224; // 17 inches
    sheetHeightPt = 792; // 11 inches
  } else if (options.paperSize === 'archD') {
    sheetWidthPt = 2592; // 36 inches
    sheetHeightPt = 1728; // 24 inches
  }

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'pt',
    format: [sheetWidthPt, sheetHeightPt],
  });

  const margin = 28; // 28pt border margin
  const printableWidth = sheetWidthPt - margin * 2;
  const printableHeight = sheetHeightPt - margin * 2;

  // 1. Draw Architectural Double Outer Border
  doc.setDrawColor(20, 20, 25);
  doc.setLineWidth(2.0);
  doc.rect(margin, margin, printableWidth, printableHeight);

  doc.setLineWidth(0.6);
  doc.rect(margin + 4, margin + 4, printableWidth - 8, printableHeight - 8);

  // 2. Compute Drawing Bounding Box to center floor plan on sheet
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const w of walls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }

  for (const c of columns) {
    minX = Math.min(minX, c.position.x - c.width / 2);
    maxX = Math.max(maxX, c.position.x + c.width / 2);
    minY = Math.min(minY, c.position.y - c.height / 2);
    maxY = Math.max(maxY, c.position.y + c.height / 2);
  }

  for (const s of symbols) {
    minX = Math.min(minX, s.position.x - s.width / 2);
    maxX = Math.max(maxX, s.position.x + s.width / 2);
    minY = Math.min(minY, s.position.y - s.height / 2);
    maxY = Math.max(maxY, s.position.y + s.height / 2);
  }

  if (!isFinite(minX)) {
    minX = 0;
    maxX = 480;
    minY = 0;
    maxY = 360;
  }

  // Add 10% padding
  const planWidthInches = Math.max(120, maxX - minX + 60);
  const planHeightInches = Math.max(120, maxY - minY + 60);

  // Available area leaving room for right-hand or bottom-right title block
  const titleBlockWidth = options.includeTitleBlock ? 220 : 0;
  const titleBlockHeight = options.includeTitleBlock ? 110 : 0;

  const contentAreaWidth = printableWidth - titleBlockWidth - 40;
  const contentAreaHeight = printableHeight - 40;

  // Scale factor (points on paper per inch of world model)
  const scaleFactor = Math.min(
    contentAreaWidth / planWidthInches,
    contentAreaHeight / planHeightInches,
    1.5 // max zoom
  );

  const planCenterX = (minX + maxX) / 2;
  const planCenterY = (minY + maxY) / 2;

  const targetCenterX = margin + 20 + contentAreaWidth / 2;
  const targetCenterY = margin + printableHeight / 2;

  const toPt = (p: { x: number; y: number }) => ({
    x: targetCenterX + (p.x - planCenterX) * scaleFactor,
    y: targetCenterY + (p.y - planCenterY) * scaleFactor,
  });

  // 3. Optional Background Grid Ticks
  if (options.includeGrid) {
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    for (let x = margin + 20; x < margin + contentAreaWidth; x += 36) {
      doc.line(x, margin + 10, x, margin + printableHeight - 10);
    }
    for (let y = margin + 20; y < margin + printableHeight; y += 36) {
      doc.line(margin + 10, y, margin + contentAreaWidth, y);
    }
  }

  // 4. Draw Auto-Merged Walls
  const wallPolygons = computeWallPolygons(walls);
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(240, 243, 246); // Clean subtle architectural wall fill

  for (const wp of wallPolygons) {
    const ptPoints = wp.points.map(toPt);
    if (ptPoints.length >= 4) {
      doc.setLineWidth(Math.max(1.0, (wp.thickness * scaleFactor) / 4));
      const p0 = ptPoints[0];
      const deltas: [number, number][] = [];
      for (let i = 1; i < ptPoints.length; i++) {
        deltas.push([ptPoints[i].x - ptPoints[i - 1].x, ptPoints[i].y - ptPoints[i - 1].y]);
      }
      deltas.push([p0.x - ptPoints[ptPoints.length - 1].x, p0.y - ptPoints[ptPoints.length - 1].y]);
      doc.lines(deltas, p0.x, p0.y, [1, 1], 'FD', true);
    }
  }

  // 5. Draw Openings (Doors & Windows)
  for (const op of openings) {
    const parentWall = walls.find((w) => w.id === op.wallId);
    if (!parentWall) continue;

    const dx = parentWall.end.x - parentWall.start.x;
    const dy = parentWall.end.y - parentWall.start.y;
    const wallLen = Math.hypot(dx, dy);
    if (wallLen < 0.1) continue;

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

    const ptStart = toPt(pStart);
    const ptEnd = toPt(pEnd);

    // Erase wall section with white fill
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    const cutoutH = (parentWall.thickness * scaleFactor) + 2;
    doc.rect(
      Math.min(ptStart.x, ptEnd.x) - 2,
      Math.min(ptStart.y, ptEnd.y) - 2,
      Math.abs(ptEnd.x - ptStart.x) + 4,
      Math.max(cutoutH, Math.abs(ptEnd.y - ptStart.y) + 4),
      'F'
    );

    // Redraw Opening Graphics
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.0);

    if (op.type === 'door' || op.type === 'pocket-door') {
      // Door jamb lines
      doc.line(ptStart.x, ptStart.y, ptStart.x + nx * 6, ptStart.y + ny * 6);
      doc.line(ptEnd.x, ptEnd.y, ptEnd.x + nx * 6, ptEnd.y + ny * 6);

      // Swing leaf
      const leafEnd = {
        x: pStart.x + nx * op.width,
        y: pStart.y + ny * op.width,
      };
      const ptLeafEnd = toPt(leafEnd);
      doc.line(ptStart.x, ptStart.y, ptLeafEnd.x, ptLeafEnd.y);

      // Swing arc
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.5);
      doc.line(ptLeafEnd.x, ptLeafEnd.y, ptEnd.x, ptEnd.y);
    } else {
      // Window: outer sills and glass lines
      doc.line(ptStart.x, ptStart.y, ptEnd.x, ptEnd.y);
      const ptGlass1 = toPt({ x: pStart.x + nx * 2, y: pStart.y + ny * 2 });
      const ptGlass2 = toPt({ x: pEnd.x + nx * 2, y: pEnd.y + ny * 2 });
      doc.line(ptGlass1.x, ptGlass1.y, ptGlass2.x, ptGlass2.y);
    }
  }

  // 6. Draw Structural Columns
  for (const col of columns) {
    const ptPos = toPt(col.position);
    const colW = col.width * scaleFactor;
    const colH = col.height * scaleFactor;

    doc.setFillColor(220, 225, 230);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);

    if (col.shape === 'circle') {
      doc.circle(ptPos.x, ptPos.y, colW / 2, 'FD');
      doc.line(ptPos.x - colW / 2, ptPos.y, ptPos.x + colW / 2, ptPos.y);
      doc.line(ptPos.x, ptPos.y - colH / 2, ptPos.x, ptPos.y + colH / 2);
    } else {
      doc.rect(ptPos.x - colW / 2, ptPos.y - colH / 2, colW, colH, 'FD');
      // Cross hatch
      doc.setLineWidth(0.8);
      doc.line(ptPos.x - colW / 2, ptPos.y - colH / 2, ptPos.x + colW / 2, ptPos.y + colH / 2);
      doc.line(ptPos.x + colW / 2, ptPos.y - colH / 2, ptPos.x - colW / 2, ptPos.y + colH / 2);
    }

    // Column Label
    if (col.showLabel && col.label) {
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(col.label, ptPos.x, ptPos.y - colH / 2 - 3, { align: 'center' });
    }
  }

  // 7. Draw Placed Symbols and Official Nomenclature Labels
  for (const sym of symbols) {
    const ptPos = toPt(sym.position);
    const symW = sym.width * scaleFactor;
    const symH = sym.height * scaleFactor;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.8);
    doc.rect(ptPos.x - symW / 2, ptPos.y - symH / 2, symW, symH, 'FD');

    // Inner detail indicator
    doc.line(ptPos.x - symW / 4, ptPos.y, ptPos.x + symW / 4, ptPos.y);

    // Symbol official name / tag
    if (options.includeSymbolLabels && sym.showLabel && sym.name) {
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(sym.name, ptPos.x, ptPos.y + symH / 2 + 7, { align: 'center' });
    }
  }

  // 8. Draw Dimensions
  if (options.includeDimensions) {
    doc.setDrawColor(2, 132, 199); // Blue architectural dimension line
    doc.setTextColor(2, 132, 199);
    doc.setLineWidth(0.7);
    doc.setFontSize(8);

    for (const dim of dimensions) {
      const p1 = toPt(dim.start);
      const p2 = toPt(dim.end);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Dimension line
      doc.line(p1.x, p1.y, p2.x, p2.y);

      // Witness tick marks (45 degree architectural slash)
      const tick = 3;
      doc.line(p1.x - tick, p1.y + tick, p1.x + tick, p1.y - tick);
      doc.line(p2.x - tick, p2.y + tick, p2.x + tick, p2.y - tick);

      const dInches = distance(dim.start, dim.end);
      const text = dim.overrideText || formatImperial(dInches);
      doc.text(text, midX, midY - 3, { align: 'center' });
    }
  }

  // 9. Draw Room Names & Square Footage
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  for (const room of rooms) {
    if (room.points.length > 0) {
      let cx = 0;
      let cy = 0;
      for (const p of room.points) {
        cx += p.x;
        cy += p.y;
      }
      cx /= room.points.length;
      cy /= room.points.length;

      const ptCenter = toPt({ x: cx, y: cy });
      doc.text(room.name.toUpperCase(), ptCenter.x, ptCenter.y - 4, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${room.areaSqFt} SQ FT`, ptCenter.x, ptCenter.y + 6, { align: 'center' });
    }
  }

  // 10. Draw Official Architectural Title Block (Bottom-Right)
  if (options.includeTitleBlock) {
    const tbX = sheetWidthPt - margin - 4 - titleBlockWidth;
    const tbY = sheetHeightPt - margin - 4 - titleBlockHeight;

    // Solid container with double border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);
    doc.rect(tbX, tbY, titleBlockWidth, titleBlockHeight, 'FD');

    // Title block rows & columns
    doc.setLineWidth(0.6);
    doc.line(tbX, tbY + 28, tbX + titleBlockWidth, tbY + 28);
    doc.line(tbX, tbY + 68, tbX + titleBlockWidth, tbY + 68);
    doc.line(tbX + 130, tbY + 28, tbX + 130, tbY + 68);
    doc.line(tbX, tbY + 88, tbX + titleBlockWidth, tbY + 88);
    doc.line(tbX + 110, tbY + 88, tbX + 110, tbY + titleBlockHeight);

    // Text Content
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(project.name || 'RESIDENTIAL PERMIT DRAWING', tbX + 8, tbY + 16);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PROJECT TITLE & SITE LOCATION', tbX + 8, tbY + 24);

    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`CLIENT: ${project.client || 'OWNER'}`, tbX + 8, tbY + 40);
    doc.text(`SITE: ${project.address || 'OFFICIAL RECORD PLOT'}`, tbX + 8, tbY + 52);

    doc.text(`DATE: ${project.date || new Date().toISOString().slice(0, 10)}`, tbX + 136, tbY + 40);
    doc.text(`SCALE: ${project.scaleString || '1/4" = 1\'-0"'}`, tbX + 136, tbY + 52);
    doc.text(`DRAWN BY: ${project.drafter || 'ARCHITECT/CAD'}`, tbX + 136, tbY + 64);

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('SUBMISSION STATUS: OFFICIAL PERMIT REVIEW', tbX + 8, tbY + 80);

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('SHEET NUMBER', tbX + 8, tbY + 98);
    doc.setFontSize(12);
    doc.text(project.sheetNo || 'A-101', tbX + 8, tbY + 107);

    // Seal / Stamp placeholder
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('[ ARCHITECTURAL / ENGR SEAL ]', tbX + 116, tbY + 102);

    // North Arrow (Upper Right of drawing area)
    const naX = sheetWidthPt - margin - 35;
    const naY = margin + 35;
    doc.setLineWidth(1.2);
    doc.setDrawColor(15, 23, 42);
    doc.circle(naX, naY, 14, 'D');
    doc.setFillColor(15, 23, 42);
    doc.triangle(naX, naY - 12, naX - 5, naY, naX + 5, naY, 'F');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('N', naX, naY + 8, { align: 'center' });
  }

  // Save PDF
  const filename = `${(project.name || 'FloorPlan').replace(/[^a-zA-Z0-9_-]/g, '_')}_Official_A-101.pdf`;
  doc.save(filename);
}
