import { describe, expect, it } from "vitest";
import { duplicatePlan, formatDuration, moveItem, newPlan, planSeconds } from "./plan";

describe("planSeconds", () => {
  it("sums every item across sections", () => {
    const p = newPlan("u1");
    p.sections[0].items.push({ id: "a", movementId: "m", durationSec: 60 });
    p.sections[1].items.push({ id: "b", movementId: "m", durationSec: 90 });
    p.sections[2].items.push({ id: "c", movementId: "m", durationSec: 30 });
    expect(planSeconds(p)).toBe(180);
  });
  it("is zero for an empty plan", () => {
    expect(planSeconds(newPlan("u1"))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats seconds, minutes and hours", () => {
    expect(formatDuration(30)).toBe("30 sec");
    expect(formatDuration(45 * 60)).toBe("45 min");
    expect(formatDuration(60 * 60)).toBe("1 hr");
    expect(formatDuration(65 * 60)).toBe("1 hr 05");
  });
});

describe("moveItem", () => {
  it("moves within bounds and ignores out-of-range moves", () => {
    const p = newPlan("u1");
    const s = p.sections[0];
    s.items.push(
      { id: "a", movementId: "m", durationSec: 1 },
      { id: "b", movementId: "m", durationSec: 1 },
    );
    const moved = moveItem(p, s.id, "b", -1);
    expect(moved.sections[0].items.map((i) => i.id)).toEqual(["b", "a"]);
    const same = moveItem(moved, s.id, "b", -1);
    expect(same.sections[0].items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(p.sections[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("duplicatePlan", () => {
  it("gives every section and item a fresh id", () => {
    const p = newPlan("u1", { name: "Monday mat" });
    p.sections[0].items.push({ id: "a", movementId: "m", durationSec: 1 });
    const d = duplicatePlan(p, "u2");
    expect(d.id).not.toBe(p.id);
    expect(d.ownerId).toBe("u2");
    expect(d.name).toBe("Monday mat (copy)");
    expect(d.sections[0].id).not.toBe(p.sections[0].id);
    expect(d.sections[0].items[0].id).not.toBe("a");
    expect(d.sections[0].items[0].movementId).toBe("m");
  });
});
