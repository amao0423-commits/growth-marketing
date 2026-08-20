import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// マイページからの紹介リンク提出。RLS（referrals_own_submit）により、
// 自分の記事に紐づく referral のみ、status in ('pending','submitted') の間だけ更新できる。
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { articleId?: number; url?: string } | null;
  const articleId = Number(body?.articleId);
  const url = String(body?.url ?? "").trim();

  if (!articleId || !/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: "URLの形式が正しくありません。" }, { status: 400 });
  }

  const { error } = await supabase
    .from("referrals")
    .update({ status: "submitted", submitted_url: url, submitted_at: new Date().toISOString() })
    .eq("article_id", articleId);

  if (error) {
    return NextResponse.json({ error: "提出に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
