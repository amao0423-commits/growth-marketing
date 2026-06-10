// 週2回のSEO記事自動生成パイプライン
// 1) トピック選定 → 2) Web検索でトレンド/一次情報を収集 → 3) 構造化出力で記事生成
// → 4) 品質ゲート → 5) HTML出力・index/sitemap/台帳の更新
//
// 必須環境変数: ANTHROPIC_API_KEY
// 任意: POST_MODEL（既定 claude-opus-4-8）, MAX_RETRIES（既定 2）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { fetchCocomarkeArticles, isLinkAlive } from './lib/cocomarke.mjs';
import { articlePage, indexCard, CATEGORIES, BASE_URL } from './lib/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.POST_MODEL || 'claude-opus-4-8';
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 2);

// 被リンクを許可する権威ドメイン（一次情報・公式のみ）
const AUTH_DOMAINS = [
  'developers.google.com', 'support.google.com', 'business.google.com', 'blog.google',
  'business.instagram.com', 'help.instagram.com', 'about.instagram.com',
  'business.facebook.com', 'developers.facebook.com', 'www.facebook.com',
  'www.tiktok.com', 'ads.tiktok.com', 'business.tiktok.com',
  'business.x.com', 'help.x.com', 'thinkwithgoogle.com',
  'www.soumu.go.jp', 'www.meti.go.jp', 'www.caa.go.jp',
];

const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から取得

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const writeJson = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o, null, 2) + '\n');

function jstDate() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
  return { iso: `${y}-${m}-${day}`, display: `${y}.${m}.${day}` };
}

function hostOf(url) { try { return new URL(url).host; } catch { return ''; } }
function isAuthoritative(url) {
  const h = hostOf(url);
  return AUTH_DOMAINS.some((d) => h === d || h.endsWith('.' + d));
}

// HTML中の href を全部取り出す
function extractHrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

// 外部の絶対URLリンクに target/rel を付与（無ければ）
function enforceExternalAttrs(html) {
  return html.replace(/<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/g, (full, href, rest) => {
    if (hostOf(href) === hostOf(BASE_URL)) return full; // 自サイトは対象外
    let attrs = rest;
    if (!/target=/.test(attrs)) attrs += ' target="_blank"';
    if (!/rel=/.test(attrs)) attrs += ' rel="noopener"';
    return `<a href="${href}"${attrs}>`;
  });
}

// --- トピック選定 ---
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
  return null; // 全トピック消化済み
}

// --- 関連GM記事を3件選ぶ ---
function pickRelated(posts, category, preferredSlugs) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const out = [];
  for (const s of preferredSlugs || []) {
    if (bySlug.has(s) && !out.find((p) => p.slug === s)) out.push(bySlug.get(s));
    if (out.length >= 3) break;
  }
  const fill = posts.filter((p) => p.category === category && !out.includes(p))
    .concat(posts.filter((p) => p.category !== category && !out.includes(p)));
  for (const p of fill) { if (out.length >= 3) break; out.push(p); }
  return out.slice(0, 3);
}

// --- Step A: Web検索でトレンド/一次情報を収集 ---
async function research(idea, catLabel) {
  const prompt = `あなたはマーケティング領域の調査担当です。Web検索ツールを使い、次のテーマについて2026年時点の最新動向・検索上位で語られている論点・一次情報を調べてください。\n\n`
    + `テーマ: ${idea.intent}\n主要キーワード: ${idea.primaryKeyword}\nカテゴリ: ${catLabel}\n\n`
    + `必ず複数回検索し、次を日本語でまとめてください:\n`
    + `1. 2026年の最新トレンド・変化点（具体的に）\n`
    + `2. 検索ユーザーが知りたい主要な論点（H2見出しになりそうな3〜5個）\n`
    + `3. 引用・出典に使える公式/一次情報のURL（Google検索セントラル、Meta/Instagram、TikTok、総務省等の公式のみ。各URLと何が書いてあるかを1行で）\n`
    + `URLは実在し、テーマに直接関連するものだけを挙げてください。`;

  let messages = [{ role: 'user', content: prompt }];
  let collected = '';
  for (let i = 0; i < 6; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      tools: [
        { type: 'web_search_20260209', name: 'web_search' },
        { type: 'web_fetch_20260209', name: 'web_fetch' },
      ],
      messages,
    });
    for (const b of res.content) if (b.type === 'text') collected += b.text + '\n';
    if (res.stop_reason === 'pause_turn') {
      messages = [{ role: 'user', content: prompt }, { role: 'assistant', content: res.content }];
      continue;
    }
    break;
  }
  return collected.trim();
}

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    h1: { type: 'string' },
    cardDescription: { type: 'string' },
    readMinutes: { type: 'integer' },
    leadParagraphHtml: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { id: { type: 'string' }, heading: { type: 'string' }, html: { type: 'string' } },
        required: ['id', 'heading', 'html'],
      },
    },
    conclusionHtml: { type: 'string' },
    cocomarkeLinksUsed: { type: 'array', items: { type: 'string' } },
    backlinksUsed: { type: 'array', items: { type: 'string' } },
    relatedSlugs: { type: 'array', items: { type: 'string' } },
  },
  required: ['metaTitle', 'metaDescription', 'keywords', 'h1', 'cardDescription', 'readMinutes',
    'leadParagraphHtml', 'sections', 'conclusionHtml', 'cocomarkeLinksUsed', 'backlinksUsed', 'relatedSlugs'],
};

