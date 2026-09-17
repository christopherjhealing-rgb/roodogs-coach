import { describe, expect, it } from "vitest";
import { distanceToPath, resizePath } from "./boardGeometry";

const near = (a: { x: number; y: number }, x: number, y: number) => {
  expect(a.x).toBeCloseTo(x, 6);
  expect(a.y).toBeCloseTo(y, 6);
};

describe("resizePath", () => {
  const straight = [
    { x: 10, y: 10 },
    { x: 10, y: 30 },
  ];

  it("moves the dragged end of a straight arrow and leaves the other alone", () => {
    const out = resizePath(straight, "end", { x: 40, y: 60 });
    near(out[0], 10, 10);
    near(out[1], 40, 60);
  });

  it("can drag the start end instead", () => {
    const out = resizePath(straight, "start", { x: 0, y: 0 });
    near(out[0], 0, 0);
    near(out[1], 10, 30);
  });

  it("never mutates the input", () => {
    const input = straight.map((p) => ({ ...p }));
    resizePath(input, "end", { x: 99, y: 99 });
    near(input[1], 10, 30);
  });

  // A curve has points in between, so the whole shape has to come along.
  const curve = [
    { x: 0, y: 0 },
    { x: 5, y: 10 },
    { x: 0, y: 20 },
  ];

  it("carries a curve's dragged end exactly onto the new point", () => {
    const out = resizePath(curve, "end", { x: 0, y: 40 });
    near(out[2], 0, 40);
    near(out[0], 0, 0); // anchor held
  });

  it("scales a curve's bow in proportion when it is lengthened", () => {
    // doubling the length should double how far the middle bows out
    const out = resizePath(curve, "end", { x: 0, y: 40 });
    near(out[1], 10, 20);
  });

  it("rotates a curve about its anchor", () => {
    // swing the end from straight down to straight right (90° clockwise)
    const out = resizePath(curve, "end", { x: 20, y: 0 });
    near(out[2], 20, 0);
    near(out[1], 10, -5);
  });

  it("holds the far end still when the start is dragged", () => {
    const out = resizePath(curve, "start", { x: 0, y: 40 });
    near(out[0], 0, 40);
    near(out[2], 0, 20);
  });

  it("leaves a collapsed arrow alone rather than dividing by zero", () => {
    const flat = [
      { x: 7, y: 7 },
      { x: 7, y: 7 },
      { x: 7, y: 7 },
    ];
    const out = resizePath(flat, "end", { x: 20, y: 20 });
    expect(out.every((p) => p.x === 7 && p.y === 7)).toBe(true);
  });

  it("ignores a path too short to have two ends", () => {
    expect(resizePath([{ x: 1, y: 2 }], "end", { x: 9, y: 9 })).toEqual([
      { x: 1, y: 2 },
    ]);
  });
});

describe("distanceToPath", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  it("is zero on the line", () => {
    expect(distanceToPath(line, { x: 5, y: 0 })).toBeCloseTo(0);
  });

  it("measures square off the line", () => {
    expect(distanceToPath(line, { x: 5, y: 3 })).toBeCloseTo(3);
  });

  it("clamps to the ends rather than the infinite line", () => {
    expect(distanceToPath(line, { x: 14, y: 3 })).toBeCloseTo(5);
  });

  it("takes the nearest segment of a polyline", () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(distanceToPath(poly, { x: 12, y: 5 })).toBeCloseTo(2);
  });

  it("copes with degenerate input", () => {
    expect(distanceToPath([], { x: 0, y: 0 })).toBe(Infinity);
    expect(distanceToPath([{ x: 3, y: 4 }], { x: 0, y: 0 })).toBeCloseTo(5);
  });
});
