import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryDef } from "@/lib/categories";
import { generateEyecatchSvg } from "@/lib/eyecatch";
import { ARTICLE_LIST_SELECT, formatDate, type ArticleListItem } from "@/lib/articles";
import Timeline from "@/components/Timeline";
import Sidebar from "@/components/Sidebar";

export const revalidate = 60;

function FeaturedCard({ article, size }: { article: ArticleListItem; size: "lead" | "sub" }) {
  const cat = categoryDef(article.category_slug);
  const svg = article.cover_url
    ? null
    : generateEyecatchSvg({
        title: article.title,
        bg: cat.bg,
        fg: cat.fg,
        categoryLabel: cat.label,
        width: size === "lead" ? 760 : 240,
        height: size === "lead" ? 390 : 300,
      });

  const thumb = article.cover_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={article.cover_url} alt="" />
  ) : (
    <div dangerouslySetInnerHTML={{ __html: svg! }} />
  );

  const badges = (
    <>
      <span className="tag" style={{ background: cat.bg, color: cat.fg }}>
        {cat.label}
      </span>
    </>
  );

  if (size === "lead") {
    return (
      <Link href={`/news/${article.id}/`} className="card card-lead">
        {thumb}
        <div className="card-body">
          {badges}
          <h2>{article.title}</h2>
          {article.excerpt && <p>{article.excerpt}</p>}
          <div className="feat-meta">
            <span>{article.contact_org}</span>
            <span>·</span>
            <span className="mono">{formatDate(article.published_at)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/news/${article.id}/`} className="card card-sub">
      <div className="th">{thumb}</div>
      <div className="card-body">
        {badges}
        <h3>{article.title}</h3>
        <div className="feat-meta">
          <span className="mono">{formatDate(article.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select(ARTICLE_LIST_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30)
    .returns<ArticleListItem[]>();

  const list = articles ?? [];
  const lead = list[0];
  const subs = list.slice(1, 3);
  const rest = list.slice(3);

  const { data: editorialPicks } = await supabase
    .from("articles")
    .select("id, title")
    .eq("status", "published")
    .in("source", ["editorial", "legacy"])
    .order("published_at", { ascending: false })
    .limit(4);

  return (
    <div>
      {lead && (
        <section className="feat wrap">
          <div className="feat-grid">
            <FeaturedCard article={lead} size="lead" />
            <div className="right-col">
              {subs.map((a) => (
                <FeaturedCard key={a.id} article={a} size="sub" />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrap main2">
        <main>
          <div className="sec-head">
            <h2>新着リリース</h2>
            <span className="count">全 {list.length} 件</span>
          </div>
          <Timeline articles={rest.length > 0 ? rest : list} />
        </main>

        <Sidebar
          rankItems={list.slice(0, 5).map((a) => ({ id: a.id, title: a.title }))}
          picksTitle="編集部の解説記事"
          picksItems={editorialPicks ?? []}
        />
      </div>

      <section className="band">
        <div className="wrap band-in">
          <div>
            <h2>編集部から、確かな発表を届けます。</h2>
            <p>アドプレス編集部が確認したプレスリリースと解説記事を、新着順に掲載しています。</p>
            <div className="steps">
              <span className="step">
                <b>1</b>発表内容を確認
              </span>
              <span className="step">
                <b>2</b>編集部で記事化
              </span>
              <span className="step">
                <b>3</b>公開
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
