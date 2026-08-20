// design-ref/article.html には記事末尾の固定CTA帯が存在しないため、
// cleanup-legacy-links.mjs で .ap-cta に変換した旧cta-band要素を完全に削除する。
//
// 実行: node scripts/strip-cta-band.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env.mjs";

loadEnvLocal();
const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function strip(html) {
  // cleanup-legacy-links.mjs が生成した形: <div class="ap-cta">...</div>
  const re = /<div class="ap-cta">[\s\S]*?<\/div>\s*/g;
  return html.replace(re, "");
}

async function main() {
  const { data: articles, error } = await supabase.from("articles").select("id, body_html").ilike("body_html", "%ap-cta%");
  if (error) throw new Error(error.message);

  console.log(`対象: ${articles.length}件${DRY_RUN ? "（--dry-run）" : ""}`);
  let updated = 0;
  for (const a of articles) {
    const html = strip(a.body_html);
    if (html === a.body_html) continue;
    console.log(`[${a.id}] ap-cta帯を削除`);
    if (!DRY_RUN) {
      const { error: updErr } = await supabase.from("articles").update({ body_html: html }).eq("id", a.id);
      if (updErr) console.error(`  → 失敗: ${updErr.message}`);
    }
    updated++;
  }
  console.log(`完了: ${updated}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
