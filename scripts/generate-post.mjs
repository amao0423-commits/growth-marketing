// アドプレス編集部記事の自動生成パイプライン（週3回 / GitHub Actions cron）
// 1) トピック選定 → 2) Web検索でトレンド/一次情報を収集 → 3) 構造化出力で記事生成
// → 4) 品質ゲート → 5) Supabase articles テーブルへ直接INSERT（編集部記事として即時公開）
//
// legacy-static/scripts/generate-post.mjs（旧Growth Marketing静的サイト向け）からの移植版。
// 変更点:
//   - 出力先: 静的HTMLファイル書き込み → Supabase articles への INSERT
//   - 著者表記: 「Growth Marketing編集部」→「アドプレス編集部」
//   - 監修者表記: 「早川 葵（SEO歴5年）」は実在の監修者ではないため廃止。個人名を名乗らない。
//   - 編集方針リンク: ../editorial-policy.html → /editorial-policy/（絶対パス）
//   - 本文中盤CTA: 自サイト無料相談(../contact.html) → COCOマーケの無料相談
//     (https://www.cocomarke.com/contact/)。ADPRESS自体はマーケ支援を提供しないため。
//   - 内部リンク候補: 旧 content/posts.json（静的サイトの記事台帳）→ Supabase から
//     直近の公開記事を取得して代替
//
// 認証/課金: Claude Code のサブスク（Maxプラン）で実行する。
//   CLAUDE_CODE_OAUTH_TOKEN を環境に設定し、内部で `claude -p`（ヘッドレス）を呼び出す。
// 任意: POST_MODEL（未指定なら claude-sonnet-4-6）, MAX_RETRIES（既定 4）, CLAUDE_BIN（既定 claude）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { fetchCocomarkeArticles, isLinkAlive } from "./lib/cocomarke.mjs";
import { loadEnvLocal } from "./lib/env.mjs";

loadEnvLocal();

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "https://www.nishinippon-adv.jp";
const EDITORIAL_POLICY_URL = "/editorial-policy/";
const CONSULT_URL = "https://www.cocomarke.com/contact/"; // ADPRESS自体は相談窓口を持たないため、COCOマーケへ誘導
const EDITORIAL_EMAIL = "editorial@nishinippon-adv.jp";
const EDITORIAL_DISPLAY_NAME = "アドプレス編集部";

const MODEL = process.env.POST_MODEL || "claude-sonnet-4-6";
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 4);
const ENABLE_RESEARCH = process.env.ENABLE_RESEARCH === "1";
const MIN_TEXT_CHARS = Number(process.env.MIN_TEXT_CHARS || 3000);
const WRITE_ATTEMPTS = Number(process.env.WRITE_ATTEMPTS || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (attempt) => Math.min(60000, 5000 * 2 ** attempt);

// GM時代のトピックカテゴリ（content/topics.json）→ アドプレスの記事カテゴリ
// 元がSNS/広告運用会社のブログのため、ブランディング以外は概ね「SNS・マーケ」に収まる。
const CATEGORY_MAP = { sns: "sns", ads: "sns", seo: "sns", content: "sns", brand: "biz" };
const GM_CATEGORY_LABELS = {
  sns: "SNS運用",
  ads: "広告運用",
  seo: "SEO",
  content: "コンテンツマーケティング",
  brand: "ブランディング",
};

const AUTH_DOMAINS = [
  "developers.google.com", "support.google.com", "business.google.com", "blog.google",
  "business.instagram.com", "help.instagram.com", "about.instagram.com",
  "business.facebook.com", "developers.facebook.com", "www.facebook.com",
  "www.tiktok.com", "ads.tiktok.com", "business.tiktok.com",
  "business.x.com", "help.x.com", "thinkwithgoogle.com",
  "www.soumu.go.jp", "www.meti.go.jp", "www.caa.go.jp",
];

const FALLBACK_SOURCE_URLS = {
  sns: [
    "https://business.instagram.com/",
    "https://help.instagram.com/",
    "https://www.tiktok.com/business/en",
    "https://business.x.com/",
  ],
  ads: [
    "https://www.facebook.com/business/ads",
    "https://www.facebook.com/business/help",
    "https://ads.tiktok.com/",
    "https://business.google.com/",
  ],
  seo: [
    "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
    "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    "https://developers.google.com/search/docs",
  ],
  content: [
    "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    "https://www.thinkwithgoogle.com/",
    "https://business.instagram.com/",
  ],
  brand: [
    "https://www.thinkwithgoogle.com/",
    "https://business.instagram.com/",
    "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  ],
  common: [
    "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    "https://www.thinkwithgoogle.com/",
  ],
};

function runClaude(args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, MAX_THINKING_TOKENS: process.env.MAX_THINKING_TOKENS ?? "0", DISABLE_NON_ESSENTIAL_MODEL_CALLS: "1" };
    const child = spawn(CLAUDE_BIN, args, { stdio: ["pipe", "pipe", "pipe"], env });
    let out = "", err = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`claude タイムアウト (${Math.round(timeoutMs / 1000)}s)。stderr: ${err.slice(0, 300)}`));
      resolve({ stdout: out, stderr: err, code });
    });
    child.stdin.on("error", () => {});
    child.stdin.write(input);
    child.stdin.end();
  });
}

async function claudeText(prompt, opts = {}) {
  const args = ["-p", "--output-format", "json", "--dangerously-skip-permissions"];
  if (MODEL) args.push("--model", MODEL);
  args.push("--max-turns", String(opts.maxTurns ?? (opts.webTools ? 8 : 6)));
  if (opts.webTools) {
    args.push("--allowedTools", "WebSearch,WebFetch");
  } else {
    args.push("--tools", "");
  }
  const writeMin = Number(process.env.WRITE_TIMEOUT_MIN || 6);
  const researchMin = Number(process.env.RESEARCH_TIMEOUT_MIN || 9);
  const timeoutMs = (opts.webTools ? researchMin : writeMin) * 60 * 1000;
  const { stdout, stderr, code } = await runClaude(args, prompt, timeoutMs);
  if (code !== 0) {
    let detail = String(stderr || "").trim();
    try { const env = JSON.parse(stdout); if (env?.result) detail = String(env.result); } catch {}
    if (!detail) detail = String(stdout || "").trim();
    throw new Error(`claude -p 失敗 (exit ${code}): ${detail.slice(0, 600)}`);
  }
  let envelope;
  try { envelope = JSON.parse(stdout); } catch { return String(stdout).trim(); }
  if (envelope && envelope.is_error) {
    throw new Error("claude -p error: " + String(envelope.result || JSON.stringify(envelope)).slice(0, 600));
  }
  return String(envelope?.result ?? stdout).trim();
}

