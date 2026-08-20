import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, categoryDef, isCategorySlug } from "@/lib/categories";
import { ARTICLE_LIST_SELECT, type ArticleListItem } from "@/lib/articles";
import Timeline from "@/components/Timeline";
import Sidebar from "@/components/Sidebar";

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

  const list = articles ?? [];
  const relatedCats = CATEGORIES.filter((c) => c.slug !== slug).slice(0, 4);

  return (
    <div data-cat={slug}>
      <div className="wrap">
        <nav className="crumb">
          <a href="/">ホーム</a> / {cat.label}
        </nav>
        <section className="cathero">
          <div className="cathero-in" style={{ background: cat.bg, color: cat.fg }}>
            <h1>{cat.label}</h1>
            <p>企業・団体・個人が投稿した{cat.label}のプレスリリースを新着順に掲載しています。</p>
          </div>
        </section>
      </div>

      <div className="wrap main2">
        <main>
          <div className="sec-head">
            <h2>{cat.label}の新着</h2>
            <span className="count">全 {count ?? 0} 件</span>
          </div>
          <Timeline articles={list} />
        </main>

        <Sidebar
          rankItems={list.slice(0, 5).map((a) => ({ id: a.id, title: a.title }))}
          extra={
            <div className="panel">
              <h3>関連するカテゴリ</h3>
              <div className="subcats">
                {relatedCats.map((c) => (
                  <a key={c.slug} href={`/category/${c.slug}/`}>
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
