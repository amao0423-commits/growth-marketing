// アイキャッチ画像未登録の記事向けに、カテゴリ色からSVGを自動生成する。
//
// 設計方針:
//   - タイトルの文字はサムネイルに入れない（小サイズでの可読性が低く、崩れて見えるため）。
//   - カテゴリごとに別のモチーフを描く。全カテゴリ共通の図形だと「仮画像」に見えるため。
//   - 記事タイトルから決定的な乱数を作り、構図（モチーフ位置・装飾円・回転）を記事ごとに変える。
//     同じカテゴリの記事が並んでも同じ絵にならないようにするのが目的。
//   - 同じ記事なら毎回まったく同じ絵になる（サーバー/クライアントで差が出るとhydration不一致になる）。

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// タイトル→32bitハッシュ。乱数の種にする。
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 種から決定的に 0..1 の値を順番に取り出すジェネレータ（mulberry32）
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

// 2色を t の割合で混ぜる（0=c1, 1=c2）
function mix(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const to2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to2(r1 + (r2 - r1) * t)}${to2(g1 + (g2 - g1) * t)}${to2(b1 + (b2 - b1) * t)}`;
}

// カテゴリ別モチーフ。すべて 0..100 の座標系で描き、呼び出し側で拡大・移動する。
// 線画（stroke）で統一し、塗りは使わない。細部を作り込むと縮小時に潰れるため、大きな形だけで構成する。
const MOTIFS: Record<string, string> = {
  // K-POP: 音符
  kpop: `<path d="M38 72V22l40-10v50" />
         <circle cx="28" cy="72" r="11" />
         <circle cx="68" cy="62" r="11" />`,
  // 韓国情報: 太極風の円（S字で二分割）
  korea: `<circle cx="50" cy="50" r="34" />
          <path d="M50 16a17 17 0 0 1 0 34 17 17 0 0 0 0 34" />`,
  // エンタメ: 再生ボタン
  ent: `<circle cx="50" cy="50" r="34" />
        <path d="M42 34l26 16-26 16z" stroke-linejoin="round" />`,
  // IT・テック: チップ（中央の四角＋ピン）
  tech: `<rect x="30" y="30" width="40" height="40" rx="5" />
         <path d="M42 30V16M58 30V16M42 84V70M58 84V70M30 42H16M30 58H16M84 42H70M84 58H70" />`,
  // SNS・マーケ: 吹き出し2つ
  sns: `<path d="M14 26h50a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H38L24 76V64h-10a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8z" transform="translate(6 -4)" stroke-linejoin="round" />
        <path d="M52 44h30a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-4v10L64 78H52" stroke-linejoin="round" />`,
  // ライフ: 家
  life: `<path d="M20 48L50 22l30 26" stroke-linejoin="round" />
         <path d="M28 44v34h44V44" stroke-linejoin="round" />
         <path d="M42 78V58h16v20" stroke-linejoin="round" />`,
  // 旅行: 紙飛行機
  trip: `<path d="M88 18L12 48l30 10 8 26 14-22 18 6z" stroke-linejoin="round" />
         <path d="M42 58l46-40" />`,
  // ビジネス: 棒グラフ＋上向きの線
  biz: `<path d="M16 84h68" />
        <path d="M28 84V58M46 84V44M64 84V52M82 84V28" />
        <path d="M24 46l20-14 18 8 22-20" stroke-linejoin="round" />`,
};

const DEFAULT_MOTIF = MOTIFS.biz;

export function generateEyecatchSvg(opts: {
  title: string;
  bg: string;
  fg: string;
  categoryLabel: string;
  categorySlug?: string;
  width?: number;
  height?: number;
}): string {
  const { title, bg, fg, categoryLabel, categorySlug, width = 400, height = 210 } = opts;

  const seed = hashString(`${title}|${categorySlug ?? categoryLabel}`);
  const rnd = makeRng(seed);
  // defs の id はページ内で衝突しないよう種を含める（同一記事なら同じ値＝重複しても実害なし）
  const uid = `ec${seed.toString(36)}`;

  const deep = mix(bg, fg, 0.22); // 背景グラデーションの濃い側
  const short = Math.min(width, height);

  // --- 背景の装飾円。位置と大きさを記事ごとに散らす ---
  const blobs = Array.from({ length: 3 }, (_, i) => {
    const r = short * (0.34 + rnd() * 0.3);
    const cx = width * (rnd() * 1.1 - 0.05);
    const cy = height * (rnd() * 1.1 - 0.05);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fg}" opacity="${(0.05 + i * 0.018).toFixed(3)}"/>`;
  }).join("");

  // --- ドットのテクスチャ ---
  const step = Math.max(14, Math.round(short / 9));
  let dots = "";
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      dots += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(short * 0.006).toFixed(2)}"/>`;
    }
  }

  // --- カテゴリモチーフ。中央付近で、記事ごとに少しだけ位置と角度を変える ---
  const motif = MOTIFS[categorySlug ?? ""] ?? DEFAULT_MOTIF;
  const mSize = short * 0.52;
  const mScale = mSize / 100;
  const mx = width * 0.5 - mSize / 2 + (rnd() - 0.5) * width * 0.1;
  const my = height * 0.46 - mSize / 2 + (rnd() - 0.5) * height * 0.1;
  const mRot = (rnd() - 0.5) * 10;
  const strokeW = (100 / mSize) * short * 0.016;

  const motifGroup =
    `<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) scale(${mScale.toFixed(4)}) rotate(${mRot.toFixed(
      2
    )} 50 50)" fill="none" stroke="${fg}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" opacity="0.62">${motif}</g>`;

  // --- 下部のラベル ---
  // 大きい枠（記事詳細の1000x520など）でそのまま比例させるとラベルが主役級に太るので、
  // 小さい枠では下限9pxを保ちつつ、大きくなるほど比率を抑える。
  const labelSize = Math.max(9, Math.min(short * 0.045, 20));
  const label =
    `<text x="${(width * 0.055).toFixed(0)}" y="${(height - short * 0.06).toFixed(0)}" ` +
    `font-family="Roboto Mono, ui-monospace, monospace" font-size="${labelSize.toFixed(1)}" ` +
    `letter-spacing="${(labelSize * 0.18).toFixed(2)}" fill="${fg}" opacity="0.7">ADPRESS / ${escapeXml(categoryLabel)}</text>`;

  // preserveAspectRatio は既定が "meet"（＝contain）で、サムネイル枠と比率が違うと
  // 中央に余白付きで縮小配置されてしまう。写真の <img> と同じ cover 挙動にするため slice を指定する。
  return (
    `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(
      title
    )}">` +
    `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#${uid})"/>` +
    blobs +
    `<g fill="${fg}" opacity="0.1">${dots}</g>` +
    motifGroup +
    label +
    `</svg>`
  );
}
