import { describe, expect, it } from "vitest";
import { chunkCase, chunkStatute } from "@/lib/rag/chunking";
import type { CaseSeed, StatuteSeed } from "@/lib/rag/types";

describe("chunkStatute", () => {
  it("emits one chunk per section with metadata", () => {
    const seed: StatuteSeed = {
      kind: "statute",
      statute_name: "Indian Contract Act, 1872",
      year: 1872,
      sections: [
        {
          number: "73",
          heading: "Compensation for breach",
          body: "When a contract has been broken, the party who suffers by such breach is entitled to receive compensation for any loss or damage caused.",
        },
        {
          number: "74",
          heading: "Liquidated damages",
          body: "When a contract has been broken, if a sum is named in the contract as the amount to be paid in case of such breach, the party complaining is entitled to reasonable compensation.",
        },
      ],
    };

    const chunks = chunkStatute(seed);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const sec73 = chunks.find((c) => c.metadata.section === "73");
    const sec74 = chunks.find((c) => c.metadata.section === "74");
    expect(sec73).toBeDefined();
    expect(sec74).toBeDefined();
    expect(sec73?.metadata.statute_name).toBe("Indian Contract Act, 1872");
    expect(sec73?.metadata.jurisdiction).toBe("India");
    expect(sec73?.metadata.source).toBe("statute");
    expect(sec73?.text).toContain("Section 73 — Compensation for breach");
  });

  it("assigns sequential ords starting at 0", () => {
    const seed: StatuteSeed = {
      kind: "statute",
      statute_name: "Test Act",
      year: 2024,
      sections: [
        { number: "1", heading: "First", body: "Body of section one." },
        { number: "2", heading: "Second", body: "Body of section two." },
      ],
    };
    const chunks = chunkStatute(seed);
    const ords = chunks.map((c) => c.ord);
    expect(ords[0]).toBe(0);
    expect(new Set(ords).size).toBe(ords.length);
  });
});

describe("chunkCase", () => {
  it("emits headnote + part chunks with case metadata", () => {
    const seed: CaseSeed = {
      kind: "case",
      case_name: "Energy Watchdog v. CERC",
      citation: "(2017) 14 SCC 80",
      court: "Supreme Court of India",
      year: 2017,
      headnote: "Force majeure — change in foreign law and rise in coal price.",
      parts: [
        { label: "facts", text: "PPAs entered between Adani and gencos." },
        { label: "holding", text: "Held: change in foreign law is not force majeure under the PPA." },
      ],
    };

    const chunks = chunkCase(seed);
    expect(chunks.length).toBe(3);
    expect(chunks[0].text).toContain("headnote");
    expect(chunks[1].text).toContain("facts");
    expect(chunks[2].text).toContain("holding");
    for (const c of chunks) {
      expect(c.metadata.source).toBe("case");
      expect(c.metadata.case_name).toBe("Energy Watchdog v. CERC");
      expect(c.metadata.citation).toBe("(2017) 14 SCC 80");
      expect(c.metadata.jurisdiction).toBe("India");
    }
  });

  it("splits long parts on paragraph boundaries", () => {
    const longPara = "First sentence of paragraph. ".repeat(80);
    const seed: CaseSeed = {
      kind: "case",
      case_name: "Test v. Test",
      citation: "AIR 2024 SC 1",
      court: "Supreme Court of India",
      year: 2024,
      parts: [
        { label: "reasoning", text: `${longPara}\n\n${longPara}\n\n${longPara}` },
      ],
    };
    const chunks = chunkCase(seed);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2200);
    }
  });
});
