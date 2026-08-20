// 既存37記事（legacy-static/blog/*.html）を、アドプレスの articles テーブルへ
// 「編集部」投稿として移行するスクリプト。
//
// 実行: npm run migrate:legacy
//
// 元記事はマーケティング会社（Growth Marketing）のブログ記事のため、
// アドプレスのプレスリリース形式とは性質が異なるが、本文の構造
// （.wrap.article-body 以下の見出し・段落・目次・著者ボックス等）は
// app/globals.css の .article-body 系スタイルとそのまま互換性がある。
//
// 移行後の記事は：
//   - source = 'legacy'（"編集部" 名義。一般ユーザー投稿ではない）
//   - status = 'published'（審査を経ず、そのまま公開扱い）
//   - author_id = 「アドプレス編集部」の編集部プロフィール（is_editorial=true）
//   - legacy_path = 元のファイル名（重複移行防止のユニークキーとしても使う）
//   - category_slug はファイル名から下記ルールで機械的に振り分け（要目視確認）

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ---------- .env.local を簡易ロード（Next.jsの外で実行するため） ----------
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に見つかりません。");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BLOG_DIR = path.join(process.cwd(), "legacy-static/blog");
const EDITORIAL_EMAIL = "editorial@nishinippon-adv.jp";
const EDITORIAL_DISPLAY_NAME = "アドプレス編集部";

// ---------- カテゴリ振り分けルール（ファイル名の接頭辞・キーワードで判定） ----------
// アドプレスの8カテゴリ（kpop/korea/ent/tech/sns/life/trip/biz）に、
// 元がSNS運用・広告運用の会社ブログであることを踏まえて振り分ける。
// 大半は「SNS・マーケ」に該当し、ブランディング系は「ビジネス」、
// AIツール活用のみ「IT・テック」とする。
function pickCategory(filename: string): string {
  if (filename.startsWith("brand-")) return "biz";
  if (filename === "content-ai-workflow.html") return "tech";
  return "sns";
}

type ParsedArticle = {
  legacyPath: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  publishedAt: string;
  categorySlug: string;
};

function extractBetween(html: string, startMarker: string, endMarkers: string[]): string | null {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;
  const from = startIdx + startMarker.length;
  let endIdx = html.length;
  for (const marker of endMarkers) {
    const idx = html.indexOf(marker, from);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  return html.slice(from, endIdx).trim();
}

function parseArticle(filename: string): ParsedArticle | null {
  const filePath = path.join(BLOG_DIR, filename);
  const html = fs.readFileSync(filePath, "utf-8");

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : null;
  if (!title) {
    console.warn(`[skip] ${filename}: <h1> が見つかりません`);
    return null;
  }

  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  const excerpt = descMatch ? descMatch[1].trim() : null;

  // article-meta 内の最初の日付表記（例 2026.06.11）を published_at として使う
  const dateMatch = html.match(/<div class="article-meta">[\s\S]*?<span>([\d.]{8,10})<\/span>/);
  let publishedAt = new Date().toISOString();
  if (dateMatch) {
    const [y, m, d] = dateMatch[1].split(".").map(Number);
    if (y && m && d) {
      // JSTの正午として扱う（時刻情報が元データに無いため）
      publishedAt = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString();
    }
  }

  // 本文は .wrap.article-body の中身。末尾の「関連記事」ブロックは
  // 新テンプレート側で動的に生成するため除外する。
  const body = extractBetween(html, '<div class="wrap article-body">', [
    '<div class="related">',
    "</article>",
  ]);
  if (!body) {
    console.warn(`[skip] ${filename}: 本文（.wrap.article-body）が見つかりません`);
    return null;
  }

  return {
    legacyPath: filename,
    title,
    excerpt,
    bodyHtml: body,
    publishedAt,
    categorySlug: pickCategory(filename),
  };
}

async function ensureEditorialProfile(): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_editorial", true)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  // 編集部用のauth.usersアカウントを作成（ログインには使わない、system用）
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: EDITORIAL_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { full_name: EDITORIAL_DISPLAY_NAME },
  });
  if (createErr || !created.user) {
    throw new Error(`編集部アカウントの作成に失敗しました: ${createErr?.message}`);
  }

  // handle_new_user トリガーがprofilesを自動作成するので、is_editorial等を更新する
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ display_name: EDITORIAL_DISPLAY_NAME, is_editorial: true, email: EDITORIAL_EMAIL })
    .eq("id", created.user.id);
  if (updateErr) throw new Error(`編集部プロフィールの更新に失敗しました: ${updateErr.message}`);

  return created.user.id;
}

async function main() {
  // カンマ区切りで除外したいファイル名を渡せる（同一トピックが既に別記事として
  // 公開済みの場合の重複回避など）。例: SKIP_FILES=brand-employee-advocacy.html
  const skipFiles = new Set(
    (process.env.SKIP_FILES || "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".html") && f !== "index.html" && !skipFiles.has(f))
    .sort();
  if (skipFiles.size > 0) console.log(`除外指定: ${[...skipFiles].join(", ")}`);

  console.log(`対象ファイル: ${files.length}件`);

  const editorialId = await ensureEditorialProfile();
  console.log(`編集部プロフィール: ${editorialId}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const parsed = parseArticle(filename);
    if (!parsed) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("legacy_path", parsed.legacyPath)
      .maybeSingle();
    if (existing) {
      console.log(`[既存] ${filename} → articles.id=${existing.id}（スキップ）`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        author_id: editorialId,
        category_slug: parsed.categorySlug,
        title: parsed.title,
        body_html: parsed.bodyHtml,
        excerpt: parsed.excerpt,
        status: "published",
        source: "legacy",
        is_sponsored: false,
        legacy_path: parsed.legacyPath,
        contact_org: EDITORIAL_DISPLAY_NAME,
        contact_email: EDITORIAL_EMAIL,
        contact_public: false,
        published_at: parsed.publishedAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`[失敗] ${filename}: ${error?.message}`);
      failed++;
      continue;
    }

    console.log(`[登録] ${filename} → /news/${data.id}/ (${parsed.categorySlug})`);
    inserted++;
  }

  console.log(`\n完了: 登録${inserted}件 / スキップ${skipped}件 / 失敗${failed}件`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
