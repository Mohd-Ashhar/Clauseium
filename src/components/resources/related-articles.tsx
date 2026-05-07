import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  CATEGORY_LABELS,
  getAllContent,
  type ContentItem,
} from "@/lib/content";

export async function RelatedArticles({
  slugs,
  currentSlug,
  limit = 3,
}: {
  slugs: string[];
  currentSlug: string;
  limit?: number;
}) {
  const all = await getAllContent();

  const matched = slugs
    .map((s) => all.find((c) => c.frontmatter.slug === s))
    .filter((c): c is ContentItem => !!c && c.frontmatter.slug !== currentSlug);

  if (matched.length < limit) {
    const filler = all.filter(
      (c) =>
        c.frontmatter.slug !== currentSlug &&
        !matched.some((m) => m.frontmatter.slug === c.frontmatter.slug),
    );
    matched.push(...filler.slice(0, limit - matched.length));
  }

  const items = matched.slice(0, limit);
  if (!items.length) return null;

  return (
    <section className="mt-16">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-500">
        Related reading
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.frontmatter.slug}
            href={`/resources/${item.frontmatter.category}/${item.frontmatter.slug}`}
            className="group flex flex-col rounded-xl border border-paper-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-counsel-600">
              {CATEGORY_LABELS[item.frontmatter.category]}
            </span>
            <h4 className="mt-2 font-display text-[15.5px] font-semibold leading-snug text-paper-900">
              {item.frontmatter.title}
            </h4>
            <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-paper-600">
              {item.frontmatter.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-600 transition-transform group-hover:translate-x-0.5">
              Read article
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
