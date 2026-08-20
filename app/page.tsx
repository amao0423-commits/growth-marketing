import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";
import { ARTICLE_LIST_SELECT, type ArticleListItem } from "@/lib/articles";
import PostCard from "@/components/PostCard";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select(ARTICLE_LIST_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24)
    .returns<ArticleListItem[]>();

  return (
    <div>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 20px 8px" }}>
        <h1 style={{ fontFamily: "var(--font-disp)", fontSize: 26, margin: "0 0 8px" }}>
          誰でも無料で、プレスリリースを届けられる。
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13.5, maxWidth: 640, lineHeight: 1.85 }}>
          企業・団体・個人が投稿したプレスリリースを新着順に掲載しています。ログインして投稿するだけで、審査を待たずに公開されます。
        </p>
      </section>

      <nav aria-label="カテゴリ" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}/`}
            style={{ fontSize: 13, background: "var(--mist)", borderRadius: 99, padding: "6px 14px", color: "var(--ink-2)" }}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <section className="related" style={{ margin: "0 auto 40px" }}>
        <h2>新着記事</h2>
        {(!articles || articles.length === 0) && (
          <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>まだ記事がありません。</p>
        )}
        <div className="posts-grid">
          {(articles ?? []).map((a) => (
            <PostCard key={a.id} article={a} />
          ))}
        </div>
      </section>

      <section className="ap-cta" style={{ maxWidth: 720, margin: "0 auto 60px" }}>
        <h2>お知らせしたいニュースはありますか。</h2>
        <p>ログインして投稿するだけ。掲載料はかかりません。</p>
        <Link className="ap-cta-btn" href="/submit/">
          記事を投稿する
        </Link>
      </section>
    </div>
  );
}