function extractJsonObject(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const writeJson = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o, null, 2) + "\n");

function jstDate() {
  const override = (process.env.POST_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return { iso: override, display: override.replace(/-/g, ".") };
  }
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), day = String(d.getUTCDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${day}`, display: `${y}.${m}.${day}` };
}

function hostOf(url) { try { return new URL(url).host; } catch { return ""; } }
function isAuthoritative(url) {
  const h = hostOf(url);
  return AUTH_DOMAINS.some((d) => h === d || h.endsWith("." + d));
}

function extractHrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function cleanUrl(url) { return String(url || "").replace(/[)\].,、。]+$/g, ""); }
function extractUrls(text) { return unique([...String(text || "").matchAll(/https?:\/\/[^\s<>"']+/g)].map((m) => cleanUrl(m[0]))); }

async function aliveAuthoritativeUrls(urls, limit = 8) {
  const out = [];
  for (const url of unique(urls)) {
    if (!isAuthoritative(url)) continue;
    if (await isLinkAlive(url, { lenient: true })) out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

async function buildSourceLinks(findings, category) {
  const fromResearch = await aliveAuthoritativeUrls(extractUrls(findings), 8);
  const fallbackPool = [...(FALLBACK_SOURCE_URLS[category] || []), ...FALLBACK_SOURCE_URLS.common];
  const fallback = fromResearch.length >= 3 ? [] : await aliveAuthoritativeUrls(fallbackPool, 4);
  return unique([...fromResearch, ...fallback]).slice(0, 8);
}

function scoreCocomarkeArticle(article, idea) {
  const haystack = `${article.slug} ${article.keywords.join(" ")}`.toLowerCase();
  const words = `${idea.primaryKeyword} ${idea.intent}`.toLowerCase()
    .split(/[\s　、。・/（）()]+/)
    .filter((w) => w.length >= 2);
  let score = 0;
  for (const word of words) if (haystack.includes(word)) score += 3;
  for (const keyword of article.keywords) {
    if (idea.intent.includes(keyword) || idea.primaryKeyword.includes(keyword)) score += 2;
  }
  return score;
}

function pickCocomarkeCandidates(cocomarke, idea, limit = 40) {
  return [...cocomarke]
    .map((article, idx) => ({ article, idx, score: scoreCocomarkeArticle(article, idea) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, limit)
    .map((x) => x.article);
}

function keywordCovered(primaryKeyword, ...texts) {
  const haystack = texts.join(" ");
  const terms = String(primaryKeyword || "").split(/[\s　]+/).filter(Boolean);
  return terms.length > 0 && terms.every((term) => haystack.includes(term));
}

function stripTags(html) { return String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, ""); }
function titleHasSearchIntent(title) {
  return /とは|設定|方法|手順|改善|変更|原因|比較|注意|目安|やり方|違い|攻略|事例/.test(title || "");
}

function enforceExternalAttrs(html) {
  return html.replace(/<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/g, (full, href, rest) => {
    if (hostOf(href) === hostOf(BASE_URL)) return full;
    let attrs = rest;
    if (!/target=/.test(attrs)) attrs += ' target="_blank"';
    if (!/rel=/.test(attrs)) attrs += ' rel="noopener"';
    return `<a href="${href}"${attrs}>`;
  });
}

function pickTopic(topics) {
  const order = topics.categoryRotation;
  const used = new Set(topics.usedTopicIds);
  const n = order.length;
  for (let i = 0; i < n; i++) {
    const idx = (topics.nextRotationIndex + i) % n;
    const cat = order[idx];
    const idea = topics.clusters[cat].ideas.find((x) => !used.has(x.id));
    if (idea) return { category: cat, idea, chosenIndex: idx };
  }
  return null;
}

// --- Step A: Web検索でトレンド/一次情報を収集 ---
async function research(idea, catLabel) {
  const prompt = `あなたはマーケティング領域の調査担当です。Web検索ツールを使い、次のテーマについて
2026年時点の最新動向・検索上位で語られている論点・一次情報を調べてください。

テーマ: ${idea.intent}
主要キーワード: ${idea.primaryKeyword}
カテゴリ: ${catLabel}

必ず複数回検索し、検索上位ページと公式/一次情報を確認してください。
調査結果は、日本語で次の形式に整理してください。

1. 2026年の最新トレンド・変化点
- 具体的な変化点を3〜5個
- いつ頃から話題になっているか
- 実務者が対応すべきこと

2. 検索ユーザーの主要な検索意図
- 読者が知りたいこと
- 読者が困っていること
- 読者が最終的にしたいこと
- 記事を読んだ後に取るべき行動

3. 検索上位でよく扱われている論点
H2見出しになりそうな論点を5〜7個挙げてください。
各論点について、なぜ検索意図に合うのかを1行で説明してください。

4. 上位記事に不足しがちな独自性の余地
アドプレス編集部の記事で差別化できる切り口を3〜5個挙げてください。
例:
- 実務チェックリスト
- 原因別の改善策
- KPIの見方
- 失敗例
- CTAやCVへのつなげ方
- 企業アカウント運用での注意点
- 管理画面で確認すべき設定項目
- 業種別の設計例
- 導入前後で見るべき評価指標

5. 競合記事との差分
検索上位記事にありがちな不足を3〜5個挙げてください。
次の観点を必ず確認してください。
- タイトルに検索語が十分入っているか
- 設定手順が管理画面レベルまで具体的か
- 実務例・業種別例があるか
- 編集方針・更新日・出典が明記されているか
- 古い仕様や名称変更への対応があるか

6. FAQ候補
自然検索されやすい質問を6〜10個挙げてください。
質問は「とは」「違い」「原因」「やり方」「目安」「注意点」「できない場合」を優先してください。

7. 引用・出典に使える公式/一次情報URL
Google検索セントラル、Meta/Instagram、TikTok、総務省など公式情報のみを挙げてください。
各URLについて、次を1行で整理してください。
- URL
- 情報の内容
- 記事内で使うべき文脈

注意:
- URLは実在し、テーマに直接関連するものだけを挙げる
- 公式ではないブログや二次情報は出典候補に含めない
- 不確かな数値やベンチマークは「経験則」「目安」として扱う`;

  return (await claudeText(prompt, { webTools: true })).trim();
}

const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    searchIntent: { type: "string" },
    h1: { type: "string" },
    cardDescription: { type: "string" },
    readMinutes: { type: "integer" },
    authorProfileHtml: { type: "string" },
    keyTakeaways: { type: "array", items: { type: "string" } },
    expertiseNoteHtml: { type: "string" },
    originalInsights: { type: "array", items: { type: "string" } },
    practicalExamples: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { title: { type: "string" }, html: { type: "string" } },
        required: ["title", "html"],
      },
    },
    leadParagraphHtml: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { id: { type: "string" }, heading: { type: "string" }, html: { type: "string" } },
        required: ["id", "heading", "html"],
      },
    },
    conclusionHtml: { type: "string" },
    updateHistory: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { date: { type: "string" }, detail: { type: "string" } },
        required: ["date", "detail"],
      },
    },
    referencesUsed: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { label: { type: "string" }, url: { type: "string" }, accessedDate: { type: "string" } },
        required: ["label", "url", "accessedDate"],
      },
    },
    faq: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { question: { type: "string" }, answerHtml: { type: "string" } },
        required: ["question", "answerHtml"],
      },
    },
    cocomarkeLinksUsed: { type: "array", items: { type: "string" } },
    backlinksUsed: { type: "array", items: { type: "string" } },
    relatedArticleIdsUsed: { type: "array", items: { type: "string" } },
  },
  required: ["metaTitle", "metaDescription", "keywords", "searchIntent", "h1", "cardDescription", "readMinutes",
    "authorProfileHtml", "keyTakeaways", "expertiseNoteHtml", "originalInsights", "practicalExamples", "leadParagraphHtml", "sections",
    "conclusionHtml", "updateHistory", "referencesUsed", "faq", "cocomarkeLinksUsed", "backlinksUsed", "relatedArticleIdsUsed"],
};

// --- Step B: 構造化出力で記事を生成 ---
async function writeArticle(idea, catLabel, findings, cocomarke, adpressCandidates, sourceLinks, feedback) {
  const briefFindings = String(findings || "").slice(0, 8000)
    || "（外部調査は省略。2026年時点のベストプラクティスを、あなたの知識から正確かつ具体的に記述してください。最新の固有数値は断定せず「目安」として扱う。）";
  const cocoList = cocomarke.slice(0, 20).map((c) => `- ${c.url} （関連語: ${c.keywords.join("、")}）`).join("\n");
  const adpressList = adpressCandidates.map((p) => `- /news/${p.id}/ ：${p.title}`).join("\n");
  const sourceList = sourceLinks.map((u) => `- ${u}`).join("\n");

  const prompt = `あなたはSEO・GEO・CV改善に精通した「アドプレス」編集部の編集者です。
アドプレスは、企業・団体・個人が無料でプレスリリースを掲載できるメディアです。
下記の調査結果をもとに、検索流入と生成AIでの引用につながる、SNS運用・広告運用・
コンテンツマーケティング領域の高品質な日本語ブログ記事を作成してください。

読者の検索意図を満たし、独自の視点と実務的な具体性を備えた、オリジナルで有用な記事にしてください。

# テーマ
${idea.intent}

主要キーワード:
${idea.primaryKeyword}

カテゴリ:
${catLabel}

# 調査結果（最新トレンド・一次情報）
${briefFindings}

# 相互リンク候補（cocomarke.com の記事）
本文の文脈に自然に合うものを1〜3本、自然なアンカーテキストで
<a href="URL">語句</a> として本文中に挿入してください。
リストにあるURLのみ使用してください。

${cocoList}

# 使用可能な公式出典URL
本文にはこの中から2〜4本のみ使用してください。
存在しないURLやリスト外URLは絶対に作らないでください。

${sourceList}

# アドプレス内の関連記事候補
relatedArticleIdsUsed に、実際に本文中でリンクした記事のパス（例 "/news/12/"）を入れてください。
さらに【必須】本文中にも、このリストから1〜3本を文脈に合う自然なアンカーテキストで
<a href="/news/ID/">語句</a> の形（パスはリストの値そのまま）で挿入してください。
リストにあるパスのみ使用し、存在しないIDやURLは作らないでください。

${adpressList}

# 執筆要件

- 本文合計はおおむね3500〜5000字
- 薄い一般論ではなく、判断基準・手順・失敗例・改善指標まで具体化する
- searchIntent には、読者が解決したい課題を1文で要約する
- metaTitle は32〜55字目安で、主要キーワードを前方に入れる
- metaTitle は抽象タイトルにしない。検索需要がある語を2〜4個自然に含める
  例: 「とは」「設定方法」「改善」「変更点」「手順」「原因」「比較」「注意点」
- 可能なら「〇〇とは？△△との違い・手順・効果を解説」のように、疑問形＋要素列挙の型にすると検索CTRが上がりやすい
- h1 はmetaTitleと近い検索語を含めつつ、読者の課題解決が分かるタイトルにする
- metaDescription は110〜130字で、主要キーワード・読者の悩み・記事で分かることを自然に含める
- keywords は5語前後
- cardDescription は一覧カード用に60字前後

# 必須構成

記事は以下の順で構成してください。

1. 導入 leadParagraphHtml
2. 著者プロフィール authorProfileHtml
3. 重要ポイント keyTakeaways 4〜5個
4. 編集・検証方針 expertiseNoteHtml
5. 独自視点 originalInsights 3〜5個
6. 実務ケース practicalExamples 2〜3個
7. 本文セクション sections 6〜8個
8. 更新履歴 updateHistory
9. 参照資料 referencesUsed
10. FAQ faq 5〜8個
11. まとめ conclusionHtml

# 導入 leadParagraphHtml の必須条件

導入の冒頭200字以内に、必ず自然な定義文を入れてください。

例:
「〇〇とは、△△のことです。」

導入では以下を必ず含めてください。

- 主要キーワードを自然に含める
- 読者の悩みを明確にする
- 記事の結論を先に示す
- 読後に何ができるようになるかを示す

# keyTakeaways の必須条件

keyTakeaways は4〜5個にしてください。
各項目は、記事の要点が単体で分かる文章にしてください。

含める観点:
- 定義
- 重要性
- 具体的な改善方法
- 注意点
- 次に取るべき行動

# authorProfileHtml の必須条件

authorProfileHtml は記事上部に表示する著者プロフィールです。
必ず以下を含めてください。

- 著者名は「アドプレス編集部」
- SNS運用・広告運用・コンテンツSEOに関する記事を制作している編集部であること
- 記事制作時に公式情報、管理画面で確認すべき項目、KPI、内部導線を確認すること
- 編集方針ページへのリンク: <a href="${EDITORIAL_POLICY_URL}">編集方針</a>

重要:
- 個人名の監修者は記載しないでください（実在の監修者を立てていません）
- 広告運用額、改善率、実案件実績は、確認可能な根拠がない限り書かないでください

# sections の必須条件

sections は6〜8個作成してください。
各 heading は検索意図に沿うH2見出しにしてください。
id は英小文字とハイフンのユニークなアンカーにしてください。

本文の各 section.html では、必要に応じて以下を使用してください。

- <p>
- <h3>小見出し</h3>
- <ul><li>
- <ol><li>
- <strong>
- <blockquote>
- <table><thead><tbody><tr><th><td>
- <div class="callout"><p>要点</p></div>

h1/h2タグ、style属性、画像タグは使わないでください。

# sections に必ず含める内容

本文セクション全体で、以下を必ず含めてください。

1. 主要概念の定義
2. 関連概念との違いを整理する比較表
3. なぜ重要なのか
4. 具体的なやり方・手順
5. 原因別またはケース別の改善策
6. よくある失敗例
7. 実務で使えるチェックリスト
8. 改善指標・KPIの見方
9. アドプレス編集部としての実務的な解釈
10. 自然なCTA
11. 競合記事に不足しがちな独自の補足

# 管理画面・操作手順の条件

広告運用、SNS運用、SEOツール、分析ツール、管理画面を伴うテーマでは、
必ず「管理画面で確認する順番」または「設定画面で見る項目」を1セクションに入れてください。

画像やスクリーンショットは使えないため、存在しないキャプチャをあるように書かないでください。
代わりに、以下を文章・表・チェックリストで具体化してください。

- どの画面やメニューを見るか
- どの設定項目を確認するか
- 初期設定で間違えやすい項目
- 変更後にどの指標を見るか
- 変更してはいけないタイミング

# practicalExamples の条件

practicalExamples は2〜3個作成してください。
実案件の実績を捏造せず、「業種別の設計例」「よくある相談パターン」「仮想ケース」として書いてください。

各 practicalExamples.html では、以下を含めてください。
- 前提条件
- 推奨する設計
- 見るべきKPI
- 失敗しやすい点

公開可能な実績データがある場合のみ、数値事例を入れてください。
数値を入れる場合は、必ず以下をセットで書いてください。
- 対象ページまたは対象施策
- 比較期間
- 変更内容
- 指標名（CTR、CVR、CPA、ROAS、問い合わせ率など）
- 母数や注意点

公開可能な実績データがない場合は、改善率を捏造せず、
「数値を入れるならこのKPIを見る」という測定テンプレートとして書いてください。

# originalInsights の条件

originalInsights は3〜5個作成してください。
競合記事の要約ではなく、アドプレス編集部としての実務的な解釈・判断軸にしてください。

例:
- 自動化機能は「放置」ではなく、人間が設計すべき変数を減らす仕組みとして扱う
- ROASだけでなく、計測の健全性・学習進捗・クリエイティブ寿命を同時に見る
- 名称変更や仕様変更があるテーマでは、古い運用手順をそのまま使わない

# 比較表の条件

記事テーマに応じて、必ず1つ以上の比較表を入れてください。

例:
- 指標の違い
- 施策の違い
- 原因と対策
- メリット・デメリット
- 初心者と上級者の改善ポイント

# チェックリストの条件

実務者がそのまま使えるチェックリストを必ず1つ入れてください。
最低5項目以上にしてください。

# CTAの条件

本文中盤に、CTAを1箇所だけ自然に入れてください。

本文中盤CTA:
- 読者が課題を自覚したタイミングで、<div class="callout"><p>…<a href="${CONSULT_URL}">無料相談はこちら →</a></p></div> の形でCOCOマーケの無料相談へ自然につなげる（リンク先は必ず ${CONSULT_URL}）
- 記事テーマに合った相談オファー名（例「無料トピックマップ設計相談」「無料広告アカウント診断」など）を一言添える
- 過度に売り込まず、読者の次の行動として自然に提案する

重要:
- 記事末尾のCTAは書かないでください（まとめ conclusionHtml にCTAを入れない）。
  記事末尾には、システム側が「記事を投稿する」CTAを自動で付与します。
- conclusionHtml は要点の総括と次の一歩の提示にとどめ、CTAボタンや申し込み誘導の文は入れないでください。

# 内部リンク条件

相互リンク(cocomarke)を最低1本、公式出典リンクを最低2本、本文中に含めてください。
リンクは文脈上自然な位置に挿入してください。

公式出典リンクは、sourceListに含まれるURLのみ使用してください。
相互リンクは、cocoListに含まれるURLのみ使用してください。
存在しないURLやリスト外URLは絶対に作らないでください。

# FAQ条件

FAQは5〜8問作成してください。
質問は自然検索されやすい文にしてください。
回答は最初に結論を短く示し、その後で補足してください。

優先する質問:
- 〇〇とは何ですか？
- 〇〇と△△の違いは何ですか？
- 〇〇ができない原因は何ですか？
- 〇〇のやり方は？
- 〇〇の目安は？
- 〇〇でよくある失敗は？
- 〇〇を改善するには何から始めるべきですか？

# 編集・検証方針の条件

expertiseNoteHtml に、記事上部で表示できる編集・検証方針を書いてください。
80〜180字程度で、読者に専門性と信頼性が伝わる内容にしてください。
必ず <a href="${EDITORIAL_POLICY_URL}">編集方針</a> へのリンクを入れてください。

例:
「この記事は、公式情報・管理画面で確認すべき項目・実務で見るべきKPIをもとにアドプレス編集部が整理しています。」

重要:
- 個人名の監修者（実在しない人物）を作らないでください
- 広告運用額、改善率、実案件実績は捏造しないでください
- 事実として確認できない実績は書かないでください
- 「実案件で改善しました」のような断定は、根拠データがない限り禁止です
- 代わりに「実務で確認すべき観点」「よくある相談パターン」「仮想ケース」として独自性を出してください

# 更新履歴と参照資料の条件

updateHistory は1件以上作成してください。
初回公開時は「YYYY年M月D日：記事公開。公式情報を確認し、実務チェックリストとFAQを追加。」のように書いてください。

referencesUsed は2〜5件作成してください。
本文で使った公式出典URLのみを入れてください。
accessedDate は記事公開日と同じ日付にしてください。
本文中の公式リンク付近にも「参照日: YYYY年M月D日」を自然に入れてください。

# 出典・数値の扱い

- 公式が公表していない数値を断定しない
- 業界目安や経験則は「目安」「経験則」「自社で検証する前提」と表現する
- 公式出典の要約だけで終わらせず、実務上どう解釈すべきかを書く
- 2026年時点の最新動向として書くが、将来の不確かな仕様変更は断定しない
- 「◯%改善」「運用額◯万円」などの実績数値は、確認可能な根拠がある場合だけ使う
- Google公式の見解は断定しすぎず、「公式説明では〜とされている」「〜として捉えるのが安全」のように慎重に表現する

# Helpful Content条件

GoogleのHelpful Contentの考え方に沿い、検索順位だけを狙う文章ではなく、
実務者が読み終えて次の行動を決められる内容にしてください。

特に以下を避けてください。

- どの記事にも当てはまる一般論
- 根拠のない断定
- 具体例のない抽象論
- 出典の要約だけの記事
- CTAが唐突な記事
- 主要キーワードを不自然に繰り返す文章

# 最終自己チェック

出力前に以下を自己確認し、不足があれば本文に補ってからJSONを返してください。

- 冒頭200字以内に自然な定義文がある
- 導入で結論が先に示されている
- 主要キーワードがmetaTitleの前方にある
- metaTitleが抽象的すぎず、「とは」「設定方法」「改善」「変更点」「手順」「原因」「比較」「注意点」など検索されやすい語を自然に含む
- expertiseNoteHtmlで編集・検証方針が明記されている（個人名の監修者は立てていない）
- authorProfileHtmlでアドプレス編集部の担当領域と編集方針ページへのリンクが示されている
- originalInsightsが3〜5個ある
- practicalExamplesが2〜3個あり、業種別・相談パターン・仮想ケースとして実務判断を補っている
- updateHistoryが1件以上ある
- referencesUsedが2件以上あり、本文の公式リンクと対応している
- searchIntentが1文で明確
- sectionsが6〜8個ある
- 比較表が1つ以上ある
- チェックリストが1つ以上ある
- 管理画面やツールを伴うテーマでは、設定画面で見る項目・確認順・変更後のKPIが具体的に書かれている
- 原因別またはケース別の改善策がある
- よくある失敗例がある
- FAQが5〜8問ある
- 相互リンクが1本以上ある
- 公式出典リンクが2本以上ある
- アドプレス内の関連記事リンクが1本以上ある
- CTAが本文中盤に自然に入っている（末尾CTAはシステムが付与するため、まとめにCTAを書いていない）
- 不確かな数値を断定していない
- アドプレス編集部としての実務的な解釈がある
- JSONスキーマに完全準拠している`
    + (feedback ? `\n\n# 前回の指摘（品質ゲート不合格時のみ・必ず修正すること）\n${feedback}` : "")
    + `\n\n# 出力JSONスキーマ（この構造に完全準拠する）\n${JSON.stringify(ARTICLE_SCHEMA)}`
    + `\n\n# 出力形式（厳守）\nマークダウンのコードフェンスや前置き・後置きの説明を一切付けず、上記スキーマに完全準拠したJSONオブジェクトのみを出力してください。`;

  let parsed = null, lastRaw = "", lastErr = null;
  for (let i = 0; i < WRITE_ATTEMPTS; i++) {
    const p = i === 0 ? prompt
      : prompt + "\n\n# 重要\n前回の生成は失敗またはJSONとして解析できませんでした。説明やコードフェンスを付けず、上記スキーマに完全準拠したJSONオブジェクトのみを返してください。";
    try {
      lastRaw = await claudeText(p);
    } catch (e) {
      lastErr = e;
      console.log(`  記事生成の呼び出しに失敗（試行 ${i + 1}/${WRITE_ATTEMPTS}）: ${String(e?.message || e).slice(0, 200)}`);
      if (i < WRITE_ATTEMPTS - 1) await sleep(backoffMs(i));
      continue;
    }
    parsed = extractJsonObject(lastRaw);
    if (parsed) break;
    console.log(`  生成結果をJSONとして解析できませんでした（試行 ${i + 1}/${WRITE_ATTEMPTS}）`);
    if (i < WRITE_ATTEMPTS - 1) await sleep(backoffMs(i));
  }
  if (!parsed) {
    const detail = lastErr ? ` (last error: ${String(lastErr?.message || lastErr).slice(0, 200)})` : "";
    throw new Error("writer returned no parseable JSON" + detail + ": " + String(lastRaw).slice(0, 300));
  }
  return parsed;
}

