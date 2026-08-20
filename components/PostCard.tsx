import Link from "next/link";
import { categoryDef } from "@/lib/categories";
import { generateEyecatchSvg } from "@/lib/eyecatch";
import { formatDate, type ArticleListItem } from "@/lib/articles";

export default function PostCard({ article }: { article: ArticleListItem }) {
  const cat = categoryDef(article.category_slug);
  const svg = article.cover_url
    ? null
    : generateEyecatchSvg({ title: article.title, bg: cat.bg, fg: cat.fg, categoryLabel: cat.label, width: 400, height: 210 });

  return (
    <Link className="post-card" href={`/news/${article.id}/`}>
      <div className="post-thumb">
        {article.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.cover_url} alt="" />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svg! }} />
        )}
      </div>
      <div className="post-body">
        <span className="post-cat" style={{ background: cat.bg, color: cat.fg }}>
          {article.is_sponsored && (
            <span className="pr-badge" style={{ marginRight: 6 }}>
              PR
            </span>
          )}
          {cat.label}
        </span>
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        <div className="post-meta">
          <span>{article.contact_org}</span>
          <span className="mono">{formatDate(article.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}
