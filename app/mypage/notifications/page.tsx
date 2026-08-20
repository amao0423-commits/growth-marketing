import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NotificationsList from "@/components/NotificationsList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mp-wrap" style={{ paddingTop: 60, textAlign: "center" }}>
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
    <div className="mp-wrap">
      <nav className="tabs">
        <Link href="/mypage/">投稿した記事</Link>
        <Link href="/mypage/notifications/" aria-current="page">
          お知らせ
        </Link>
      </nav>

      <h1 className="mp-h1">お知らせ</h1>
      <p className="mp-lede">公開・審査結果・紹介リンクの提出期限などをお知らせします。</p>

      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
}
