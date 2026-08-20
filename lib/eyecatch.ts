// アイキャッチ画像未登録の記事向けに、タイトル＋カテゴリ色からSVGを自動生成する。
// design-ref/category-korea.html の eye() をサーバーサイド（文字列生成）に移植したもの。

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
  const perLine = Math.floor(width / 26);
  const lines: string[] = [];
  let rest = title;
  while (rest.length && lines.length < 3) {
    lines.push(rest.slice(0, perLine));
    rest = rest.slice(perLine);
  }
  if (rest.length && lines.length === 3) {
    lines[2] = lines[2].slice(0, perLine - 1) + "…";
  }

  let dots = "";
  for (let y = 16; y < height; y += 22) {
    for (let x = 16; x < width; x += 22) {
      dots += `<circle cx="${x}" cy="${y}" r="1.3"/>`;
    }
  }

  const fontSize = width * 0.052;
  const startY = height / 2 - (lines.length - 1) * fontSize * 0.78;
  let text = "";
  for (let i = 0; i < lines.length; i++) {
    text += `<text x="${width * 0.07}" y="${startY + i * fontSize * 1.5}" font-family="Zen Old Mincho,serif" font-weight="700" font-size="${fontSize}" fill="${fg}">${escapeXml(
      lines[i]
    )}</text>`;
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(
    title
  )}"><rect width="${width}" height="${height}" fill="${bg}"/><g fill="${fg}" opacity=".13">${dots}</g>${text}<text x="${
    width * 0.07
  }" y="${height - width * 0.045}" font-family="Roboto Mono,monospace" font-size="${width * 0.031}" letter-spacing="${
    width * 0.011
  }" fill="${fg}" opacity=".65">ADPRESS / ${escapeXml(categoryLabel)}</text></svg>`;
}
