// 既存37記事移行（migrate-legacy-articles.ts）で持ち込まれた、旧サイト（Growth
// Marketing / 静的HTML）前提のリンク・表記をアドプレス向けに修正する一括処理。
//
// 対応内容（すべて articles.body_html を直接UPDATEする）:
//   1. 実在しない監修者「早川 葵（SEO歴5年）」の記述を削除する
//      （23記事。ユーザー確認済み：ADPRESSに実在する監修者ではない）
//   2. 本文中盤・末尾のCTAリンク ../contact.html → COCOマーケの無料相談
//      (https://www.cocomarke.com/contact/) に張り替える（新パイプラインと同じ方針）
//   3. 編集方針リンク ../editorial-policy.html → /editorial-policy/（絶対パス）に修正
//   4. 旧サイト内の記事間リンク（例 ads-lp-cvr.html）→ /news/{id}/ に張り替える
//      （legacy_path→id のマップを articles テーブルから作成）
//   5. 末尾の固定CTA帯（.cta-band / .btn.btn-primary、globals.cssに定義が無く
//      未スタイルで表示されていた）を、既存の .ap-cta / .ap-cta-btn に置き換える
//
// 「Growth Marketing」というブランド名自体の本文中の言及（独自視点・実務ケース等の
// 地の文）は今回は対象外。事務的なリンク修正・監修者名の削除にとどめ、内容の
// 大規模な書き換えは行わない（別途判断が必要なため）。
//
// 実行: node scripts/cleanup-legacy-links.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env.mjs";

loadEnvLocal();

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CONSULT_URL = "https://www.cocomarke.com/contact/";

function cleanupBody(html, slugToId) {
  let out = html;
  const notes = [];

  // 1. 監修者「早川 葵」の記述を削除
  const beforeSupervisor = out;
  out = out.replace(
    /整理し、SEO歴5年の(?:<strong>)?早川\s*葵(?:<\/strong>)?が監修しています。/g,
    "整理しています。"
  );
  out = out.replace(
    /本記事は<strong>SEO歴5年の早川\s*葵<\/strong>が監修し、/g,
    "本記事はアドプレス編集部が、"
  );
  // 上記2パターンに当てはまらない残存表記の保険（手動確認用に検出だけする）
  if (/早川/.test(out)) notes.push("要手動確認: 「早川」の記述が変換後も残存");
  if (out !== beforeSupervisor) notes.push("監修者表記を削除");

  // 2. 固定CTA帯（.cta-band）を .ap-cta に置換
  const ctaBandRe = /<div class="cta-band[^"]*"[^>]*>\s*<span class="eyebrow"[^>]*>[^<]*<\/span>\s*<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<a href="\.\.\/contact\.html" class="btn btn-primary">([\s\S]*?)<span class="arrow">→<\/span><\/a>\s*<\/div>/g;
  const beforeCta = out;
  out = out.replace(
    ctaBandRe,
    (_m, h2, p, btnText) =>
      `<div class="ap-cta">\n<h2>${h2}</h2>\n<p>${p}</p>\n<a href="${CONSULT_URL}" class="ap-cta-btn" target="_blank" rel="noopener">${btnText.trim()} →</a>\n</div>`
  );
  if (out !== beforeCta) notes.push("固定CTA帯を.ap-ctaへ置換");

  // 3. 残りの ../contact.html（本文中盤の自然なCTAリンクなど）
  const beforeContact = out;
  out = out.replace(
    /<a href="\.\.\/contact\.html"(\s+class="[^"]*")?>/g,
    `<a href="${CONSULT_URL}" target="_blank" rel="noopener">`
  );
  if (out !== beforeContact) notes.push("../contact.html を COCOマーケへ張り替え");

  // 4. 編集方針リンク
  const beforePolicy = out;
  out = out.replace(/<a href="\.\.\/editorial-policy\.html">/g, '<a href="/editorial-policy/">');
  if (out !== beforePolicy) notes.push("編集方針リンクを絶対パス化");

  // 5. 旧サイト内の記事間リンク（slug.html → /news/{id}/）
  let internalFixed = 0;
  out = out.replace(/<a href="([a-z0-9-]+\.html)">/g, (m, file) => {
    const id = slugToId.get(file);
    if (!id) return m; // マップに無いものはそのまま（要手動確認）
    internalFixed++;
    return `<a href="/news/${id}/">`;
  });
  if (internalFixed > 0) notes.push(`内部リンク${internalFixed}件を/news/{id}/へ張り替え`);

  return { html: out, changed: out !== html, notes };
}

async function main() {
  const { data: legacyArticles, error } = await supabase
    .from("articles")
    .select("id, legacy_path, body_html")
    .eq("source", "legacy");
  if (error) throw new Error(`記事取得に失敗: ${error.message}`);

  const slugToId = new Map(
    legacyArticles.filter((a) => a.legacy_path).map((a) => [a.legacy_path, a.id])
  );
  console.log(`対象記事: ${legacyArticles.length}件${DRY_RUN ? "（--dry-run: 書き込みなし）" : ""}`);

  let updated = 0;
  for (const article of legacyArticles) {
    const { html, changed, notes } = cleanupBody(article.body_html, slugToId);
    if (!changed) continue;

    console.log(`[${article.id}] ${article.legacy_path}: ${notes.join(" / ")}`);
    if (!DRY_RUN) {
      const { error: updErr } = await supabase
        .from("articles")
        .update({ body_html: html })
        .eq("id", article.id);
      if (updErr) {
        console.error(`  → 更新失敗: ${updErr.message}`);
        continue;
      }
    }
    updated++;
  }

  console.log(`\n完了: ${updated}/${legacyArticles.length}件を更新${DRY_RUN ? "予定" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
