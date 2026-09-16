import { describe, expect, it } from "vitest";
import { conesPerGrid, gridPlan, playersPerGrid } from "./gridPlan";

describe("playersPerGrid", () => {
  it("reads plain counts and 'groups of N'", () => {
    expect(playersPerGrid("5")).toBe(5);
    expect(playersPerGrid("Groups of 3")).toBe(3);
    expect(playersPerGrid("3 per group")).toBe(3);
  });

  it("fills a grid to the top of a range", () => {
    expect(playersPerGrid("5-6")).toBe(6);
    expect(playersPerGrid("6-8 per circle")).toBe(8);
    expect(playersPerGrid("Up to 10")).toBe(10);
    expect(playersPerGrid("3+")).toBe(3);
  });

  it("counts both sides of an NvN", () => {
    expect(playersPerGrid("5v5")).toBe(10);
    expect(playersPerGrid("4 (2 v 2)")).toBe(4);
    expect(playersPerGrid("3v3 to 5v4")).toBe(9);
    expect(playersPerGrid("2v2 or 4 pairs")).toBe(4);
  });

  it("doubles 'a side'", () => {
    expect(playersPerGrid("4-6 a side")).toBe(12);
  });

  it("adds up additive line-ups", () => {
    expect(playersPerGrid("3 + 1")).toBe(4);
    expect(playersPerGrid("6 + 2 + 2")).toBe(10);
    expect(playersPerGrid("2 attackers + 2 defenders per rep")).toBe(4);
  });

  it("handles pairs and trios", () => {
    expect(playersPerGrid("Pairs")).toBe(2);
    expect(playersPerGrid("Matched pairs")).toBe(2);
    expect(playersPerGrid("Pairs/trios")).toBe(3);
  });

  it("refuses to split whole-squad activities", () => {
    for (const s of ["Any", "Any game", "Any (scale)", "Whole group", "Two teams", "2 teams", "Two columns"])
      expect(playersPerGrid(s)).toBeNull();
    expect(playersPerGrid(undefined)).toBeNull();
  });
});

describe("conesPerGrid", () => {
  it("counts box corners, markers and gates", () => {
    expect(conesPerGrid("box;A .5 .5")).toBe(4);
    expect(conesPerGrid("K .1 .1;K .9 .9")).toBe(2);
    expect(conesPerGrid("g .5 .5 .2;gv .2 .5 .3")).toBe(4);
    expect(conesPerGrid("box;K .5 .5;g .5 .9 .2")).toBe(7);
    expect(conesPerGrid(undefined)).toBe(0);
  });
});

describe("gridPlan", () => {
  const drill = { players: "4 (2 v 2)", diagramSpec: "K .1 .1;K .9 .1;K .1 .9;K .9 .9" };

  it("splits the squad across grids and totals the cones", () => {
    const p = gridPlan(drill, 12);
    expect(p.perGrid).toBe(4);
    expect(p.grids).toBe(3); // 12 kids / 4 per grid
    expect(p.conesEach).toBe(4);
    expect(p.conesTotal).toBe(12);
    expect(p.spare).toBe(0);
    expect(p.canMultiply).toBe(true);
  });

  it("rounds up so nobody is left out, and reports the spare spaces", () => {
    const p = gridPlan(drill, 10);
    expect(p.grids).toBe(3); // 10 kids needs 3 grids of 4
    expect(p.spare).toBe(0); // grids hold 12 >= 10, so no one waits
  });

  it("honours a manual override", () => {
    expect(gridPlan(drill, 12, 1).grids).toBe(1);
    expect(gridPlan(drill, 12, 5).conesTotal).toBe(20);
  });

  it("never multiplies a whole-squad game", () => {
    const p = gridPlan({ players: "Whole group", diagramSpec: "box" }, 12);
    expect(p.canMultiply).toBe(false);
    expect(p.grids).toBe(1);
  });
});
