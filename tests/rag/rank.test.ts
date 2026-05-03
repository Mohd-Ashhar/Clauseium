import { describe, expect, it } from "vitest";
import { rrfFuse, type Ranked } from "@/lib/rag/rank";

describe("rrfFuse", () => {
  it("merges by reciprocal rank with k=60", () => {
    const semantic: Ranked<string>[] = [
      { id: "a", item: "a", rank: 1 },
      { id: "b", item: "b", rank: 2 },
    ];
    const lexical: Ranked<string>[] = [
      { id: "b", item: "b", rank: 1 },
      { id: "c", item: "c", rank: 2 },
    ];

    const fused = rrfFuse(semantic, lexical);
    const map = new Map(fused.map((r) => [r.id, r]));

    expect(map.get("a")?.fused).toBeCloseTo(1 / 61);
    expect(map.get("b")?.fused).toBeCloseTo(1 / 62 + 1 / 61);
    expect(map.get("c")?.fused).toBeCloseTo(1 / 62);

    expect(fused[0].id).toBe("b");
  });

  it("returns empty when both inputs empty", () => {
    expect(rrfFuse<string>([], [])).toEqual([]);
  });
});
