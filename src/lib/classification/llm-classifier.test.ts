import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
    constructor(_cfg: { apiKey: string }) {}
  },
}));
vi.mock("server-only", () => ({}));

import { classifyByLlm, _resetForTests, isLlmAvailable } from "./llm-classifier";
import { classifyByRules } from "./rule-classifier";

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  _resetForTests();
  createMock.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
});

describe("classifyByLlm", () => {
  it("parses a clean JSON response", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"category":"indemnification","confidence":0.9,"reasoning":"hold harmless"}',
        },
      ],
    });

    const ctx = classifyByRules("placeholder text");
    const out = await classifyByLlm("Indemnification clause text…", ctx);
    expect(out.response.category).toBe("indemnification");
    expect(out.response.confidence).toBe(0.9);
    expect(out.model).toMatch(/haiku/i);
  });

  it("strips ```json fences and still parses", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '```json\n{"category":"termination","confidence":0.8}\n```',
        },
      ],
    });

    const ctx = classifyByRules("text");
    const out = await classifyByLlm("foo", ctx);
    expect(out.response.category).toBe("termination");
  });

  it("falls back to category=other on invalid JSON", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json at all" }],
    });

    const ctx = classifyByRules("text");
    const out = await classifyByLlm("foo", ctx);
    expect(out.response.category).toBe("other");
    expect(out.response.confidence).toBeLessThanOrEqual(0.3);
  });

  it("falls back to category=other on schema-violating JSON", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: '{"category":"not_a_real_category","confidence":0.9}' },
      ],
    });

    const ctx = classifyByRules("text");
    const out = await classifyByLlm("foo", ctx);
    expect(out.response.category).toBe("other");
  });

  it("sends system prompt with cache_control = ephemeral", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"category":"other","confidence":0.5}' }],
    });
    const ctx = classifyByRules("text");
    await classifyByLlm("foo", ctx);

    const call = createMock.mock.calls[0]?.[0];
    expect(call.system?.[0]?.cache_control?.type).toBe("ephemeral");
    expect(call.model).toMatch(/haiku-4-5/);
    expect(call.temperature).toBe(0);
  });

  it("isLlmAvailable reflects ANTHROPIC_API_KEY presence", () => {
    expect(isLlmAvailable()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
    expect(isLlmAvailable()).toBe(false);
  });
});
