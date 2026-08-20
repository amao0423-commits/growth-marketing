import { createClient } from "@/lib/supabase/server";
import ReferralForm from "@/components/ReferralForm";
import Link from "next/link";

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = Number(id);
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

  const { data: article } = await supabase
    .from("articles")
    .select("id, title, author_id")
    .eq("id", articleId)
    .single();

  if (!article || article.author_id !== user.id) {
    return (
      <div className="ap-wrap" style={{ maxWidth: 480, padding: "60px 20px 100px", textAlign: "center" }}>
        <p>記事が見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="ap-wrap" style={{ maxWidth: 560, padding: "40px 20px 100px" }}>
      <h1 style={{ marginBottom: 8 }}>紹介リンクを提出する</h1>
      <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 24 }}>
        「{article.title}」を紹介したページ（自社サイトのお知らせ欄・SNS投稿など）のURLを入力してください。
      </p>
      <ReferralForm articleId={article.id} />
    </div>
  );
}
