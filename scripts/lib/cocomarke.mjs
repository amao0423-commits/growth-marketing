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

// 外部リンクの死活チェック（200系/3xxを許容）。タイムアウト付き。
export async function isLinkAlive(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'growth-marketing-bot/1.0' } });
    if (res.status === 405 || res.status === 403) {
      // 一部サーバはHEAD非対応 → GETで再確認
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'growth-marketing-bot/1.0' } });
    }
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}
