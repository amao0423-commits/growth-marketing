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
      <div className="ap-wrap" style={{ maxWidth: 480, padding: "60px 20px 100px", textAlign: "center" }}>
        <h1 style={{ marginBottom: 8 }}>マイページ</h1>
        <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 28 }}>ログインが必要です。</p>
        <Link
          href="/login/"
          style={{ display: "inline-block", padding: "14px 32px", borderRadius: 99, background: "#C9D3FF", color: "#293A80", fontWeight: 700, textDecoration: "none" }}
        >
          ログインする
        </Link>
      </div>
    );
  }

  const [{ data: articles }, { data: unreadNotifs }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, category_slug, status, published_at, link_count")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("id").eq("profile_id", user.id).eq("is_read", false),
  ]);

  const articleIds = (articles ?? []).map((a) => a.id);
  const { data: referrals } = articleIds.length
    ? await supabase.from("referrals").select("article_id, status, due_at").in("article_id", articleIds)
    : { data: [] as { article_id: number; status: string; due_at: string }[] };

  const referralByArticle = new Map((referrals ?? []).map((r) => [r.article_id, r]));

  return (
    <div className="ap-wrap" style={{ maxWidth: 760, padding: "40px 20px 100px" }}>
      <h1 style={{ marginBottom: 6 }}>マイページ</h1>
      <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 24 }}>{user.email}</p>

      <Link
        href="/mypage/notifications/"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, marginBottom: 24, color: "#293A80" }}
      >
        お知らせ
        {unreadNotifs && unreadNotifs.length > 0 && (
          <span style={{ background: "#A33A4E", color: "#fff", borderRadius: 99, fontSize: 11, padding: "1px 7px" }}>
            {unreadNotifs.length}
          </span>
        )}
      </Link>

      <section className="sec" style={{ border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
        <h2 style={{ marginBottom: 4 }}>投稿した記事</h2>
        <p style={{ fontSize: 12, color: "#8A8D96", marginBottom: 16 }}>
          公開から14日以内に、記事を紹介したページのURLを提出してください。未提出のまま期限を過ぎると、記事が取り下げられることがあります。
        </p>

        {(!articles || articles.length === 0) && (
          <p style={{ fontSize: 13.5, color: "#8A8D96" }}>
            まだ投稿がありません。<Link href="/submit/">記事を投稿する</Link>
          </p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {(articles ?? []).map((a) => {
            const referral = referralByArticle.get(a.id);
            return (
              <div key={a.id} style={{ border: "1px solid #E7E7EC", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#8A8D96", marginBottom: 4 }}>
                  {categoryLabel(a.category_slug)} ・ {statusLabel(a.status)}
                </div>
                <Link href={`/news/${a.id}/`} style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {a.title}
                </Link>
                {referral && referral.status === "pending" && (
                  <div style={{ marginTop: 8 }}>
                    <ReferralBadge dueAt={referral.due_at} />
                    <Link
                      href={`/mypage/articles/${a.id}/referral/`}
                      style={{ marginLeft: 10, fontSize: 12.5, color: "#293A80" }}
                    >
                      紹介リンクを提出する
                    </Link>
                  </div>
                )}
                {referral && referral.status === "submitted" && (
                  <p style={{ fontSize: 12, color: "#846412", marginTop: 6 }}>紹介リンク：確認待ち</p>
                )}
                {referral && referral.status === "verified" && (
                  <p style={{ fontSize: 12, color: "#1F6B52", marginTop: 6 }}>紹介リンク：確認済み</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "published":
      return "公開中";
    case "withdrawn":
      return "取り下げ済み";
    case "removed":
      return "削除済み";
    default:
      return status;
  }
}

function ReferralBadge({ dueAt }: { dueAt: string }) {
  const due = new Date(dueAt);
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
  return (
    <span style={{ fontSize: 12, color: daysLeft <= 3 ? "#A33A4E" : "#846412" }}>
      紹介リンク未提出（あと{daysLeft}日）
    </span>
  );
}
