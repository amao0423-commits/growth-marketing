import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="ap-wrap" style={{ maxWidth: 480, padding: "60px 20px 100px", textAlign: "center" }}>
        <p>
          <Link href="/login/">ログイン</Link>が必要です。
        </p>
      </div>
    );
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, article_id, type, message, is_read, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // 既読化はここで一括して行う（読み込み時点で全件既読にする簡易実装）
  const unreadIds = (notifications ?? []).filter((n) => !n.is_read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  return (
    <div className="ap-wrap" style={{ maxWidth: 640, padding: "40px 20px 100px" }}>
      <h1 style={{ marginBottom: 24 }}>お知らせ</h1>

      {(!notifications || notifications.length === 0) && (
        <p style={{ fontSize: 13.5, color: "#8A8D96" }}>お知らせはありません。</p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {(notifications ?? []).map((n) => (
          <div
            key={n.id}
            style={{
              border: "1px solid #E7E7EC",
              borderRadius: 8,
              padding: "14px 16px",
              background: n.is_read ? "#fff" : "#F6F6F8",
            }}
          >
            <div style={{ fontSize: 11, color: "#8A8D96", marginBottom: 4 }}>
              {new Date(n.created_at).toLocaleString("ja-JP")}
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              {n.article_id ? <Link href={`/news/${n.article_id}/`}>{n.message}</Link> : n.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
