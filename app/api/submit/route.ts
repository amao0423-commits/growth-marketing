import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCategorySlug } from "@/lib/categories";
import { reviewArticle } from "@/lib/review";

export const runtime = "nodejs";

// 投稿にはログイン（Google）と編集部権限が必要。編集部ユーザーの投稿は、
// 審査を待たずに即座に articles へ status='published' でINSERTされる。
// ルールベース審査は非同期・非ブロッキングで実行し、結果を review_logs に
// 記録するのみ（flagged でも公開は継続する）。
// 不適切と判断した場合の削除は編集部が事後に行う（利用規約 第9条）。
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "投稿にはログインが必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, is_editorial")
    .eq("id", user.id)
    .single();

  if (!profile?.is_editorial) {
    return NextResponse.json({ error: "現在、記事の投稿は編集部アカウントに限定しています。" }, { status: 403 });
  }

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
  const contactOrg = String(input.contactOrg ?? profile?.display_name ?? "").trim();
  const contactEmail = String(input.contactEmail ?? profile?.email ?? user.email ?? "").trim();
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
  if (!contactOrg) formErrors.push("発信元（表示名）を入力してください");
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

  // 挿入自体はRLS（articles_insert: author_id = auth.uid()）に従うログインユーザーの
  // クライアントで行う。review_logs・article_linksの書き込みは編集部専用ポリシーのため
  // service role（admin client）を使う。
  const { data: article, error: insertError } = await supabase
    .from("articles")
    .insert({
      author_id: user.id,
      category_slug: categorySlug,
      title,
      body_html: bodyHtml,
      excerpt,
      status: "published",
      source: "editorial",
      contact_org: contactOrg,
      contact_email: contactEmail,
      contact_tel: contactTel,
      contact_url: contactUrl,
      contact_public: contactPublic,
    })
    .select("id")
    .single();

  if (insertError || !article) {
    return NextResponse.json(
      { error: "投稿の保存に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // service role未設定でも、記事自体はすでに公開済みなのでここは握りつぶす。
    return NextResponse.json({ id: article.id, message: "投稿を受け付けました。すでに公開されています。" });
  }

  if (links.length > 0) {
    await admin.from("article_links").insert(
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
  await admin.from("review_logs").insert({
    article_id: article.id,
    verdict: review.verdict,
    violations: review.violations,
    summary: review.summary,
    rule_version: review.ruleVersion,
  });

  return NextResponse.json({
    id: article.id,
    message: "投稿を受け付けました。すでに公開されています。",
  });
}
