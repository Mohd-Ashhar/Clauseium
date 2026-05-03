import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LruCache } from "./lru-cache";

describe("LruCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("get/set roundtrips", () => {
    const c = new LruCache<number>();
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
    expect(c.get("missing")).toBeUndefined();
  });

  it("evicts oldest on overflow", () => {
    const c = new LruCache<number>({ maxSize: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });

  it("LRU promotion: get marks as recent", () => {
    const c = new LruCache<number>({ maxSize: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a is now most recent
    c.set("c", 3); // should evict b
    expect(c.get("a")).toBe(1);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("c")).toBe(3);
  });

  it("expires entries past TTL", () => {
    const c = new LruCache<number>({ ttlMs: 1000 });
    c.set("a", 1);
    vi.advanceTimersByTime(500);
    expect(c.get("a")).toBe(1);
    vi.advanceTimersByTime(600);
    expect(c.get("a")).toBeUndefined();
  });
});
