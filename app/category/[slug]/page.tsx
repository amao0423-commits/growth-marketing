import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, categoryDef, isCategorySlug } from "@/lib/categories";
import { ARTICLE_LIST_SELECT, type ArticleListItem } from "@/lib/articles";
import PostCard from "@/components/PostCard";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = categoryDef(slug);
  return {
    title: `${cat.label}のプレスリリース一覧`,
    description: `企業・団体・個人が投稿した${cat.label}のプレスリリースを新着順に掲載しています。`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCategorySlug(slug)) notFound();

  const cat = categoryDef(slug);
  const supabase = await createClient();
  const { data: articles, count } = await supabase
    .from("articles")
    .select(ARTICLE_LIST_SELECT, { count: "exact" })
    .eq("status", "published")
    .eq("category_slug", slug)
    .order("published_at", { ascending: false })
    .limit(30)
    .returns<ArticleListItem[]>();

  return (
    <div>
      <nav className="crumb" style={{ maxWidth: 1120, padding: "18px 20px 0" }}>
        <a href="/">ホーム</a> / {cat.label}
      </nav>

      <section style={{ maxWidth: 1120, margin: "16px auto 4px", padding: "0 20px" }}>
        <div style={{ background: cat.bg, color: cat.fg, borderRadius: 14, padding: "28px 30px" }}>
          <h1 style={{ fontFamily: "var(--font-disp)", fontSize: 26, margin: "0 0 8px" }}>{cat.label}</h1>
          <p style={{ margin: 0, fontSize: 13.5, opacity: 0.9 }}>掲載 {count ?? 0}件</p>
        </div>
      </section>

      <nav aria-label="カテゴリ" style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/" style={{ fontSize: 13, background: "var(--mist)", borderRadius: 99, padding: "6px 14px", color: "var(--ink-2)" }}>
          すべて
        </a>
        {CATEGORIES.map((c) => (
          <a
            key={c.slug}
            href={`/category/${c.slug}/`}
            aria-current={c.slug === slug ? "page" : undefined}
            style={{
              fontSize: 13,
              borderRadius: 99,
              padding: "6px 14px",
              background: c.slug === slug ? c.bg : "var(--mist)",
              color: c.slug === slug ? c.fg : "var(--ink-2)",
              fontWeight: c.slug === slug ? 700 : 400,
            }}
          >
            {c.label}
          </a>
        ))}
      </nav>

      <section className="related" style={{ margin: "0 auto 40px" }}>
        {(!articles || articles.length === 0) && (
          <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>このカテゴリにはまだ記事がありません。</p>
        )}
        <div className="posts-grid">
          {(articles ?? []).map((a) => (
            <PostCard key={a.id} article={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
