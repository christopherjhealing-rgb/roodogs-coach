import { describe, expect, it } from "vitest";
import { monthGrid, toDateKey, parseDateKey, addMonths } from "./dates";

describe("monthGrid", () => {
  it("starts on Monday and pads to full weeks", () => {
    // September 2026 starts on a Tuesday.
    const cells = monthGrid(2026, 8);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBe("2026-09-01");
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean).length).toBe(30);
  });
});

describe("date keys", () => {
  it("round-trips", () => {
    expect(toDateKey(parseDateKey("2026-02-09"))).toBe("2026-02-09");
  });
  it("adds months across year boundaries", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});
