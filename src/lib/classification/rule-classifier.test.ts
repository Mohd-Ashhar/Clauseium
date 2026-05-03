import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyByRules } from "./rule-classifier";
import { CLASSIFICATION_CATEGORIES, type ClassificationCategory } from "./categories";

interface Fixture {
  text: string;
  expectedCategory: ClassificationCategory;
  expectedMinConfidence: number;
}

function load(category: ClassificationCategory): Fixture[] {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `tests/fixtures/clauses/${category}.json`),
      "utf8",
    ),
  ) as Fixture[];
}

describe("classifyByRules — fixture-driven accuracy", () => {
  for (const cat of CLASSIFICATION_CATEGORIES) {
    it(`predicts ${cat} for known phrasings`, () => {
      const fixtures = load(cat);
      for (const fx of fixtures) {
        const result = classifyByRules(fx.text);
        expect(result.top, `no top for "${fx.text.slice(0, 60)}…"`).not.toBeNull();
        expect(result.top!.category).toBe(fx.expectedCategory);
        expect(result.top!.score).toBeGreaterThanOrEqual(fx.expectedMinConfidence);
      }
    });
  }
});

describe("classifyByRules — needsLlm logic", () => {
  it("flags needsLlm when no category matches", () => {
    const result = classifyByRules("This sentence has nothing legal to detect at all here.");
    expect(result.top).toBeNull();
    expect(result.needsLlm).toBe(true);
  });

  it("does NOT flag needsLlm for a strong unambiguous match", () => {
    const result = classifyByRules(
      "This Agreement shall be governed by and construed in accordance with the laws of India.",
    );
    expect(result.top?.category).toBe("governing_law");
    expect(result.needsLlm).toBe(false);
  });

  it("flags needsLlm when two categories are within tie margin", () => {
    const result = classifyByRules(
      "This Agreement shall be governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
    );
    // Both governing_law and jurisdiction should fire strong; tie → LLM.
    expect(result.allScores.length).toBeGreaterThanOrEqual(2);
    expect(result.needsLlm).toBe(true);
  });

  it("flags needsLlm when top score is below threshold", () => {
    // Only a medium-anchor 'survive_termination' alone (0.6) shouldn't pass 0.8.
    const result = classifyByRules(
      "This obligation shall survive the expiration of the Agreement.",
    );
    expect(result.top?.category).toBe("termination");
    expect(result.top!.score).toBeLessThan(0.8);
    expect(result.needsLlm).toBe(true);
  });
});