// --- 品質ゲート ---
async function qualityGate(article, cocomarke, sourceLinks, idea, adpressCandidateIds) {
  const issues = [];
  const fullBody = [
    article.leadParagraphHtml,
    article.authorProfileHtml,
    article.expertiseNoteHtml,
    ...(article.originalInsights || []),
    ...(article.practicalExamples || []).map((e) => e.html),
    ...article.sections.map((s) => s.html),
    article.conclusionHtml,
    ...(article.faq || []).map((f) => f.answerHtml),
  ].join("\n");
  const textLen = fullBody.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
  if (textLen < MIN_TEXT_CHARS) issues.push(`本文が短すぎます（約${textLen}字）。${MIN_TEXT_CHARS}字以上にしてください。`);
  if (article.sections.length < 5) issues.push("セクションが少なすぎます。5個以上にしてください。");
  if (!keywordCovered(idea.primaryKeyword, article.metaTitle, article.h1)) {
    issues.push(`主要キーワード「${idea.primaryKeyword}」の主要語がmetaTitleまたはh1に自然に含まれていません。`);
  }
  if ((article.metaTitle || "").length < 28 || (article.metaTitle || "").length > 60) {
    issues.push("metaTitle は28〜60字の範囲にしてください。");
  }
  if (!titleHasSearchIntent(article.metaTitle) && !titleHasSearchIntent(article.h1)) {
    issues.push("metaTitleまたはh1に「とは」「設定」「方法」「改善」「変更点」など検索意図が分かる語を含めてください。");
  }
  if ((article.metaDescription || "").length < 80 || (article.metaDescription || "").length > 150) {
    issues.push("metaDescription は80〜150字の範囲にしてください。");
  }
  if (!Array.isArray(article.keyTakeaways) || article.keyTakeaways.length < 3) {
    issues.push("keyTakeaways が不足しています。3個以上にしてください。");
  }
  if (!article.authorProfileHtml || !article.authorProfileHtml.includes(EDITORIAL_POLICY_URL)) {
    issues.push("authorProfileHtml にアドプレス編集部の説明と編集方針ページへのリンクを含めてください。");
  }
  if (!Array.isArray(article.faq) || article.faq.length < 2) {
    issues.push("FAQ が不足しています。2個以上にしてください。");
  }
  if (!article.expertiseNoteHtml || stripTags(article.expertiseNoteHtml).length < 50) {
    issues.push("expertiseNoteHtml が不足しています。編集・検証方針を50字以上で明記してください。");
  }
  if (!article.expertiseNoteHtml.includes(EDITORIAL_POLICY_URL)) {
    issues.push("expertiseNoteHtml に編集方針ページへのリンクを含めてください。");
  }
  if (/早川/.test(fullBody)) {
    issues.push("実在しない監修者名（早川など）を含めないでください。個人名の監修者は立てません。");
  }
  if (!Array.isArray(article.originalInsights) || article.originalInsights.length < 3) {
    issues.push("originalInsights が不足しています。独自視点を3個以上にしてください。");
  }
  if (!Array.isArray(article.practicalExamples) || article.practicalExamples.length < 2) {
    issues.push("practicalExamples が不足しています。実務ケースを2個以上にしてください。");
  }
  if (!Array.isArray(article.updateHistory) || article.updateHistory.length < 1) {
    issues.push("updateHistory が不足しています。更新履歴を1件以上にしてください。");
  }
  if (!Array.isArray(article.referencesUsed) || article.referencesUsed.length < 2) {
    issues.push("referencesUsed が不足しています。公式参照資料を2件以上にしてください。");
  }
  if (!/<table[\s>]/i.test(fullBody)) issues.push("比較表または原因別表がありません。tableを1つ以上入れてください。");
  if (!/チェックリスト|確認項目|☐|□/.test(stripTags(fullBody))) {
    issues.push("実務チェックリストが不足しています。");
  }
  const ids = article.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length) issues.push("セクションidが重複しています。");
  if (/<\/?(h1|h2|script|style|img)\b/i.test(fullBody)) {
    issues.push("本文HTMLに使用禁止タグ（h1/h2/script/style/img）があります。");
  }

  const hrefs = extractHrefs(fullBody);
  const cocoSet = new Set(cocomarke.map((c) => c.url));
  const cocoLinks = hrefs.filter((h) => cocoSet.has(h) || hostOf(h) === "www.cocomarke.com");
  if (cocoLinks.length < 1) issues.push("cocomarke.com への相互リンクが本文にありません（最低1本）。候補リストのURLを使ってください。");

  // アドプレス内部リンク（/news/ID/）：本文中に1本以上＋実在IDのみ
  const idSet = adpressCandidateIds instanceof Set ? adpressCandidateIds : new Set(adpressCandidateIds || []);
  const internalLinks = hrefs.filter((h) => /^\/news\/[0-9]+\/?$/.test(h));
  const badInternal = internalLinks.filter((h) => {
    const id = h.match(/\/news\/([0-9]+)/)?.[1];
    return !idSet.has(id);
  });
  if (internalLinks.length < 1) issues.push("本文中にアドプレスの内部リンク（関連記事候補の/news/ID/）がありません（最低1本、自然な文脈で）。");
  if (badInternal.length) issues.push(`存在しない内部リンクがあります: ${badInternal.join(", ")}。関連記事候補のIDのみ使ってください。`);

  // 中盤CTA：COCOマーケの無料相談への導線が本文にあるか
  if (!fullBody.includes(CONSULT_URL)) {
    issues.push(`本文中盤の自然なCTA（無料相談 ${CONSULT_URL} へのリンク）がありません。`);
  }

  const ext = hrefs.filter((h) => /^https?:\/\//.test(h) && hostOf(h) !== hostOf(BASE_URL) && hostOf(h) !== "www.cocomarke.com");
  const auth = ext.filter(isAuthoritative);
  const nonAuth = ext.filter((h) => !isAuthoritative(h) && h !== CONSULT_URL);
  const allowedSources = new Set(sourceLinks);
  const inventedSources = auth.filter((h) => !allowedSources.has(h));
  const invalidReferences = (article.referencesUsed || []).map((r) => r.url).filter((u) => !allowedSources.has(u));
  if (nonAuth.length) issues.push(`許可外ドメインへの外部リンクがあります: ${nonAuth.join(", ")}。権威ドメインまたはCOCOマーケ相談ページのみにしてください。`);
  if (inventedSources.length) issues.push(`使用可能な公式出典URLリスト外のリンクがあります: ${inventedSources.join(", ")}。提示URLのみ使ってください。`);
  if (invalidReferences.length) issues.push(`referencesUsed に使用可能な公式出典URLリスト外のURLがあります: ${invalidReferences.join(", ")}。`);
  if (auth.length < 2) issues.push("公式出典リンクが不足しています（最低2本）。");

  const dead = [];
  for (const u of unique(auth)) {
    if (!(await isLinkAlive(u, { lenient: true }))) dead.push(u);
  }
  for (const u of unique(cocoLinks)) {
    if (!(await isLinkAlive(u))) dead.push(u);
  }
  if (dead.length) issues.push(`到達できないリンクがあります（404等）: ${dead.join(", ")}。実在URLに修正してください。`);

  return { ok: issues.length === 0, issues, textLen };
}

