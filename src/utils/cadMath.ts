import { Point, WallSegment, WallOpening } from '../types/cad';

/**
 * Format length in inches to Imperial Architectural notation: e.g. 14'-6 1/2"
 */
export function formatImperial(inches: number): string {
  if (Math.abs(inches) < 0.01) return `0"`;

  const sign = inches < 0 ? '-' : '';
  const absInches = Math.abs(inches);

  const totalInches = Math.round(absInches * 16) / 16; // 1/16" precision
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;

  const wholeInches = Math.floor(remainingInches);
  const fraction = remainingInches - wholeInches;

  let fractionStr = '';
  const sixteenths = Math.round(fraction * 16);

  if (sixteenths === 16) {
    return formatImperial((feet * 12 + wholeInches + 1) * (inches < 0 ? -1 : 1));
  } else if (sixteenths === 8) {
    fractionStr = '1/2';
  } else if (sixteenths === 4) {
    fractionStr = '1/4';
  } else if (sixteenths === 12) {
    fractionStr = '3/4';
  } else if (sixteenths === 2) {
    fractionStr = '1/8';
  } else if (sixteenths === 6) {
    fractionStr = '3/8';
  } else if (sixteenths === 10) {
    fractionStr = '5/8';
  } else if (sixteenths === 14) {
    fractionStr = '7/8';
  } else if (sixteenths > 0) {
    fractionStr = `${sixteenths}/16`;
  }

  const inchPart = fractionStr ? (wholeInches > 0 ? `${wholeInches} ${fractionStr}"` : `${fractionStr}"`) : `${wholeInches}"`;

  if (feet > 0) {
    return `${sign}${feet}'-${inchPart}`;
  } else {
    return `${sign}${inchPart}`;
  }
}

/**
 * Format inches to Metric mm
 */
export function formatMetric(inches: number): string {
  const mm = Math.round(inches * 25.4);
  return `${mm.toLocaleString()} mm`;
}

/**
 * Distance between two points in inches
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Angle in degrees from p1 to p2 (0 to 360)
 */
export function angleDegrees(p1: Point, p2: Point): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Snap point to grid (in inches)
 */
export function snapToGridPoint(p: Point, gridSize: number): Point {
  if (gridSize <= 0) return p;
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}

/**
 * Snap angle to nearest 45° or 90°
 */
export function snapAngle(start: Point, current: Point, orthoLock: boolean): Point {
  const dist = distance(start, current);
  if (dist < 1) return current;

  const deg = angleDegrees(start, current);
  let targetDeg = deg;

  if (orthoLock) {
    // Snap strictly to 0, 90, 180, 270
    targetDeg = Math.round(deg / 90) * 90;
  } else {
    // Soft snap to 0, 45, 90, 135, 180, 225, 270, 315 within 4 degrees
    const snapped45 = Math.round(deg / 45) * 45;
    if (Math.abs(deg - snapped45) < 4.5) {
      targetDeg = snapped45;
    }
  }

  const rad = (targetDeg * Math.PI) / 180;
  return {
    x: start.x + dist * Math.cos(rad),
    y: start.y + dist * Math.sin(rad),
  };
}

/**
 * Find line intersection
 */
export function lineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return null; // parallel

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  return {
    x: p1.x + ua * (p2.x - p1.x),
    y: p1.y + ua * (p2.y - p1.y),
  };
}

/**
 * Wall polygon calculation with auto-merging corners:
 * For each wall, we determine its 4 corner polygon points.
 * If two walls share an endpoint (within snap tolerance 2"), we miter the corner!
 */
export interface ComputedWallPolygon {
  wallId: string;
  points: Point[]; // 4 points forming the outer boundary
  centerline: { start: Point; end: Point };
  thickness: number;
}

