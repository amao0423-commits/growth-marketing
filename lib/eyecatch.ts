// アイキャッチ画像未登録の記事向けに、カテゴリ色からSVGを自動生成する。
// タイトルの文字はサムネイルに入れない（可読性が低く、崩れて見えるため）。
// カテゴリ色の背景＋ドットパターン＋簡易エンブレム＋「ADPRESS / カテゴリ名」ラベルのみで構成する。

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateEyecatchSvg(opts: {
  title: string;
  bg: string;
  fg: string;
  categoryLabel: string;
  width?: number;
  height?: number;
}): string {
  const { title, bg, fg, categoryLabel, width = 400, height = 210 } = opts;

  let dots = "";
  for (let y = 14; y < height; y += 22) {
    for (let x = 14; x < width; x += 22) {
      dots += `<circle cx="${x}" cy="${y}" r="1.3"/>`;
    }
  }

  // 装飾用の簡易エンブレム（円のネットワーク）。中央にざっくり配置する。
  const cx = width / 2;
  const cy = height / 2;
  const r1 = height * 0.16;
  const r2 = height * 0.1;
  const emblem = `
    <g fill="none" stroke="${fg}" stroke-width="1.2" opacity=".45">
      <line x1="${cx - r1 * 1.6}" y1="${cy}" x2="${cx}" y2="${cy - r1}" />
      <line x1="${cx}" y1="${cy - r1}" x2="${cx + r1 * 1.6}" y2="${cy}" />
      <line x1="${cx - r1 * 1.6}" y1="${cy}" x2="${cx}" y2="${cy + r1}" />
      <line x1="${cx}" y1="${cy + r1}" x2="${cx + r1 * 1.6}" y2="${cy}" />
    </g>
    <circle cx="${cx - r1 * 1.6}" cy="${cy}" r="${r2}" fill="${fg}" opacity=".85"/>
    <circle cx="${cx}" cy="${cy - r1}" r="${r2 * 0.7}" fill="${fg}" opacity=".55"/>
    <circle cx="${cx}" cy="${cy + r1}" r="${r2 * 0.7}" fill="${fg}" opacity=".55"/>
    <circle cx="${cx + r1 * 1.6}" cy="${cy}" r="${r2}" fill="${fg}" opacity=".85"/>
  `;

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(
    title
  )}"><rect width="${width}" height="${height}" fill="${bg}"/><g fill="${fg}" opacity=".13">${dots}</g>${emblem}<text x="${
    width * 0.07
  }" y="${height - width * 0.045}" font-family="Roboto Mono,monospace" font-size="${width * 0.031}" letter-spacing="${
    width * 0.011
  }" fill="${fg}" opacity=".65">ADPRESS / ${escapeXml(categoryLabel)}</text></svg>`;
}
