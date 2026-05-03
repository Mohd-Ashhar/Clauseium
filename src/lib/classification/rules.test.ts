import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RULES, RULES_BY_CATEGORY } from "./rules";
import { CLASSIFICATION_CATEGORIES, type ClassificationCategory } from "./categories";

interface Fixture {
  text: string;
  expectedCategory: ClassificationCategory;
  expectedMinConfidence: number;
}

function loadFixtures(category: ClassificationCategory): Fixture[] {
  const path = resolve(
    process.cwd(),
    `tests/fixtures/clauses/${category}.json`,
  );
  return JSON.parse(readFileSync(path, "utf8")) as Fixture[];
}

describe("RULES registry", () => {
  it("covers every classification category", () => {
    for (const cat of CLASSIFICATION_CATEGORIES) {
      expect(RULES_BY_CATEGORY.get(cat)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("has unique rule ids", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only declared anchor weights", () => {
    for (const r of RULES) {
      expect(["strong", "medium", "weak"]).toContain(r.anchor);
    }
  });
});

describe("RULES patterns hit fixture clauses", () => {
  for (const cat of CLASSIFICATION_CATEGORIES) {
    it(`fixture clauses for ${cat} match at least one ${cat} rule`, () => {
      const fixtures = loadFixtures(cat);
      expect(fixtures.length).toBeGreaterThan(0);
      const rules = RULES_BY_CATEGORY.get(cat) ?? [];
      for (const fx of fixtures) {
        const matched = rules.some((r) => r.pattern.test(fx.text));
        if (!matched) {
          throw new Error(
            `No ${cat} rule matched fixture: "${fx.text.slice(0, 80)}…"`,
          );
        }
      }
    });
  }
});