export function computeWallPolygons(walls: WallSegment[], snapTolerance = 2.0): ComputedWallPolygon[] {
  return walls.map((wall) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);

    if (len < 0.1) {
      return {
        wallId: wall.id,
        points: [wall.start, wall.start, wall.end, wall.end],
        centerline: { start: wall.start, end: wall.end },
        thickness: wall.thickness,
      };
    }

    // Normal vector perpendicular to wall centerline
    const nx = (-dy / len) * (wall.thickness / 2);
    const ny = (dx / len) * (wall.thickness / 2);

    // Initial 4 corner points
    let p1 = { x: wall.start.x + nx, y: wall.start.y + ny };
    let p2 = { x: wall.end.x + nx, y: wall.end.y + ny };
    let p3 = { x: wall.end.x - nx, y: wall.end.y - ny };
    let p4 = { x: wall.start.x - nx, y: wall.start.y - ny };

    // Check for corner miter with other connected walls at start
    for (const other of walls) {
      if (other.id === wall.id) continue;
      const otherDx = other.end.x - other.start.x;
      const otherDy = other.end.y - other.start.y;
      const otherLen = Math.hypot(otherDx, otherDy);
      if (otherLen < 0.1) continue;

      const otherNx = (-otherDy / otherLen) * (other.thickness / 2);
      const otherNy = (otherDx / otherLen) * (other.thickness / 2);

      // Check if other wall connects to this wall's start
      const connectsAtOtherEnd = distance(wall.start, other.end) <= snapTolerance;
      const connectsAtOtherStart = distance(wall.start, other.start) <= snapTolerance;

      if (connectsAtOtherEnd || connectsAtOtherStart) {
        // Parallel check to avoid infinite miter
        const cross = Math.abs(dx * otherDy - dy * otherDx);
        if (cross > 0.1 * len * otherLen) {
          // Compute miter for left and right edges
          const otherP1 = connectsAtOtherEnd
            ? { x: other.end.x + otherNx, y: other.end.y + otherNy }
            : { x: other.start.x + otherNx, y: other.start.y + otherNy };
          const otherP2 = connectsAtOtherEnd
            ? { x: other.start.x + otherNx, y: other.start.y + otherNy }
            : { x: other.end.x + otherNx, y: other.end.y + otherNy };

          const otherP4 = connectsAtOtherEnd
            ? { x: other.end.x - otherNx, y: other.end.y - otherNy }
            : { x: other.start.x - otherNx, y: other.start.y - otherNy };
          const otherP3 = connectsAtOtherEnd
            ? { x: other.start.x - otherNx, y: other.start.y - otherNy }
            : { x: other.end.x - otherNx, y: other.end.y - otherNy };

          const int1 = lineIntersection(p1, p2, otherP1, otherP2) || lineIntersection(p1, p2, otherP4, otherP3);
          const int2 = lineIntersection(p4, p3, otherP4, otherP3) || lineIntersection(p4, p3, otherP1, otherP2);

          if (int1 && distance(int1, wall.start) < wall.thickness * 2.5) {
            p1 = int1;
          }
          if (int2 && distance(int2, wall.start) < wall.thickness * 2.5) {
            p4 = int2;
          }
        }
      }

      // Check if other wall connects to this wall's end
      const connectsAtEndOtherStart = distance(wall.end, other.start) <= snapTolerance;
      const connectsAtEndOtherEnd = distance(wall.end, other.end) <= snapTolerance;

      if (connectsAtEndOtherStart || connectsAtEndOtherEnd) {
        const cross = Math.abs(dx * otherDy - dy * otherDx);
        if (cross > 0.1 * len * otherLen) {
          const otherP1 = connectsAtEndOtherStart
            ? { x: other.start.x + otherNx, y: other.start.y + otherNy }
            : { x: other.end.x + otherNx, y: other.end.y + otherNy };
          const otherP2 = connectsAtEndOtherStart
            ? { x: other.end.x + otherNx, y: other.end.y + otherNy }
            : { x: other.start.x + otherNx, y: other.start.y + otherNy };

          const otherP4 = connectsAtEndOtherStart
            ? { x: other.start.x - otherNx, y: other.start.y - otherNy }
            : { x: other.end.x - otherNx, y: other.end.y - otherNy };
          const otherP3 = connectsAtEndOtherStart
            ? { x: other.end.x - otherNx, y: other.end.y - otherNy }
            : { x: other.start.x - otherNx, y: other.start.y - otherNy };

          const int1 = lineIntersection(p1, p2, otherP1, otherP2) || lineIntersection(p1, p2, otherP4, otherP3);
          const int2 = lineIntersection(p4, p3, otherP4, otherP3) || lineIntersection(p4, p3, otherP1, otherP2);

          if (int1 && distance(int1, wall.end) < wall.thickness * 2.5) {
            p2 = int1;
          }
          if (int2 && distance(int2, wall.end) < wall.thickness * 2.5) {
            p3 = int2;
          }
        }
      }
    }

    return {
      wallId: wall.id,
      points: [p1, p2, p3, p4],
      centerline: { start: wall.start, end: wall.end },
      thickness: wall.thickness,
    };
  });
}

/**
 * Calculate polygon area in Square Feet using Shoelace Formula
 */
export function calculatePolygonAreaSqFt(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  const areaSqInches = Math.abs(sum) / 2;
  return Math.round((areaSqInches / 144) * 10) / 10;
}

/**
 * Find closest wall to a given point and projected distance
 */
export function findClosestWall(
  point: Point,
  walls: WallSegment[],
  maxDistance = 24
): { wall: WallSegment; projectedPoint: Point; distanceFromStart: number; normalAngle: number } | null {
  let closest: { wall: WallSegment; projectedPoint: Point; distanceFromStart: number; normalAngle: number } | null = null;
  let minD = maxDistance;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-4) continue;

    // Projection parameter t
    const t = Math.max(0, Math.min(1, ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lenSq));
    const projectedPoint = {
      x: wall.start.x + t * dx,
      y: wall.start.y + t * dy,
    };

    const d = distance(point, projectedPoint);
    if (d < minD) {
      minD = d;
      const distanceFromStart = t * Math.sqrt(lenSq);
      const angle = angleDegrees(wall.start, wall.end);
      closest = {
        wall,
        projectedPoint,
        distanceFromStart,
        normalAngle: angle,
      };
    }
  }

  return closest;
}