// --- Step B: 構造化出力で記事を生成 ---
async function writeArticle(idea, catLabel, findings, cocomarke, gmPosts, feedback) {
  const cocoList = cocomarke.map((c) => `- ${c.url} （関連語: ${c.keywords.join('、')}）`).join('\n');
  const gmList = gmPosts.map((p) => `- ${p.slug} ：${p.title}（${p.categoryLabel}）`).join('\n');

  const prompt = `あなたはSEOに精通したマーケティング会社「Growth Marketing」の編集者です。下記の調査結果をもとに、検索流入を狙う高品質な日本語ブログ記事を作成してください。読者の検索意図を満たし、独自の視点と実務的な具体性を備えた、オリジナルで有用な記事にしてください。\n\n`
    + `# テーマ\n${idea.intent}\n主要キーワード: ${idea.primaryKeyword} / カテゴリ: ${catLabel}\n\n`
    + `# 調査結果（最新トレンド・一次情報）\n${findings}\n\n`
    + `# 相互リンク候補（cocomarke.com の記事。本文の文脈に自然に合うものを1〜3本、自然なアンカーテキストで <a href="URL">語句</a> として本文中に挿入。リストにあるURLのみ使用）\n${cocoList}\n\n`
    + `# 被リンク（出典）として使える権威ドメイン\n${AUTH_DOMAINS.join(', ')}\n調査結果に出てきた上記ドメインの実在URLを2〜4本、出典として本文中に <a href="URL">…</a> で引用してください。存在しないURLは絶対に作らないこと。\n\n`
    + `# 関連記事候補（Growth Marketing内。relatedSlugs に3つのslugを選ぶ。本文テーマに近いものを優先）\n${gmList}\n\n`
    + `# 執筆要件\n`
    + `- 文字数: 本文合計でおおむね2000〜3500字。\n`
    + `- 構成: 導入(leadParagraphHtml) → 本文セクション(sections 4〜6個、各 heading は検索意図に沿うH2見出し、id は英小文字とハイフンのユニークなアンカー) → まとめ(conclusionHtml)。\n`
    + `- 各セクションのhtmlは <p> を基本に、必要に応じ <h3>小見出し</h3>・<ul><li>・<ol><li>・<strong>・<blockquote>・<div class="callout"><p>要点</p></div> を使う。h1/h2タグやstyle属性、画像は使わない（H2はシステム側で付与）。\n`
    + `- 相互リンク(cocomarke)を最低1本、出典リンク(権威ドメイン)を最低2本、本文中に含める。\n`
    + `- 誇大表現・断定的な数値の捏造をしない。E-E-A-Tを意識し、一次情報に基づく。\n`
    + `- metaTitle は28〜36字目安で主要キーワードを前方に。metaDescription は110〜130字。keywords は5語前後。cardDescription は一覧カード用に60字前後。\n`
    + (feedback ? `\n# 前回の指摘（必ず修正すること）\n${feedback}\n` : '')
    + `\n指定スキーマのJSONのみを返してください。`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    output_config: { format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('writer returned no text');
  return JSON.parse(text);
}

// --- 品質ゲート ---
async function qualityGate(article, cocomarke) {
  const issues = [];
  const fullBody = [article.leadParagraphHtml, ...article.sections.map((s) => s.html), article.conclusionHtml].join('\n');
  const textLen = fullBody.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
  if (textLen < 1500) issues.push(`本文が短すぎます（約${textLen}字）。2000字以上にしてください。`);
  if (article.sections.length < 4) issues.push('セクションが少なすぎます。4個以上にしてください。');

  const hrefs = extractHrefs(fullBody);
  const cocoSet = new Set(cocomarke.map((c) => c.url));
  const cocoLinks = hrefs.filter((h) => cocoSet.has(h) || hostOf(h) === 'www.cocomarke.com');
  if (cocoLinks.length < 1) issues.push('cocomarke.com への相互リンクが本文にありません（最低1本）。候補リストのURLを使ってください。');

  const ext = hrefs.filter((h) => /^https?:\/\//.test(h) && hostOf(h) !== hostOf(BASE_URL) && hostOf(h) !== 'www.cocomarke.com');
  const auth = ext.filter(isAuthoritative);
  const nonAuth = ext.filter((h) => !isAuthoritative(h));
  if (nonAuth.length) issues.push(`許可外ドメインへの外部リンクがあります: ${nonAuth.join(', ')}。権威ドメインのみにしてください。`);
  if (auth.length < 2) issues.push('権威ドメインへの出典リンクが不足しています（最低2本）。');

  // 外部リンクの死活チェック
  const dead = [];
  for (const u of [...new Set([...auth, ...cocoLinks])]) {
    if (!(await isLinkAlive(u))) dead.push(u);
  }
  if (dead.length) issues.push(`到達できないリンクがあります（404等）: ${dead.join(', ')}。実在URLに修正してください。`);

  return { ok: issues.length === 0, issues, textLen };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

  const posts = readJson('content/posts.json');
  const topics = readJson('content/topics.json');
  const existingSlugs = new Set(posts.map((p) => p.slug));

  const choice = pickTopic(topics);
  if (!choice) { console.log('未使用トピックがありません。topics.json の ideas を追加してください。'); return; }
  const { category, idea, chosenIndex } = choice;
  const catLabel = CATEGORIES[category].label;
  let slug = idea.id;
  while (existingSlugs.has(slug)) slug += '-2';
  console.log(`▶ トピック: [${category}] ${idea.intent}\n  slug=${slug} / model=${MODEL}`);

  const cocomarke = await fetchCocomarkeArticles();
  console.log(`  cocomarke記事 ${cocomarke.length}件を相互リンク候補に取得`);

  console.log('▶ Web検索で調査中…');
  const findings = await research(idea, catLabel);

  let article = null, gate = null, feedback = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`▶ 記事生成（試行 ${attempt + 1}/${MAX_RETRIES + 1}）…`);
    const draft = await writeArticle(idea, catLabel, findings, cocomarke, posts, feedback);
    // 外部リンクに rel/target を付与
    for (const s of draft.sections) s.html = enforceExternalAttrs(s.html);
    draft.leadParagraphHtml = enforceExternalAttrs(draft.leadParagraphHtml);
    draft.conclusionHtml = enforceExternalAttrs(draft.conclusionHtml);
    draft.slug = slug;

    gate = await qualityGate(draft, cocomarke);
    if (gate.ok) { article = draft; break; }
    feedback = gate.issues.join('\n');
    console.log(`  品質ゲート不通過:\n   - ${gate.issues.join('\n   - ')}`);
  }
  if (!article) { console.log('✕ 品質基準を満たせませんでした。今回は公開をスキップします。'); process.exitCode = 0; return; }
  console.log(`✓ 品質ゲート通過（本文 約${gate.textLen}字）`);

  // --- 出力 ---
  const dates = jstDate();
  const related = pickRelated(posts, category, article.relatedSlugs);
  const html = articlePage(article, category, related, dates);
  fs.writeFileSync(path.join(ROOT, 'blog', `${slug}.html`), html);

  // ブログ一覧へカード挿入（先頭）
  const newPost = { slug, category, categoryLabel: catLabel, title: article.h1, description: article.cardDescription, date: dates.display };
  const indexPath = path.join(ROOT, 'blog', 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  const needle = '    <div class="posts-grid">\n';
  indexHtml = indexHtml.replace(needle, needle + '\n' + indexCard(newPost));
  fs.writeFileSync(indexPath, indexHtml);

  // sitemap へ追加
  const smPath = path.join(ROOT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const urlLine = `  <url><loc>${BASE_URL}/blog/${slug}.html</loc><priority>0.7</priority></url>\n`;
  sm = sm.replace('</urlset>', urlLine + '</urlset>');
  fs.writeFileSync(smPath, sm);

  // 台帳更新
  writeJson('content/posts.json', [newPost, ...posts]);
  topics.usedTopicIds.push(idea.id);
  topics.nextRotationIndex = (chosenIndex + 1) % topics.categoryRotation.length;
  writeJson('content/topics.json', topics);

  console.log(`\n✅ 公開準備完了: ${BASE_URL}/blog/${slug}.html`);
  console.log(`   タイトル: ${article.h1}`);
  console.log(`   相互リンク: ${article.cocomarkeLinksUsed?.join(', ') || '(本文内)'}`);
  console.log(`   出典: ${article.backlinksUsed?.join(', ') || '(本文内)'}`);
}

main().catch((e) => { console.error('ERROR:', e?.message || e); process.exit(1); });
