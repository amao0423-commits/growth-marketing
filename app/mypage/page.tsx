import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ARTICLE_LIST_SELECT, type ArticleListItem } from "@/lib/articles";
import PostCard from "@/components/PostCard";

type LikeRow = {
  article_id: number;
  created_at: string;
};

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mp-wrap" style={{ paddingTop: 60, textAlign: "center" }}>
        <h1 className="mp-h1">マイページ</h1>
        <p className="mp-lede">ログインが必要です。</p>
        <Link href="/login/" className="post-btn" style={{ height: 50, fontSize: 15 }}>
          ログインする
        </Link>
      </div>
    );
  }

  const { data: likes } = await supabase
    .from("article_likes")
    .select("article_id, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .returns<LikeRow[]>();

  const likeRows = likes ?? [];
  const likedIds = likeRows.map((like) => like.article_id);
  const { data: likedArticles } = likedIds.length
    ? await supabase.from("articles").select(ARTICLE_LIST_SELECT).in("id", likedIds).eq("status", "published").returns<ArticleListItem[]>()
    : { data: [] as ArticleListItem[] };

  const articleById = new Map((likedArticles ?? []).map((article) => [article.id, article]));
  const likedList = likedIds.map((id) => articleById.get(id)).filter((article): article is ArticleListItem => !!article);

  return (
    <div className="mp-wrap">
      <h1 className="mp-h1">マイページ</h1>
      <p className="mp-lede">
        ログイン中 ・ <b>{user.email}</b>
      </p>

      <nav className="tabs" aria-label="マイページメニュー">
        <a href="#saves">
          保存した記事<span className="dot">0</span>
        </a>
        <a href="#likes" aria-current="page">
          いいねした記事<span className="dot">{likedList.length}</span>
        </a>
        <a href="#history">
          閲覧履歴<span className="dot">0</span>
        </a>
        <a href="#settings">設定</a>
      </nav>

      <section id="saves" className="mp-tip">
        <b>保存した記事はまだありません。</b>
        <br />
        あとで読みたい記事を保存できる機能は準備中です。いまは記事ページのいいねを使って、気になる記事をマイページに残せます。
      </section>

      <section id="likes">
        <div className="sec-head">
          <h2>いいねした記事</h2>
          <span className="count">全 {likedList.length} 件</span>
        </div>
        {likedList.length > 0 ? (
          <div className="posts-grid">
            {likedList.map((article) => (
              <PostCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="mp-card">
            <div className="card-head">
              <h2>いいねした記事はまだありません</h2>
              <p className="mp-lede" style={{ marginBottom: 0 }}>
                気になった記事の「いいね」を押すと、このページにまとまります。あとから読み返したり、社内で共有したりできます。
              </p>
            </div>
            <div className="acts">
              <Link href="/">新着記事を見る</Link>
            </div>
          </div>
        )}
      </section>

      <section id="history" className="mp-tip" style={{ marginTop: 26 }}>
        <b>閲覧履歴はまだありません。</b>
        <br />
        読んだ記事を自動で記録する機能は準備中です。
      </section>

      <section id="settings" className="mp-card">
        <div className="card-head">
          <h2>アカウント</h2>
          <p className="mp-lede" style={{ marginBottom: 0 }}>
            アドプレスの記事は編集部が執筆しています。アカウントは、記事にいいねして読み返すためのものです。
          </p>
          <div className="mp-sub" style={{ marginTop: 12 }}>
            <span>メールアドレス</span>
            <span>{user.email}</span>
          </div>
        </div>
        <div className="acts">
          <form action="/api/auth/signout" method="post">
            <button type="submit">ログアウト</button>
          </form>
        </div>
      </section>
    </div>
  );
}
