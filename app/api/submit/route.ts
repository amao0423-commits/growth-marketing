import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCategorySlug } from "@/lib/categories";
import { reviewArticle } from "@/lib/review";

export const runtime = "nodejs";

// 投稿はログイン不要。送信されたら即座に articles へ status='published' で
// INSERTする（審査待ちにはしない）。ルールベース審査は非同期・非ブロッキングで
// 実行し、結果を review_logs に記録するのみ（flagged でも公開は継続する）。
// 不適切と判断した場合の削除は編集部が事後に行う（利用規約 第9条）。
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = String(input.title ?? "").trim();
  const bodyHtml = String(input.bodyHtml ?? "").trim();
  const excerpt = input.excerpt ? String(input.excerpt).trim() : null;
  const categorySlug = String(input.categorySlug ?? "");
  const displayName = String(input.displayName ?? "").trim();
  const contactOrg = String(input.contactOrg ?? displayName).trim();
  const contactEmail = String(input.contactEmail ?? "").trim();
  const contactTel = input.contactTel ? String(input.contactTel).trim() : null;
  const contactUrl = input.contactUrl ? String(input.contactUrl).trim() : null;
  const contactPublic = Boolean(input.contactPublic);
  const links = Array.isArray(input.links) ? (input.links as { url: string; anchorText?: string }[]) : [];

  // 必須項目・カテゴリの基本バリデーション（ここで弾くのはフォーム不備のみ。
  // 内容そのものの適否はブロックしない）
  const formErrors: string[] = [];
  if (!title) formErrors.push("タイトルを入力してください");
  if (!bodyHtml) formErrors.push("本文を入力してください");
  if (!isCategorySlug(categorySlug)) formErrors.push("カテゴリを選択してください");
  if (!displayName) formErrors.push("発信元（表示名）を入力してください");
  if (!contactEmail) formErrors.push("連絡先メールアドレスを入力してください");
  if (formErrors.length > 0) {
    return NextResponse.json({ error: formErrors.join(" / ") }, { status: 400 });
  }

  const bodyText = bodyHtml.replace(/<[^>]+>/g, " ");
  const review = reviewArticle({
    title,
    bodyHtml,
    bodyText,
    linkCount: links.length,
    isSponsored: false,
    contactOrg,
    contactEmail,
  });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    // Supabase未接続（開発中・キー未設定）の場合はここで止める。
    return NextResponse.json(
      { error: "現在、投稿の受付は準備中です。しばらくしてから再度お試しください。" },
      { status: 503 }
    );
  }

  const { data: article, error: insertError } = await supabase
    .from("articles")
    .insert({
      display_name: displayName,
      category_slug: categorySlug,
      title,
      body_html: bodyHtml,
      excerpt,
      status: "published",
      source: "user",
      is_sponsored: false,
      contact_org: contactOrg,
      contact_email: contactEmail,
      contact_tel: contactTel,
      contact_url: contactUrl,
      contact_public: contactPublic,
    })
    .select("id, edit_token")
    .single();

  if (insertError || !article) {
    return NextResponse.json(
      { error: "投稿の保存に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }

  if (links.length > 0) {
    await supabase.from("article_links").insert(
      links.map((l) => ({
        article_id: article.id,
        url: l.url,
        anchor_text: l.anchorText ?? null,
        placement: "outline",
        rel: "nofollow",
      }))
    );
  }

  // 審査結果は事後確認用として記録するのみ。失敗しても投稿の公開には影響させない。
  await supabase.from("review_logs").insert({
    article_id: article.id,
    verdict: review.verdict,
    violations: review.violations,
    summary: review.summary,
    rule_version: review.ruleVersion,
  });

  return NextResponse.json({
    id: article.id,
    editToken: article.edit_token,
    message: "投稿を受け付けました。すでに公開されています。",
  });
}
