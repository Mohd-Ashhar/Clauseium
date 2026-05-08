import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content");

export const CATEGORIES = [
  "templates",
  "dpdp",
  "clauses",
  "guides",
  "comparisons",
  "industry",
  "glossary",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  templates: "Contract Templates",
  dpdp: "DPDP Compliance",
  clauses: "Clause Library",
  guides: "Indian Law Guides",
  comparisons: "Comparisons",
  industry: "By Industry",
  glossary: "Glossary",
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  templates:
    "Free, Indian-law-compliant contract templates reviewed by Bar Council-enrolled advocates.",
  dpdp:
    "Practical guides to the Digital Personal Data Protection Act, 2023 — written for Indian counsel.",
  clauses:
    "Deep-dives into individual contract clauses under Indian law — drafting tips, risk patterns, redlines.",
  guides:
    "Step-by-step guides to navigating Indian commercial law for in-house counsel and founders.",
  comparisons:
    "Side-by-side comparisons of Indian contract types, clauses, and legal frameworks.",
  industry:
    "Industry-specific contract guidance — SaaS, fintech, healthcare, manufacturing.",
  glossary:
    "Plain-English definitions of Indian legal terms used in commercial contracts.",
};

export const frontmatterSchema = z.object({
  title: z.string().min(10).max(120),
  description: z.string().min(50).max(220),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum(CATEGORIES),
  keywords: z.array(z.string()).min(1).max(20),
  author: z.object({
    name: z.string(),
    role: z.string(),
    enrollment: z.string().optional(),
    linkedin: z.string().url().optional(),
    bio: z.string().optional(),
  }),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  applicableLaws: z
    .array(
      z.object({
        name: z.string(),
        sections: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  relatedTemplates: z.array(z.string()).default([]),
  relatedArticles: z.array(z.string()).default([]),
  cta: z
    .object({
      type: z.enum(["template_download", "demo_book", "free_trial"]),
      text: z.string(),
      gated: z.boolean().default(false),
      templateId: z.string().optional(),
    })
    .optional(),
  faq: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
  schema: z
    .object({
      type: z.enum(["Article", "FAQPage", "HowTo", "LegalService"]),
    })
    .default({ type: "Article" }),
  ogImage: z.string().optional(),
  comparison: z
    .object({
      competitor: z.object({
        name: z.string(),
        url: z.string().url().optional(),
        tagline: z.string().optional(),
      }),
      featureMatrix: z.array(
        z.object({
          feature: z.string(),
          clauseium: z.union([z.string(), z.boolean()]),
          competitor: z.union([z.string(), z.boolean()]),
        }),
      ),
      verdict: z.string().optional(),
    })
    .optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export interface ContentItem {
  frontmatter: Frontmatter;
  body: string;
  readingMinutes: number;
  filePath: string;
}

interface ContentCache {
  items: ContentItem[];
  byCategorySlug: Map<string, ContentItem>;
}

let cache: ContentCache | null = null;

async function loadAll(): Promise<ContentCache> {
  if (cache) return cache;

  const items: ContentItem[] = [];
  const byCategorySlug = new Map<string, ContentItem>();

  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_ROOT, category);
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith(".mdx")) continue;
      const filePath = path.join(dir, entry);
      const raw = await fs.readFile(filePath, "utf8");
      const { data, content } = matter(raw);

      const parsed = frontmatterSchema.safeParse({
        ...data,
        category,
        slug: data.slug ?? entry.replace(/\.mdx$/, ""),
      });

      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(
          `Invalid frontmatter in ${filePath}: ${issues}`,
        );
      }

      const minutes = Math.max(1, Math.round(readingTime(content).minutes));
      const item: ContentItem = {
        frontmatter: parsed.data,
        body: content,
        readingMinutes: minutes,
        filePath,
      };

      items.push(item);
      byCategorySlug.set(`${category}/${parsed.data.slug}`, item);
    }
  }

  items.sort((a, b) =>
    b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt),
  );

  cache = { items, byCategorySlug };
  return cache;
}

export async function getAllContent(): Promise<ContentItem[]> {
  return (await loadAll()).items;
}

export async function getContentByCategory(
  category: Category,
): Promise<ContentItem[]> {
  const all = await getAllContent();
  return all.filter((c) => c.frontmatter.category === category);
}

export async function getContentBySlug(
  category: Category,
  slug: string,
): Promise<ContentItem | null> {
  const { byCategorySlug } = await loadAll();
  return byCategorySlug.get(`${category}/${slug}`) ?? null;
}

export async function getCategoriesInUse(): Promise<Category[]> {
  const all = await getAllContent();
  const set = new Set<Category>(all.map((c) => c.frontmatter.category));
  return CATEGORIES.filter((c) => set.has(c));
}

export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  const lines = body.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1].length === 2 ? 2 : 3;
    const text = match[2].replace(/[*_`]/g, "").trim();
    const id = slugifyHeading(text);
    headings.push({ id, text, depth });
  }
  return headings;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
