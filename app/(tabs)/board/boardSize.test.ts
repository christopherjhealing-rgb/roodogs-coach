import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRID_STEP_M,
  DEFAULT_WIDTH_M,
  GRID_STEPS_M,
  PITCH_H,
  PITCH_W,
  boardLengthM,
  boardWidthM,
  iconScaleOf,
  pitchHeight,
} from "./BoardCanvas";

describe("board size", () => {
  it("defaults reproduce the original fixed board", () => {
    expect(boardWidthM({})).toBe(DEFAULT_WIDTH_M);
    expect(boardLengthM({})).toBe(56); // 40 m × 1.4
    expect(pitchHeight({})).toBe(PITCH_H);
  });

  it("keeps the old shape for boards that only carry a width", () => {
    expect(pitchHeight({ widthM: 25 })).toBe(PITCH_H);
    expect(boardLengthM({ widthM: 25 })).toBe(35);
  });

  it("makes metres square in both directions", () => {
    // 20 m wide × 20 m long must draw as a square
    expect(pitchHeight({ widthM: 20, lengthM: 20 })).toBe(PITCH_W);
    // half as long as it is wide → half as tall
    expect(pitchHeight({ widthM: 20, lengthM: 10 })).toBe(PITCH_W / 2);
  });

  it("scales height with length, not width", () => {
    // a 3 m × 20 m channel is nearly seven times taller than wide
    expect(pitchHeight({ widthM: 3, lengthM: 20 })).toBe(666.7);
  });

  it("clamps absurd shapes to something drawable", () => {
    expect(pitchHeight({ widthM: 500, lengthM: 5 })).toBe(20); // floor
    expect(pitchHeight({ widthM: 1, lengthM: 300 })).toBe(2000); // ceiling
  });

  it("ignores junk values", () => {
    expect(boardWidthM({ widthM: 0 })).toBe(DEFAULT_WIDTH_M);
    expect(boardLengthM({ widthM: 40, lengthM: -5 })).toBe(56);
  });
});

describe("iconScaleOf", () => {
  it("defaults to 1", () => {
    expect(iconScaleOf({})).toBe(1);
    expect(iconScaleOf({ iconScale: 0 })).toBe(1);
  });

  it("passes sane values through", () => {
    expect(iconScaleOf({ iconScale: 0.55 })).toBe(0.55);
    expect(iconScaleOf({ iconScale: 1.3 })).toBe(1.3);
  });

  it("clamps to a usable range", () => {
    expect(iconScaleOf({ iconScale: 0.01 })).toBe(0.3);
    expect(iconScaleOf({ iconScale: 99 })).toBe(2);
  });
});

describe("grid steps", () => {
  it("are a nested ladder — each a whole multiple of the one below", () => {
    for (let i = 1; i < GRID_STEPS_M.length; i++) {
      const ratio = GRID_STEPS_M[i] / GRID_STEPS_M[i - 1];
      expect(
        Number.isInteger(ratio),
        `${GRID_STEPS_M[i]}m is not a whole multiple of ${GRID_STEPS_M[i - 1]}m`
      ).toBe(true);
    }
  });

  it("keeps a cone snapped on any step sitting on every finer step", () => {
    // this is the property the ladder exists for: change the grid and what
    // is already down stays on an intersection
    for (let coarse = 0; coarse < GRID_STEPS_M.length; coarse++) {
      const step = GRID_STEPS_M[coarse];
      for (const n of [0, 1, 2, 7, 13]) {
        const placed = n * step;
        for (let fine = 0; fine <= coarse; fine++) {
          expect(placed % GRID_STEPS_M[fine]).toBeCloseTo(0, 9);
        }
      }
    }
  });

  it("offers ascending steps, fine enough to land every library width", () => {
    // 0.5 m divides 2.5 m and lands the odd channels (2 m, 3 m) exactly
    expect(GRID_STEPS_M[0]).toBe(0.5);
    expect(GRID_STEPS_M).toContain(2.5);
    for (const width of [2, 3, 4, 6, 15, 20]) {
      expect((width / GRID_STEPS_M[0]) % 1).toBe(0);
    }
    expect([...GRID_STEPS_M].sort((a, b) => a - b)).toEqual(GRID_STEPS_M);
  });

  it("starts on a step it actually offers", () => {
    expect(GRID_STEPS_M).toContain(DEFAULT_GRID_STEP_M);
  });
});
