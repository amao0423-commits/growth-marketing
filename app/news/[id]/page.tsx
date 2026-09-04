import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { categoryDef } from "@/lib/categories";
import { generateEyecatchSvg } from "@/lib/eyecatch";
import { ARTICLE_LIST_SELECT, formatDate, type ArticleListItem } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";
import PostCard from "@/components/PostCard";
import LikeButton from "@/components/LikeButton";

export const revalidate = 60;

async function getArticle(id: number) {
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select(
      "id, title, body_html, excerpt, category_slug, contact_org, contact_email, contact_tel, contact_url, contact_public, cover_url, published_at, updated_at, status"
    )
    .eq("id", id)
    .eq("status", "published")
    .single();
  return article;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = Number((await params).id);
  const article = await getArticle(id);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    alternates: { canonical: `/news/${article.id}/` },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const article = await getArticle(id);
  if (!article) notFound();

  const cat = categoryDef(article.category_slug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: related }, { count: likeCount }, { data: existingLike }] = await Promise.all([
    supabase
      .from("articles")
      .select(ARTICLE_LIST_SELECT)
      .eq("status", "published")
      .eq("category_slug", article.category_slug)
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(3)
      .returns<ArticleListItem[]>(),
    supabase.from("article_likes").select("*", { count: "exact", head: true }).eq("article_id", article.id),
    user
      ? supabase.from("article_likes").select("article_id").eq("article_id", article.id).eq("profile_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const svg = article.cover_url
    ? null
    : generateEyecatchSvg({ title: article.title, bg: cat.bg, fg: cat.fg, categoryLabel: cat.label, width: 1000, height: 520 });

  const articleUrl = `${SITE_URL}/news/${article.id}/`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_url ? [article.cover_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at ?? article.published_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    articleSection: cat.label,
    author: { "@type": "Organization", name: "アドプレス編集部", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "アドプレス",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-full.png` },
    },
  };

  return (
    <div data-cat={article.category_slug}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <nav className="crumb">
        <Link href="/">ホーム</Link> <span>/</span> <Link href={`/category/${article.category_slug}/`}>{cat.label}</Link>
      </nav>

      <article>
        <div className="article-hero">
          <div className="wrap">
            <span className="eyebrow">{cat.label}</span>
            <h1>{article.title}</h1>
            <div className="article-meta">
              <span>{formatDate(article.published_at)}</span>
              <span>{article.contact_org}</span>
            </div>
          </div>
          <div className="article-cover">
            {article.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.cover_url} alt="" />
            ) : (
              <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: svg! }} />
            )}
          </div>
        </div>

        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.body_html }} />

        {article.contact_public && (article.contact_tel || article.contact_url) && (
          <div className="article-body">
            <div className="callout">
              <h3>お問い合わせ</h3>
              <p>
                {article.contact_org}
                {article.contact_tel && <> ／ {article.contact_tel}</>}
                {article.contact_url && (
                  <>
                    {" "}
                    ／{" "}
                    <a href={article.contact_url} target="_blank" rel="noopener noreferrer">
                      {article.contact_url}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
        <div className="article-body">
          <LikeButton articleId={article.id} initialCount={likeCount ?? 0} initialLiked={!!existingLike} isLoggedIn={!!user} />
        </div>
      </article>

      {related && related.length > 0 && (
        <section className="related">
          <div className="eyebrow">RELATED</div>
          <h2>{cat.label}の他の記事</h2>
          <div className="posts-grid">
            {related.map((a) => (
              <PostCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap band-in">
          <div>
            <h2>気になった記事は、いいねで残せます。</h2>
            <p>ログインすると記事にいいねを付けられます。いいねした記事はマイページにまとまります。登録は無料です。</p>
          </div>
          <Link href={user ? "/mypage/" : "/login/"} className="post-btn">
            {user ? "いいねした記事" : "ログイン"}
          </Link>
        </div>
      </section>
    </div>
  );
}
