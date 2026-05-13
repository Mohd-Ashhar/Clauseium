import { analyzeByLlm } from "../src/lib/risk/llm-analyzer";

const SAMPLES = [
  // Real clause (worked above)
  ["c1-real", "termination",
    "26 SUCCESSORS: This Agreement binds the executors, administrators, successors and permitted assigns of the parties hereto."],
  // Placeholder-heavy title preamble (suspicious)
  ["c2-placeholders", "other",
    "Master Service Agreement This Agreement is made at this ……… day of ___________ ,202__ at New Delhi."],
  // Real assignment clause
  ["c3-real", "other",
    "18 ASSIGNMENT: The Service Provider shall not assign its obligations to perform under this Agreement without the prior written consent of the Service Recipient."],
  // Real conditions precedent
  ["c4-real", "other",
    "5 Conditions precedent: This Agreement is conditional upon the Service Provider having fulfilled all the conditions specified in Annexure I."],
  // Real misc clause
  ["c5-real", "governing_law",
    "16 Miscellaneous. a. This Agreement and the rights and obligations of the parties hereto will be governed by and construed in accordance with the laws of the State of"],
];

async function main() {
  for (const [id, category, text] of SAMPLES) {
    const start = Date.now();
    try {
      const result = await analyzeByLlm({
        clauseId: id, category: category as never,
        clauseText: text, ruleFindings: [], ragContext: [],
      });
      const took = Date.now() - start;
      console.log(`\n=== ${id} (${took}ms) ===`);
      console.log(`failedToParse: ${result.failedToParse ?? false}`);
      console.log(`risk_level: ${result.response.risk_level}`);
      console.log(`issue: ${result.response.issue}`);
      console.log(`confidence: ${result.response.confidence}`);
    } catch (err) {
      console.log(`\n=== ${id} THREW ===`);
      console.log(err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
