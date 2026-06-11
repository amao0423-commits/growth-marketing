// 記事HTML・カード・カバーSVGのレンダラ（既存テンプレート準拠）
export const BASE_URL = 'https://www.nishinippon-adv.jp';

// 監修者（全記事共通）。変更する場合はここだけ直せばよい。
export const SUPERVISOR = { name: '早川 葵', title: 'SEO歴5年' };
const EDITORIAL_POLICY_URL = `${BASE_URL}/editorial-policy.html`;

// カテゴリ → 表示ラベル・テーマカラー（既存サイトのブランドカラーに準拠）
export const CATEGORIES = {
  sns:     { label: 'SNS運用',              fill: '#ff5722' },
  ads:     { label: '広告運用',             fill: '#1c1a17' },
  seo:     { label: 'SEO',                  fill: '#2d2a26' },
  content: { label: 'コンテンツマーケティング', fill: '#ff8a5c' },
  brand:   { label: 'ブランディング',        fill: '#c2410c' },
};

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(s = '') {
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// 背景のドットグリッド（既存サムネと同じ意匠）
function dotGrid(opacity = 0.10) {
  let dots = '';
  for (let y = 14; y <= 206; y += 24) {
    for (let x = 14; x <= 398; x += 24) dots += `<circle cx="${x}" cy="${y}" r="1.4"/>`;
  }
  return `<g opacity="${opacity}" fill="#ffffff">${dots}</g>`;
}

// ネットワークノードのエンブレム（記事カバー用）。色はカテゴリに追従。
function emblem() {
  return '<line x1="70" y1="70" x2="150" y2="45" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="70" y1="70" x2="150" y2="120" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="150" y1="45" x2="230" y2="80" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="150" y1="120" x2="230" y2="80" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="230" y1="80" x2="300" y2="55" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="230" y1="80" x2="320" y2="140" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<line x1="230" y1="80" x2="240" y2="165" stroke="#fff" stroke-width="1.2" opacity="0.45"/>'
    + '<circle cx="70" cy="70" r="18" fill="#fff"/>'
    + '<circle cx="150" cy="45" r="12" fill="rgba(255,255,255,0.55)"/>'
    + '<circle cx="150" cy="120" r="14" fill="rgba(255,255,255,0.55)"/>'
    + '<circle cx="230" cy="80" r="20" fill="#fff"/>'
    + '<circle cx="300" cy="55" r="11" fill="rgba(255,255,255,0.55)"/>'
    + '<circle cx="320" cy="140" r="16" fill="#fff"/>'
    + '<circle cx="240" cy="165" r="12" fill="rgba(255,255,255,0.55)"/>';
}

export function coverSvg(category) {
  const fill = (CATEGORIES[category] || CATEGORIES.sns).fill;
  return `<svg class="thumb-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="記事サムネイル">\n`
    + `<rect width="400" height="220" fill="${fill}"/>\n`
    + dotGrid(0.10) + '\n' + emblem() + '\n</svg>';
}

// ブログ一覧・関連記事のカードに使う小さめサムネ
export function cardSvg(category) {
  const fill = (CATEGORIES[category] || CATEGORIES.sns).fill;
  return `<svg class="thumb-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="記事サムネイル">\n`
    + `<rect width="400" height="220" fill="${fill}"/>\n` + dotGrid(0.08) + '\n' + emblem() + '\n</svg>';
}

// ブログ一覧 blog/index.html に挿入する1枚のカード
export function indexCard(post) {
  return `      <a href="${post.slug}.html" class="post-card" data-cat="${post.category}">\n`
    + `        <div class="post-thumb">${cardSvg(post.category)}</div>\n`
    + `        <div class="post-body">\n`
    + `          <span class="post-cat">${esc(post.categoryLabel)}</span>\n`
    + `          <h3>${esc(post.title)}</h3>\n`
    + `          <p>${esc(post.description)}</p>\n`
    + `          <div class="post-meta"><span>${esc(post.date)}</span><span class="read">読む →</span></div>\n`
    + `        </div>\n`
    + `      </a>\n`;
}

// 記事末尾「関連記事」枠の1枚（説明文なし・data-catなし、既存テンプレ準拠）
function relatedCard(post) {
  return `      <a href="${post.slug}.html" class="post-card">\n`
    + `        <div class="post-thumb">${cardSvg(post.category)}</div>\n`
    + `        <div class="post-body">\n`
    + `          <span class="post-cat">${esc(post.categoryLabel)}</span>\n`
    + `          <h3>${esc(post.title)}</h3>\n`
    + `          <div class="post-meta"><span>${esc(post.date)}</span><span class="read">読む →</span></div>\n`
    + `        </div>\n`
    + `      </a>\n`;
}

// 記事1本のフルHTMLを生成する。
// article: 構造化出力（generate-post.mjs のスキーマ）
// related: posts.json から選んだ関連記事3件
// dates: { iso: 'YYYY-MM-DD', display: 'YYYY.MM.DD' }
export function articlePage(article, category, related, dates) {
  const cat = CATEGORIES[category] || CATEGORIES.sns;
  const canonical = `${BASE_URL}/blog/${article.slug}.html`;
  const wordCount = [
    article.leadParagraphHtml,
    article.authorProfileHtml,
    article.expertiseNoteHtml,
    ...(article.originalInsights || []),
    ...(article.practicalExamples || []).map((e) => e.html),
    ...article.sections.map((s) => s.html),
    article.conclusionHtml,
    ...(article.faq || []).map((f) => f.answerHtml),
  ].join('\n').replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;

  const toc = article.sections
    .map((s) => `    <a href="#${esc(s.id)}">${esc(s.heading)}</a>`)
    .concat((article.practicalExamples || []).length ? [`    <a href="#practical-examples">実務ケース別の設計例</a>`] : [])
    .concat((article.faq || []).length ? [`    <a href="#faq">よくある質問</a>`] : [])
    .concat([`    <a href="#conclusion">まとめ</a>`])
    .join('\n');

  const takeaways = (article.keyTakeaways || []).length
    ? `  <div class="key-takeaways">\n    <h2>重要ポイント</h2>\n    <ul>\n${article.keyTakeaways.map((t) => `      <li>${esc(t)}</li>`).join('\n')}\n    </ul>\n  </div>\n\n`
    : '';
  const authorProfile = article.authorProfileHtml
    ? `  <div class="author-box">\n    <h2>著者・編集方針</h2>\n${article.authorProfileHtml}\n  </div>\n\n`
    : '';
  const expertiseNote = article.expertiseNoteHtml
    ? `  <div class="expertise-note">\n    <h2>編集・検証方針</h2>\n${article.expertiseNoteHtml}\n  </div>\n\n`
    : '';
  const insights = (article.originalInsights || []).length
    ? `  <div class="original-insights">\n    <h2>Growth Marketingの実務視点</h2>\n    <ul>\n${article.originalInsights.map((t) => `      <li>${esc(t)}</li>`).join('\n')}\n    </ul>\n  </div>\n\n`
    : '';
  const examples = (article.practicalExamples || []).length
    ? `  <h2 id="practical-examples">実務ケース別の設計例</h2>\n${article.practicalExamples.map((e) => `  <h3>${esc(e.title)}</h3>\n${e.html}`).join('\n\n')}\n\n`
    : '';
  const sourceHistory = ((article.updateHistory || []).length || (article.referencesUsed || []).length)
    ? `  <div class="source-history">\n    <h2>参照情報・更新履歴</h2>\n    <table>\n      <thead><tr><th>項目</th><th>内容</th></tr></thead>\n      <tbody>\n${(article.referencesUsed || []).map((r) => `        <tr><td>参照資料</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>（参照日: ${esc(r.accessedDate)}）</td></tr>`).join('\n')}\n${(article.updateHistory || []).map((u) => `        <tr><td>更新履歴</td><td>${esc(u.date)}：${esc(u.detail)}</td></tr>`).join('\n')}\n      </tbody>\n    </table>\n  </div>\n\n`
    : '';
  const faqHtml = (article.faq || []).length
    ? `\n\n  <h2 id="faq">よくある質問</h2>\n${article.faq.map((f) => `  <h3>${esc(f.question)}</h3>\n${f.answerHtml}`).join('\n\n')}`
    : '';
  const body = article.leadParagraphHtml + '\n\n'
    + authorProfile
    + takeaways
    + expertiseNote
    + sourceHistory
    + insights
    + article.sections.map((s) => `  <h2 id="${esc(s.id)}">${esc(s.heading)}</h2>\n${s.html}`).join('\n\n')
    + '\n\n' + examples
    + faqHtml
    + `\n\n  <h2 id="conclusion">まとめ</h2>\n${article.conclusionHtml}`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: article.h1,
        description: article.metaDescription,
        datePublished: dates.iso,
        dateModified: dates.iso,
        articleSection: cat.label,
        keywords: article.keywords,
        wordCount,
        author: { '@id': `${BASE_URL}/#editorial-team` },
        editor: { '@type': 'Person', name: SUPERVISOR.name, jobTitle: SUPERVISOR.title, knowsAbout: ['SEO', 'コンテンツマーケティング', cat.label] },
        publisher: { '@id': `${BASE_URL}/#organization` },
        citation: (article.referencesUsed || []).map((r) => r.url),
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Growth Marketing',
        url: BASE_URL,
        publishingPrinciples: EDITORIAL_POLICY_URL,
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#editorial-team`,
        name: 'Growth Marketing編集部',
        url: EDITORIAL_POLICY_URL,
        parentOrganization: { '@id': `${BASE_URL}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'ブログ', item: `${BASE_URL}/blog/` },
          { '@type': 'ListItem', position: 3, name: article.h1, item: canonical },
        ],
      },
      ...(article.faq || []).length ? [{
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: article.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.answerHtml) },
        })),
      }] : [],
    ],
  };

  // 関連記事カードは一覧カードと同一マークアップ（サムネ＋説明文）に統一
  const relatedHtml = related.map((p) => '      ' + indexCard(p).trim()).join('\n\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>${esc(article.metaTitle)}｜Growth Marketing ブログ</title>
<meta name="description" content="${esc(article.metaDescription)}">
<meta name="keywords" content="${esc(article.keywords.join(','))}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(article.h1)}">
<meta property="og:description" content="${esc(article.metaDescription)}">
<meta property="og:url" content="${canonical}">
<meta property="article:section" content="${esc(cat.label)}">
<meta name="robots" content="index, follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
</head>
<body>

<header class="site-header">
  <div class="wrap nav">
    <a href="../index.html" class="brand"><span class="dot"></span>Growth&nbsp;Marketing</a>
    <nav class="nav-links">
      <a href="../index.html#services">サービス</a>
      <a href="../index.html#process">プロセス</a>
      <a href="../index.html#works">実績</a>
      <a href="index.html">ブログ</a>
      <a href="../contact.html" class="nav-cta">無料相談</a>
    </nav>
    <button class="burger" onclick="toggleNav()" aria-label="メニュー"><span></span><span></span><span></span></button>
  </div>
</header>

<div class="wrap crumb">
  <a href="../index.html">ホーム</a><span>/</span><a href="index.html">ブログ</a><span>/</span>${esc(cat.label)}
</div>

<article>
<section class="article-hero">
  <div class="wrap" style="max-width:820px;">
    <span class="eyebrow">${esc(cat.label)}</span>
    <h1>${esc(article.h1)}</h1>
    <div class="article-meta">
      <span>${esc(dates.display)}</span><span>•</span><span>読了 約${esc(article.readMinutes)}分</span><span>•</span><span>Growth Marketing 編集部</span><span>•</span><span>監修：${esc(SUPERVISOR.name)}（${esc(SUPERVISOR.title)}）</span>
    </div>
  </div>
</section>

<div class="wrap" style="max-width:820px;">
  <div class="article-cover">${coverSvg(category)}</div>
</div>

<div class="wrap article-body">
  <div class="toc">
    <h4>目次</h4>
${toc}
  </div>

${body}

  <div class="cta-band reveal" style="margin-top:60px;">
    <span class="eyebrow" style="color:#fff;">Free Consultation</span>
    <h2>${esc(cat.label)}に課題を感じていませんか？</h2>
    <p>成果から逆算したご提案を、無料相談でお届けします。</p>
    <a href="../contact.html" class="btn btn-primary">無料相談を申し込む <span class="arrow">→</span></a>
  </div>

  <div class="related">
    <span class="eyebrow">Related</span>
    <h2 style="font-size:1.5rem;margin:14px 0 30px;font-family:'Shippori Mincho',serif;">関連記事</h2>
    <div class="posts-grid">
${relatedHtml}
    </div>
  </div>
</div>
</article>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="brand"><span class="dot"></span>Growth Marketing</div>
        <p>SNS運用と広告運用で、ブランドの成長を成果から逆算するデジタルマーケティング代行会社です。</p>
      </div>
      <div class="footer-col"><h5>サービス</h5><a href="../index.html#services">SNS運用代行</a><a href="../index.html#services">広告運用代行</a><a href="../index.html#services">コンテンツ・SEO</a></div>
      <div class="footer-col"><h5>コンテンツ</h5><a href="index.html">ブログ</a><a href="../editorial-policy.html">編集方針</a><a href="../index.html#works">実績</a><a href="../index.html#process">プロセス</a></div>
      <div class="footer-col"><h5>会社情報</h5><a href="../contact.html">無料相談</a><a href="../contact.html">お問い合わせ</a></div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year></span> Growth Marketing. All rights reserved.</span>
      <span>SNS運用 / 広告運用 / デジタルマーケティング代行</span>
    </div>
  </div>
</footer>
<script src="../main.js"></script>
</body>
</html>
`;
}
