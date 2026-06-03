import { describe, it, expect } from "vitest";
import { groupByKey, normalizeForKey } from "./dedupe";

describe("normalizeForKey", () => {
  it("collapses whitespace and lowercases so verbatim duplicates collide", () => {
    expect(normalizeForKey("  The   Parties\nAGREE.  ")).toBe("the parties agree.");
    expect(normalizeForKey("the parties agree.")).toBe(
      normalizeForKey("The  Parties   AGREE."),
    );
  });

  it("keeps substantively different text distinct", () => {
    expect(normalizeForKey("Clause A text")).not.toBe(normalizeForKey("Clause B text"));
  });
});

describe("groupByKey", () => {
  it("groups by key, preserving first-seen order of groups and members", () => {
    const items = [
      { id: "1", k: "a" },
      { id: "2", k: "b" },
      { id: "3", k: "a" },
      { id: "4", k: "c" },
      { id: "5", k: "b" },
    ];
    const groups = groupByKey(items, (i) => i.k);
    expect(groups.map((g) => g.map((m) => m.id))).toEqual([
      ["1", "3"], // a
      ["2", "5"], // b
      ["4"], // c
    ]);
  });

  it("returns [] for no items", () => {
    expect(groupByKey([], () => "x")).toEqual([]);
  });
});
