// cocomarke.com/blog の記事一覧を sitemap.xml から取得し、相互リンク候補を作る
const SITEMAP = 'https://www.cocomarke.com/sitemap.xml';

// slug を日本語に寄せるためのキーワード辞書（アンカー判断のヒント用）
const HINTS = {
  instagram: 'Instagram', reels: 'リール', reel: 'リール', saves: '保存', save: '保存',
  story: 'ストーリーズ', stories: 'ストーリーズ', highlights: 'ハイライト', search: '検索',
  keyword: 'キーワード', dm: 'DM', profile: 'プロフィール', sales: '販売', sell: '販売',
  influencer: 'インフルエンサー', marketing: 'マーケティング', ppc: 'リスティング広告',
  advertising: '広告', ad: '広告', ads: '広告', conversion: 'コンバージョン', cvr: 'CVR',
  affiliate: 'アフィリエイト', psychological: '心理', growth: 'グロース', guide: 'ガイド',
  strategy: '戦略', account: 'アカウント', freeze: '凍結', suspension: '凍結', like: 'いいね',
  limit: '制限', poll: 'アンケート', broadcast: 'ブロードキャスト', news: 'ニュース',
  roundup: 'まとめ', size: 'サイズ', image: '画像', edits: 'Edits', plus: 'Plus',
  beginners: '初心者', success: '成功', complete: '完全', features: '機能', pricing: '料金',
  comparison: '比較', agency: '代行', management: '運用', troubleshooting: 'トラブル',
};

function slugToKeywords(slug) {
  return slug.split('-').map((w) => HINTS[w] || w).filter(Boolean);
}

// { url, slug, keywords[] } の配列を返す
export async function fetchCocomarkeArticles() {
  const res = await fetch(SITEMAP, { headers: { 'user-agent': 'growth-marketing-bot/1.0' } });
  if (!res.ok) throw new Error(`cocomarke sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs
    .filter((u) => /\/blog\/[^/]+\/?$/.test(u) && !/\/blog\/?$/.test(u))
    .map((url) => {
      const slug = url.replace(/\/$/, '').split('/').pop();
      return { url, slug, keywords: slugToKeywords(slug) };
    });
}

// ブラウザ風UA（一部の公式サイトはbot系UAに403を返すため）
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
// 公式サイトがbot対策で返しがちな「ページは存在するが拒否/制限」ステータス
// 400 はMeta(facebook.com/business 等)がbotリクエストに返すチャレンジ。公式ドメイン限定の
// lenient判定でのみ参照するため、実在ページの取りこぼし防止として許容する。
const EXISTS_BUT_BLOCKED = new Set([400, 401, 403, 405, 429, 451, 503, 999]);

// 外部リンクの死活チェック。
// opts.lenient=true のとき、bot拒否系ステータス（403等）も「URLは実在」とみなす（公式出典用）。
export async function isLinkAlive(url, opts = {}) {
  const { lenient = false } = opts;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const headers = { 'user-agent': BROWSER_UA, 'accept-language': 'ja,en;q=0.8' };
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers });
    if (!res.ok && res.status !== 404) {
      // HEAD非対応やbot拒否の可能性 → GETで再確認
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers });
    }
    clearTimeout(t);
    if (res.ok) return true;
    // 404/410（不在）や5xx（サーバ障害, 503除く）は不可。lenient時のみbot拒否系を許容。
    if (lenient && EXISTS_BUT_BLOCKED.has(res.status)) return true;
    return false;
  } catch {
    return false;
  }
}