// --- 記事本文（body_html）の組み立て。design-ref由来の.article-body系クラスに合わせる ---
function buildBodyHtml(article) {
  const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const toc = article.sections
    .map((s) => `    <a href="#${esc(s.id)}">${esc(s.heading)}</a>`)
    .concat((article.practicalExamples || []).length ? [`    <a href="#practical-examples">実務ケース別の設計例</a>`] : [])
    .concat((article.faq || []).length ? [`    <a href="#faq">よくある質問</a>`] : [])
    .concat([`    <a href="#conclusion">まとめ</a>`])
    .join("\n");

  const takeaways = (article.keyTakeaways || []).length
    ? `<div class="key-takeaways">\n<h2>重要ポイント</h2>\n<ul>\n${article.keyTakeaways.map((t) => `<li>${esc(t)}</li>`).join("\n")}\n</ul>\n</div>\n\n`
    : "";
  const authorProfile = article.authorProfileHtml
    ? `<div class="author-box">\n<h2>著者・編集方針</h2>\n${article.authorProfileHtml}\n</div>\n\n`
    : "";
  const expertiseNote = article.expertiseNoteHtml
    ? `<div class="expertise-note">\n<h2>編集・検証方針</h2>\n${article.expertiseNoteHtml}\n</div>\n\n`
    : "";
  const insights = (article.originalInsights || []).length
    ? `<div class="original-insights">\n<h2>アドプレス編集部の実務視点</h2>\n<ul>\n${article.originalInsights.map((t) => `<li>${esc(t)}</li>`).join("\n")}\n</ul>\n</div>\n\n`
    : "";
  const examples = (article.practicalExamples || []).length
    ? `<h2 id="practical-examples">実務ケース別の設計例</h2>\n${article.practicalExamples.map((e) => `<h3>${esc(e.title)}</h3>\n${e.html}`).join("\n\n")}\n\n`
    : "";
  const references = (article.referencesUsed || []).length
    ? `<div class="source-history">\n<h2>参照情報</h2>\n<table>\n<thead><tr><th>項目</th><th>内容</th></tr></thead>\n<tbody>\n${(article.referencesUsed || []).map((r) => `<tr><td>参照資料</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>（参照日: ${esc(r.accessedDate)}）</td></tr>`).join("\n")}\n</tbody>\n</table>\n</div>\n`
    : "";
  const faqHtml = (article.faq || []).length
    ? `\n\n<h2 id="faq">よくある質問</h2>\n${article.faq.map((f) => `<h3>${esc(f.question)}</h3>\n${f.answerHtml}`).join("\n\n")}`
    : "";

  return `<div class="toc">\n<h4>目次</h4>\n${toc}\n</div>\n\n`
    + article.leadParagraphHtml + "\n\n"
    + authorProfile
    + takeaways
    + expertiseNote
    + insights
    + article.sections.map((s) => `<h2 id="${esc(s.id)}">${esc(s.heading)}</h2>\n${s.html}`).join("\n\n")
    + "\n\n" + examples
    + faqHtml
    + `\n\n<h2 id="conclusion">まとめ</h2>\n${article.conclusionHtml}`
    + (references ? "\n\n" + references : "");
}

