import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDTH_M,
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
