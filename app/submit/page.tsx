import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SubmitForm from "@/components/SubmitForm";

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="ap-wrap" style={{ maxWidth: 480, padding: "60px 20px 100px", textAlign: "center" }}>
        <h1 style={{ marginBottom: 8 }}>記事を投稿する</h1>
        <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 28 }}>
          投稿にはログインが必要です。
        </p>
        <Link
          href="/login/"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            borderRadius: 99,
            background: "#C9D3FF",
            color: "#293A80",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ログインする
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, is_editorial")
    .eq("id", user.id)
    .single();

  if (!profile?.is_editorial) {
    return (
      <div className="ap-wrap" style={{ maxWidth: 560, padding: "60px 20px 100px", textAlign: "center" }}>
        <h1 style={{ marginBottom: 8 }}>投稿権限がありません</h1>
        <p style={{ color: "#55575E", fontSize: 13.5, lineHeight: 1.9, marginBottom: 28 }}>
          現在、記事の投稿は編集部アカウントに限定しています。
        </p>
        <Link href="/" className="post-btn" style={{ height: 50, fontSize: 15 }}>
          トップページへ戻る
        </Link>
      </div>
    );
  }

  return <SubmitForm defaultOrg={profile?.display_name ?? ""} defaultEmail={profile?.email ?? user.email ?? ""} />;
}
