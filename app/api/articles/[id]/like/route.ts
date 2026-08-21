import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function likeCount(supabase: Awaited<ReturnType<typeof createClient>>, articleId: number) {
  const { count } = await supabase
    .from("article_likes")
    .select("*", { count: "exact", head: true })
    .eq("article_id", articleId);
  return count ?? 0;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const articleId = Number((await params).id);
  if (!Number.isFinite(articleId)) {
    return NextResponse.json({ error: "記事IDが不正です。" }, { status: 400 });
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "いいねするにはログインが必要です。" }, { status: 401 });
  }

  const { error } = await supabase
    .from("article_likes")
    .upsert({ article_id: articleId, profile_id: user.id }, { onConflict: "article_id,profile_id" });

  if (error) {
    return NextResponse.json({ error: "いいねを保存できませんでした。" }, { status: 500 });
  }

  return NextResponse.json({ liked: true, count: await likeCount(supabase, articleId) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const articleId = Number((await params).id);
  if (!Number.isFinite(articleId)) {
    return NextResponse.json({ error: "記事IDが不正です。" }, { status: 400 });
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "いいねするにはログインが必要です。" }, { status: 401 });
  }

  const { error } = await supabase
    .from("article_likes")
    .delete()
    .eq("article_id", articleId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.json({ error: "いいねを解除できませんでした。" }, { status: 500 });
  }

  return NextResponse.json({ liked: false, count: await likeCount(supabase, articleId) });
}
