import { ImageResponse } from "next/og";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  getAllContent,
  getContentBySlug,
} from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Clauseium resource";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const all = await getAllContent();
  return all.map((item) => ({
    category: item.frontmatter.category,
    slug: item.frontmatter.slug,
  }));
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export default async function OgImage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const { category, slug } = params;
  const fallback = {
    title: "Clauseium",
    description: "AI contract review for Indian in-house counsel.",
    categoryLabel: "Resource",
    author: "Clauseium",
  };

  let title = fallback.title;
  let description = fallback.description;
  let categoryLabel = fallback.categoryLabel;
  let author = fallback.author;

  if (isCategory(category)) {
    const item = await getContentBySlug(category, slug);
    if (item) {
      title = item.frontmatter.title;
      description = item.frontmatter.description;
      categoryLabel = CATEGORY_LABELS[category];
      author = item.frontmatter.author.name;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#050505",
          color: "#fafaf9",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          position: "relative",
          padding: 64,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.45), rgba(201,164,73,0.12) 55%, rgba(201,164,73,0) 75%)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.22), rgba(201,164,73,0.05) 60%, rgba(201,164,73,0) 80%)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#c9a449",
              lineHeight: 1,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              display: "flex",
            }}
          >
            §
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#f0f1f3",
              letterSpacing: -0.5,
              display: "flex",
            }}
          >
            Clauseium
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            marginTop: "auto",
            marginBottom: "auto",
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 9999,
              border: "1px solid rgba(201,164,73,0.35)",
              background: "rgba(201,164,73,0.10)",
              color: "#efddb0",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              alignSelf: "flex-start",
            }}
          >
            {categoryLabel}
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#fafaf9",
              lineHeight: 1.08,
              letterSpacing: -1.5,
              display: "flex",
            }}
          >
            {title.length > 90 ? title.slice(0, 87) + "…" : title}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "#c5c8ce",
              lineHeight: 1.4,
              display: "flex",
              maxWidth: 920,
            }}
          >
            {description.length > 160
              ? description.slice(0, 157) + "…"
              : description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#c5c8ce",
              fontSize: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 32,
                height: 32,
                borderRadius: 9999,
                background: "rgba(201,164,73,0.20)",
                color: "#efddb0",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {author
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("")}
            </div>
            <div style={{ display: "flex" }}>{author}</div>
          </div>
          <div
            style={{
              display: "flex",
              color: "#6b7280",
              fontSize: 18,
              fontFamily:
                "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
            }}
          >
            clauseium.com/resources
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
