import Link from "next/link";
import { categoryDef } from "@/lib/categories";
import { generateEyecatchSvg } from "@/lib/eyecatch";
import { formatTime, groupByDay, isFresh, type ArticleListItem } from "@/lib/articles";

// 日付グルーピングのタイムライン一覧（design-ref/index.html・category-korea.html の
// .daygroup / .items / .item 構造）。ホーム・カテゴリ一覧で共通利用する。
export default function Timeline({ articles }: { articles: ArticleListItem[] }) {
  if (articles.length === 0) {
    return <div className="empty">まだ記事がありません。最初の1本を投稿してみてください。</div>;
  }

  const groups = groupByDay(articles);

  return (
    <>
      {groups.map((g) => (
        <div className="daygroup" key={g.key}>
          <div className="daymark">
            <div className="d mono">{g.day}</div>
            <div className="m">{g.month}</div>
            <div className="w">{g.weekday}</div>
          </div>
          <div className="items">
            {g.items.map((a) => {
              const cat = categoryDef(a.category_slug);
              const fresh = isFresh(a.published_at);
              const svg = a.cover_url
                ? null
                : generateEyecatchSvg({ title: a.title, bg: cat.bg, fg: cat.fg, categoryLabel: cat.label, width: 200, height: 124 });
              return (
                <Link href={`/news/${a.id}/`} key={a.id} className={`item${fresh ? " fresh" : ""}`}>
                  <div className="time mono">{formatTime(a.published_at)}</div>
                  <div>
                    <div className="badges">
                      {a.is_sponsored && <span className="pr">PR</span>}
                      <span className="tag" style={{ background: cat.bg, color: cat.fg }}>
                        {cat.label}
                      </span>
                    </div>
                    <h3>{a.title}</h3>
                    <div className="src">{a.contact_org}</div>
                  </div>
                  <div className="th">
                    {a.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.cover_url} alt="" />
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: svg! }} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
