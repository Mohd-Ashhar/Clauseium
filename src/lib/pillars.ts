import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";

const PILLARS_ROOT = path.join(process.cwd(), "src", "content", "pillars");

const spokeItemSchema = z.object({
  title: z.string(),
  href: z.string(),
  description: z.string().optional(),
});

const spokeGroupSchema = z.object({
  section: z.string(),
  items: z.array(spokeItemSchema).min(1),
});

const howToStepSchema = z.object({
  name: z.string(),
  text: z.string(),
  url: z.string().optional(),
});

export const pillarFrontmatterSchema = z.object({
  title: z.string().min(10).max(140),
  description: z.string().min(50).max(260),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  targetKeywords: z.array(z.string()).min(1).max(20),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  hero: z.object({
    eyebrow: z.string(),
    h1: z.string(),
    subheadline: z.string(),
  }),
  faq: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
  howTo: z
    .object({
      name: z.string(),
      description: z.string(),
      totalTime: z.string().optional(),
      steps: z.array(howToStepSchema).min(2),
    })
    .optional(),
  spokes: z.array(spokeGroupSchema).default([]),
});

export type PillarFrontmatter = z.infer<typeof pillarFrontmatterSchema>;

export interface PillarItem {
  frontmatter: PillarFrontmatter;
  body: string;
  readingMinutes: number;
  filePath: string;
}

let cache: Map<string, PillarItem> | null = null;

async function loadAll(): Promise<Map<string, PillarItem>> {
  if (cache) return cache;

  const out = new Map<string, PillarItem>();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(PILLARS_ROOT);
  } catch {
    cache = out;
    return cache;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".mdx")) continue;
    const filePath = path.join(PILLARS_ROOT, entry);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const inferredSlug = entry.replace(/\.mdx$/, "");
    const parsed = pillarFrontmatterSchema.safeParse({
      ...data,
      slug: data.slug ?? inferredSlug,
    });
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Invalid pillar frontmatter in ${filePath}: ${issues}`);
    }
    const minutes = Math.max(1, Math.round(readingTime(content).minutes));
    out.set(parsed.data.slug, {
      frontmatter: parsed.data,
      body: content,
      readingMinutes: minutes,
      filePath,
    });
  }

  cache = out;
  return cache;
}

export async function getAllPillars(): Promise<PillarItem[]> {
  const map = await loadAll();
  return Array.from(map.values()).sort((a, b) =>
    b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt),
  );
}

export async function getPillarBySlug(
  slug: string,
): Promise<PillarItem | null> {
  const map = await loadAll();
  return map.get(slug) ?? null;
}
