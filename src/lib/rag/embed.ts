import "server-only";
import OpenAI from "openai";
import pRetry from "p-retry";
import { z } from "zod";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;
const BATCH_SIZE = 96;

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  cached = new OpenAI({ apiKey });
  return cached;
}

const responseSchema = z.object({
  data: z
    .array(
      z.object({
        index: z.number().int(),
        embedding: z.array(z.number()),
      }),
    )
    .min(1),
});

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const out: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const result = await pRetry(
      async () => {
        const resp = await client.embeddings.create({
          model: EMBED_MODEL,
          input: slice,
        });
        const parsed = responseSchema.parse(resp);
        if (parsed.data.length !== slice.length) {
          throw new Error(
            `Embedding count mismatch: expected ${slice.length}, got ${parsed.data.length}`,
          );
        }
        for (const item of parsed.data) {
          if (item.embedding.length !== EMBED_DIM) {
            throw new Error(
              `Embedding dim mismatch: expected ${EMBED_DIM}, got ${item.embedding.length}`,
            );
          }
        }
        return parsed.data;
      },
      { retries: 3, factor: 2, minTimeout: 500, maxTimeout: 4000 },
    );

    for (const item of result) out[i + item.index] = item.embedding;
  }

  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}

export const EMBEDDING_DIMENSIONS = EMBED_DIM;
