import { attachSide, gatewayTipSide, isOrthogonalPath } from '../../src/lib/geometry';

// A 100×80 box at the origin-ish: left x=100, right x=200, top y=100, bottom y=180, centre (150,140).
const BOX = { x: 100, y: 100, width: 100, height: 80 };

// A 50×50 gateway box: tips at top(125,100) right(150,125) bottom(125,150) left(100,125).
const DIAMOND = { x: 100, y: 100, width: 50, height: 50 };

describe('attachSide', () => {
  it('names the edge a border point sits on', () => {
    expect(attachSide({ x: 100, y: 140 }, BOX)).toBe('left');
    expect(attachSide({ x: 200, y: 140 }, BOX)).toBe('right');
    expect(attachSide({ x: 150, y: 100 }, BOX)).toBe('top');
    expect(attachSide({ x: 150, y: 180 }, BOX)).toBe('bottom');
  });

  it('tolerates a few pixels of rounding', () => {
    expect(attachSide({ x: 102, y: 140 }, BOX)).toBe('left');
  });

  it('returns null for an ambiguous corner (two edges at once)', () => {
    expect(attachSide({ x: 100, y: 100 }, BOX)).toBeNull();
  });

  it('returns null for a point off the border', () => {
    expect(attachSide({ x: 150, y: 140 }, BOX)).toBeNull(); // the centre
    expect(attachSide({ x: 300, y: 140 }, BOX)).toBeNull(); // far outside
  });
});

describe('gatewayTipSide', () => {
  it('names the tip a point matches', () => {
    expect(gatewayTipSide({ x: 125, y: 100 }, DIAMOND)).toBe('top');
    expect(gatewayTipSide({ x: 150, y: 125 }, DIAMOND)).toBe('right');
    expect(gatewayTipSide({ x: 125, y: 150 }, DIAMOND)).toBe('bottom');
    expect(gatewayTipSide({ x: 100, y: 125 }, DIAMOND)).toBe('left');
  });

  it('returns null on a diagonal flank ("seitlich")', () => {
    // Midway between the left and top tips — on the diamond's edge, but not at a tip.
    expect(gatewayTipSide({ x: 113, y: 113 }, DIAMOND)).toBeNull();
  });
});

// Named unit moves on a grid, for readable polylines: right, down, left, upward.
const right = { x: 40, y: 0 };
const down = { x: 0, y: 40 };
const left = { x: -40, y: 0 };
const upward = { x: 0, y: -40 };

// Walk a start point through a sequence of moves into a waypoint list.
const path = (start: { x: number; y: number }, ...moves: { x: number; y: number }[]) =>
  moves.reduce(
    (points, move) => {
      const last = points[points.length - 1]!;
      return [...points, { x: last.x + move.x, y: last.y + move.y }];
    },
    [start],
  );

describe('isOrthogonalPath', () => {
  it('is true when every segment is horizontal or vertical', () => {
    expect(isOrthogonalPath(path({ x: 0, y: 0 }, right, down, left, upward))).toBe(true);
    expect(isOrthogonalPath([{ x: 0, y: 0 }])).toBe(true); // degenerate
  });

  it('tolerates a few pixels of drift on a long segment', () => {
    expect(
      isOrthogonalPath([
        { x: 0, y: 0 },
        { x: 200, y: 3 }, // ~1 degree off horizontal
      ]),
    ).toBe(true);
  });

  it('is false when a segment runs on a slant', () => {
    expect(
      isOrthogonalPath([
        { x: 0, y: 0 },
        { x: 100, y: 100 }, // 45 degrees
      ]),
    ).toBe(false);
    // a slanted middle segment among orthogonal ones
    expect(
      isOrthogonalPath([
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 80, y: 60 },
        { x: 160, y: 60 },
      ]),
    ).toBe(false);
  });
});
