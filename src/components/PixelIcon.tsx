// Hand-authored pixel-art icon set: every icon lives on the same 14x14 grid,
// built from horizontal cell-runs (so shapes stay easy to read/adjust), and
// rendered as flat-filled <rect> cells with crisp edges. One shared style —
// same grid resolution, same flat-fill treatment, same level of detail —
// so the whole set reads as one consistent visual language, not a mix of
// borrowed icon packs.

const GRID = 14;

type Cell = [x: number, y: number];

/** A filled horizontal run on row `y` from `x0` to `x1` inclusive. */
function row(y: number, x0: number, x1: number): Cell[] {
  const cells: Cell[] = [];
  for (let x = x0; x <= x1; x++) cells.push([x, y]);
  return cells;
}

const ICONS: Record<string, Cell[]> = {
  mic: [
    ...row(0, 5, 8),
    ...row(1, 5, 8),
    ...row(2, 5, 8),
    ...row(3, 5, 8),
    ...row(4, 5, 8),
    ...row(5, 5, 8),
    ...row(6, 5, 8),
    ...row(7, 4, 4),
    ...row(7, 9, 9),
    ...row(8, 4, 4),
    ...row(8, 9, 9),
    ...row(9, 5, 5),
    ...row(9, 8, 8),
    ...row(10, 5, 5),
    ...row(10, 8, 8),
    ...row(11, 5, 8),
    ...row(12, 4, 11),
    ...row(13, 4, 11),
  ],
  stop: [...row(4, 4, 9), ...row(5, 4, 9), ...row(6, 4, 9), ...row(7, 4, 9), ...row(8, 4, 9), ...row(9, 4, 9)],
  hourglass: [
    ...row(0, 2, 11),
    ...row(1, 2, 2),
    ...row(1, 11, 11),
    ...row(2, 3, 3),
    ...row(2, 10, 10),
    ...row(3, 4, 4),
    ...row(3, 9, 9),
    ...row(4, 5, 5),
    ...row(4, 8, 8),
    ...row(5, 6, 7),
    ...row(6, 6, 7),
    ...row(7, 5, 5),
    ...row(7, 8, 8),
    ...row(8, 4, 4),
    ...row(8, 9, 9),
    ...row(9, 3, 3),
    ...row(9, 10, 10),
    ...row(10, 2, 2),
    ...row(10, 11, 11),
    ...row(11, 2, 11),
  ],
  play: [
    ...row(3, 4, 8),
    ...row(4, 4, 9),
    ...row(5, 4, 10),
    ...row(6, 4, 11),
    ...row(7, 4, 12),
    ...row(8, 4, 11),
    ...row(9, 4, 10),
    ...row(10, 4, 9),
    ...row(11, 4, 8),
  ],
  download: [
    ...row(0, 6, 7),
    ...row(1, 6, 7),
    ...row(2, 6, 7),
    ...row(3, 6, 7),
    ...row(4, 6, 7),
    ...row(5, 3, 10),
    ...row(6, 4, 9),
    ...row(7, 5, 8),
    ...row(8, 6, 7),
    ...row(11, 3, 10),
    ...row(12, 3, 10),
  ],
  reset: [
    ...row(1, 9, 10),
    ...row(2, 6, 8),
    ...row(2, 11, 11),
    ...row(3, 4, 5),
    ...row(3, 9, 10),
    ...row(4, 3, 3),
    ...row(4, 11, 11),
    ...row(5, 2, 2),
    ...row(5, 12, 12),
    ...row(6, 2, 2),
    ...row(6, 12, 12),
    ...row(7, 2, 2),
    ...row(7, 12, 12),
    ...row(8, 2, 2),
    ...row(8, 12, 12),
    ...row(9, 2, 2),
    ...row(9, 12, 12),
    ...row(10, 3, 3),
    ...row(10, 11, 11),
    ...row(11, 4, 5),
    ...row(11, 9, 10),
    ...row(12, 6, 8),
  ],
  unmute: [
    ...row(5, 2, 4),
    ...row(6, 2, 6),
    ...row(7, 2, 8),
    ...row(8, 2, 6),
    ...row(9, 2, 4),
    ...row(4, 9, 9),
    ...row(5, 10, 10),
    ...row(7, 11, 11),
    ...row(9, 10, 10),
    ...row(10, 9, 9),
  ],
  mute: [
    ...row(5, 2, 4),
    ...row(6, 2, 6),
    ...row(7, 2, 8),
    ...row(8, 2, 6),
    ...row(9, 2, 4),
    ...row(4, 9, 9),
    ...row(4, 13, 13),
    ...row(5, 10, 10),
    ...row(5, 12, 12),
    ...row(6, 11, 11),
    ...row(7, 11, 11),
    ...row(8, 11, 11),
    ...row(9, 10, 10),
    ...row(9, 12, 12),
    ...row(10, 9, 9),
    ...row(10, 13, 13),
  ],
  cat: [
    ...row(1, 4, 4),
    ...row(1, 9, 9),
    ...row(2, 3, 5),
    ...row(2, 8, 10),
    ...row(3, 2, 11),
    ...row(4, 2, 11),
    ...row(5, 2, 11),
    ...row(6, 2, 11),
    ...row(7, 2, 11),
    ...row(8, 2, 11),
    ...row(9, 2, 11),
    ...row(10, 3, 10),
    ...row(11, 4, 9),
  ],
  dog: [
    ...row(1, 5, 8),
    ...row(2, 4, 9),
    ...row(3, 0, 1),
    ...row(3, 3, 10),
    ...row(3, 12, 13),
    ...row(4, 0, 1),
    ...row(4, 3, 10),
    ...row(4, 12, 13),
    ...row(5, 0, 1),
    ...row(5, 3, 10),
    ...row(5, 12, 13),
    ...row(6, 3, 10),
    ...row(7, 3, 10),
    ...row(8, 3, 10),
    ...row(9, 3, 10),
    ...row(10, 4, 9),
    ...row(11, 5, 8),
  ],
  cow: [
    ...row(2, 3, 3),
    ...row(2, 10, 10),
    ...row(3, 3, 4),
    ...row(3, 9, 10),
    ...row(4, 1, 2),
    ...row(4, 3, 10),
    ...row(4, 11, 12),
    ...row(5, 3, 10),
    ...row(6, 3, 10),
    ...row(7, 3, 10),
    ...row(8, 3, 10),
    ...row(9, 3, 10),
    ...row(10, 4, 9),
    ...row(11, 3, 10),
  ],
  goat: [
    ...row(1, 3, 3),
    ...row(1, 10, 10),
    ...row(2, 3, 4),
    ...row(2, 9, 10),
    ...row(3, 4, 4),
    ...row(3, 9, 9),
    ...row(4, 3, 10),
    ...row(5, 3, 10),
    ...row(6, 3, 10),
    ...row(7, 3, 10),
    ...row(8, 3, 10),
    ...row(9, 3, 10),
    ...row(10, 4, 9),
    ...row(11, 5, 8),
    ...row(12, 6, 7),
    ...row(13, 6, 7),
  ],
  "face-happy": [
    ...row(2, 6, 8),
    ...row(3, 4, 5),
    ...row(3, 9, 10),
    ...row(4, 3, 3),
    ...row(4, 11, 11),
    ...row(5, 2, 2),
    ...row(5, 12, 12),
    ...row(6, 4, 5),
    ...row(6, 9, 10),
    ...row(7, 2, 2),
    ...row(7, 12, 12),
    ...row(8, 2, 2),
    ...row(8, 12, 12),
    ...row(9, 5, 5),
    ...row(9, 9, 9),
    ...row(10, 6, 8),
    ...row(11, 4, 5),
    ...row(11, 9, 10),
    ...row(12, 6, 8),
  ],
  "face-angry": [
    ...row(2, 6, 8),
    ...row(3, 4, 5),
    ...row(3, 9, 10),
    ...row(4, 3, 3),
    ...row(4, 4, 5),
    ...row(4, 9, 10),
    ...row(4, 11, 11),
    ...row(5, 2, 2),
    ...row(5, 5, 5),
    ...row(5, 9, 9),
    ...row(5, 12, 12),
    ...row(7, 2, 2),
    ...row(7, 12, 12),
    ...row(8, 2, 2),
    ...row(8, 12, 12),
    ...row(9, 5, 9),
    ...row(10, 3, 3),
    ...row(10, 11, 11),
    ...row(11, 4, 5),
    ...row(11, 9, 10),
    ...row(12, 6, 8),
  ],
  "face-sad": [
    ...row(2, 6, 8),
    ...row(3, 4, 5),
    ...row(3, 9, 10),
    ...row(4, 3, 3),
    ...row(4, 11, 11),
    ...row(5, 2, 2),
    ...row(5, 12, 12),
    ...row(6, 4, 5),
    ...row(6, 9, 10),
    ...row(7, 2, 2),
    ...row(7, 12, 12),
    ...row(8, 2, 2),
    ...row(8, 12, 12),
    ...row(9, 6, 8),
    ...row(10, 5, 5),
    ...row(10, 9, 9),
    ...row(10, 3, 3),
    ...row(10, 11, 11),
    ...row(11, 4, 5),
    ...row(11, 9, 10),
    ...row(12, 6, 8),
  ],
};

export type PixelIconName = keyof typeof ICONS;

interface PixelIconProps {
  name: PixelIconName;
  size?: number;
  className?: string;
}

/** One consistent pixel-grid icon language, used everywhere an emoji used
 * to be. `fill="currentColor"` — recolor by setting text color on a parent. */
export function PixelIcon({ name, size = 20, className = "" }: PixelIconProps) {
  const cells = ICONS[name] ?? [];
  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={size}
      height={size}
      className={className}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden="true"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
