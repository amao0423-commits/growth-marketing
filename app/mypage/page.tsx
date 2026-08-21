import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/categories";

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

  const [{ data: articles }, { data: unreadNotifs }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, category_slug, status, published_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("id").eq("profile_id", user.id).eq("is_read", false),
  ]);

  const articleIds = (articles ?? []).map((a) => a.id);
  const { data: referrals } = articleIds.length
    ? await supabase.from("referrals").select("article_id, status, due_at").in("article_id", articleIds)
    : { data: [] as { article_id: number; status: string; due_at: string }[] };

  const referralByArticle = new Map((referrals ?? []).map((r) => [r.article_id, r]));
  const needsReferral = (articles ?? []).filter((a) => referralByArticle.get(a.id)?.status === "pending");
  const unreadCount = unreadNotifs?.length ?? 0;

  return (
    <div className="mp-wrap">
      <h1 className="mp-h1">マイページ</h1>
      <p className="mp-lede">{user.email}</p>

      <nav className="tabs">
        <Link href="/mypage/" aria-current="page">
          投稿した記事
        </Link>
        <Link href="/mypage/notifications/">
          お知らせ
          {unreadCount > 0 && <span className="dot">{unreadCount}</span>}
        </Link>
      </nav>

      {needsReferral.length > 0 && (
        <div className="alert">
          <b>紹介リンクが未提出の記事が{needsReferral.length}件あります</b>
          <br />
          掲載した記事を自社サイトのお知らせやSNSで紹介し、そのURLを提出してください。期限までに提出がない場合、記事を取り下げます。
        </div>
      )}

      {(!articles || articles.length === 0) && (
        <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>
          まだ記事はありません。
        </p>
      )}

      {(articles ?? []).map((a) => {
        const referral = referralByArticle.get(a.id);
        const isPending = referral?.status === "pending";
        return (
          <article className={`mp-card${isPending ? " attn" : ""}`} key={a.id}>
            <div className="card-head">
              <StatusBadge status={a.status} referralStatus={referral?.status} />
              <h2>{a.title}</h2>
              <div className="mp-sub">
                <span className="mono">{new Date(a.published_at).toLocaleString("ja-JP")} 公開</span>
                <Link href={`/news/${a.id}/`}>記事を見る</Link>
                <span>{categoryLabel(a.category_slug)}</span>
              </div>
            </div>

            {isPending && referral && (
              <div className="mp-block">
                <h3>紹介リンクの提出</h3>
                <p>掲載日から14日以内に、紹介したページのURLを提出してください。</p>
                <div className="deadline">
                  提出期限：{new Date(referral.due_at).toLocaleDateString("ja-JP")}（残り{daysLeft(referral.due_at)}日）
                </div>
                <div>
                  <Link href={`/mypage/articles/${a.id}/referral/`} className="post-btn" style={{ height: 40, fontSize: 13.5 }}>
                    紹介リンクを提出する
                  </Link>
                </div>
              </div>
            )}
            {referral?.status === "submitted" && (
              <div className="mp-block">
                <h3>紹介リンク</h3>
                <p>提出済み（編集部の確認をお待ちください）</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, referralStatus }: { status: string; referralStatus?: string }) {
  if (status === "removed") return <span className="st s-back">削除済み</span>;
  if (status === "withdrawn") return <span className="st s-check">取り下げ済み</span>;
  if (referralStatus === "pending") return <span className="st s-need">紹介リンク未提出</span>;
  if (referralStatus === "submitted") return <span className="st s-check">確認待ち</span>;
  return <span className="st s-live">掲載中</span>;
}

function daysLeft(dueAt: string) {
  return Math.max(0, Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86400000));
}