async function ensureEditorialProfile(supabase) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_editorial", true)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: EDITORIAL_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { full_name: EDITORIAL_DISPLAY_NAME },
  });
  if (createErr || !created.user) {
    throw new Error(`編集部アカウントの作成に失敗しました: ${createErr?.message}`);
  }
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ display_name: EDITORIAL_DISPLAY_NAME, is_editorial: true, email: EDITORIAL_EMAIL })
    .eq("id", created.user.id);
  if (updateErr) throw new Error(`編集部プロフィールの更新に失敗しました: ${updateErr.message}`);
  return created.user.id;
}

async function preflight() {
  console.log("— preflight —");
  console.log("  CLAUDE_CODE_OAUTH_TOKEN:", process.env.CLAUDE_CODE_OAUTH_TOKEN ? "設定あり" : "未設定");
  console.log("  ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY ? "設定あり(注意: claudeはAPIキーを優先する可能性)" : "なし(OK)");
  console.log("  POST_MODEL:", MODEL || "(Claude Code既定)");
  console.log("  SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "設定あり" : "未設定");
  try {
    const v = await execFileP(CLAUDE_BIN, ["--version"], { env: process.env });
    console.log("  claude --version:", String(v.stdout).trim());
  } catch (e) {
    console.log("  claude --version 取得失敗:", e.message);
  }
  try {
    const t = await claudeText("OKとだけ返してください。");
    console.log("  疎通テスト応答:", JSON.stringify(String(t).slice(0, 80)));
  } catch (e) {
    throw new Error("claude 疎通テストに失敗（認証/サブスク課金の可能性）: " + e.message);
  }
}

async function main() {
  await preflight();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。");
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const topics = readJson("content/topics.json");

  const choice = pickTopic(topics);
  if (!choice) { console.log("未使用トピックがありません。content/topics.json の ideas を追加してください。"); return; }
  const { category, idea, chosenIndex } = choice;
  const catLabel = GM_CATEGORY_LABELS[category] || category;
  const categorySlug = CATEGORY_MAP[category] || "sns";
  console.log(`▶ トピック: [${category}→${categorySlug}] ${idea.intent}\n  model=${MODEL}`);

  const editorialId = await ensureEditorialProfile(supabase);

  const cocomarkeAll = await fetchCocomarkeArticles();
  const cocomarke = pickCocomarkeCandidates(cocomarkeAll, idea);
  console.log(`  cocomarke記事 ${cocomarkeAll.length}件から関連候補 ${cocomarke.length}件を選定`);

  // アドプレス内部リンク候補：同カテゴリ優先で直近の公開記事を取得
  const { data: sameCatArticles } = await supabase
    .from("articles")
    .select("id, title")
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false })
    .limit(15);
  const { data: otherArticles } = await supabase
    .from("articles")
    .select("id, title")
    .eq("status", "published")
    .neq("category_slug", categorySlug)
    .order("published_at", { ascending: false })
    .limit(10);
  const adpressCandidates = [...(sameCatArticles || []), ...(otherArticles || [])].slice(0, 20);
  const adpressCandidateIds = new Set(adpressCandidates.map((a) => String(a.id)));
  console.log(`  アドプレス内部リンク候補 ${adpressCandidates.length}件`);

  let findings = "";
  if (ENABLE_RESEARCH) {
    console.log("▶ Web検索で調査中…");
    try {
      findings = await research(idea, catLabel);
    } catch (e) {
      console.log(`  調査に失敗したため調査なしで継続します: ${String(e?.message || e).slice(0, 200)}`);
      findings = "";
    }
  } else {
    console.log("▶ 調査スキップ（モデル知識＋カテゴリ公式出典で生成。最新Web検索が必要なら ENABLE_RESEARCH=1）");
  }
  const sourceLinks = await buildSourceLinks(findings, category);
  if (sourceLinks.length < 2) throw new Error("公式出典URLを2本以上確認できませんでした。調査クエリまたはfallback sourceを見直してください。");
  console.log(`  公式出典URL ${sourceLinks.length}件を確認`);

  let article = null, gate = null, feedback = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`▶ 記事生成（試行 ${attempt + 1}/${MAX_RETRIES + 1}）…`);
    const draft = await writeArticle(idea, catLabel, findings, cocomarke, adpressCandidates, sourceLinks, feedback);
    for (const s of draft.sections) s.html = enforceExternalAttrs(s.html);
    draft.leadParagraphHtml = enforceExternalAttrs(draft.leadParagraphHtml);
    draft.authorProfileHtml = enforceExternalAttrs(draft.authorProfileHtml);
    draft.expertiseNoteHtml = enforceExternalAttrs(draft.expertiseNoteHtml);
    for (const e of draft.practicalExamples || []) e.html = enforceExternalAttrs(e.html);
    draft.conclusionHtml = enforceExternalAttrs(draft.conclusionHtml);
    for (const f of draft.faq || []) f.answerHtml = enforceExternalAttrs(f.answerHtml);

    gate = await qualityGate(draft, cocomarke, sourceLinks, idea, adpressCandidateIds);
    if (gate.ok) { article = draft; break; }
    feedback = gate.issues.join("\n");
    console.log(`  品質ゲート不通過:\n   - ${gate.issues.join("\n   - ")}`);
  }
  if (!article) { throw new Error(`品質基準を満たせませんでした。公開を中止します。\n${feedback}`); }
  console.log(`✓ 品質ゲート通過（本文 約${gate.textLen}字）`);

  const dates = jstDate();
  const bodyHtml = buildBodyHtml(article);

  const { data: inserted, error: insertErr } = await supabase
    .from("articles")
    .insert({
      author_id: editorialId,
      category_slug: categorySlug,
      title: article.h1,
      body_html: bodyHtml,
      excerpt: article.cardDescription,
      status: "published",
      source: "editorial",
      is_sponsored: false,
      contact_org: EDITORIAL_DISPLAY_NAME,
      contact_email: EDITORIAL_EMAIL,
      contact_public: false,
      published_at: new Date(`${dates.iso}T03:00:00.000Z`).toISOString(), // JST正午相当
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    throw new Error(`Supabaseへの記事保存に失敗しました: ${insertErr?.message}`);
  }

  // 台帳更新（次回の重複選定を防ぐ）
  topics.usedTopicIds.push(idea.id);
  topics.nextRotationIndex = (chosenIndex + 1) % topics.categoryRotation.length;
  writeJson("content/topics.json", topics);

  console.log(`\n✅ 公開完了: ${BASE_URL}/news/${inserted.id}/`);
  console.log(`   タイトル: ${article.h1}`);
  console.log(`   カテゴリ: ${categorySlug}`);
  console.log(`   相互リンク: ${article.cocomarkeLinksUsed?.join(", ") || "(本文内)"}`);
  console.log(`   出典: ${article.backlinksUsed?.join(", ") || "(本文内)"}`);
}

main().catch((e) => { console.error("ERROR:", e?.message || e); process.exit(1); });
