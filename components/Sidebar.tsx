import Link from "next/link";

type RankItem = { id: number; title: string };
type PickItem = { id: number; title: string };

// design-ref のサイドバー（広告枠パネル・注目記事ランキング・編集部記事リンク）。
// 「よく読まれた記事」は実際の閲覧数計測をまだ持たないため、断定的な表現を避け
// 「注目の記事」（＝直近の新着上位）として表示する。
export default function Sidebar({
  rankTitle = "注目の記事",
  rankItems,
  picksTitle,
  picksItems,
  extra,
}: {
  rankTitle?: string;
  rankItems: RankItem[];
  picksTitle?: string;
  picksItems?: PickItem[];
  extra?: React.ReactNode;
}) {
  return (
    <aside className="side">
      <div className="panel adslot">
        <h3>広告枠掲載のご案内</h3>
        <div className="price">
          ¥20,000<em> / 1本（税別）</em>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--action-fg)", margin: "8px 0 0", lineHeight: 1.8 }}>
          月額費用ではなく、1回ごとの掲載としてご利用いただけます。
        </p>
        <ul>
          <li>記事の作成代行（1,500字程度・任意）</li>
          <li>リンクを5本まで挿入可（通常は2本まで）</li>
          <li>トップのPR枠に7日間固定表示</li>
          <li>カテゴリ上部に14日間表示</li>
          <li>画像5点まで／記事は恒久掲載</li>
          <li>掲載1ヶ月後にPVレポートを公開</li>
          <li>紹介リンクの提出は不要</li>
        </ul>
        <a href="mailto:a-ando@hotseller.jp?subject=%E3%82%A2%E3%83%89%E3%83%97%E3%83%AC%E3%82%B9%20%E5%BA%83%E5%91%8A%E6%9E%A0%E6%8E%B2%E8%BC%89%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87">
          広告枠の掲載を相談する
        </a>
        <p className="note">お支払いは掲載後の請求書払いです。</p>
      </div>

      {rankItems.length > 0 && (
        <div className="panel">
          <h3>{rankTitle}</h3>
          <ol className="rank">
            {rankItems.map((a, i) => (
              <li key={a.id}>
                <span className="n mono">{i + 1}</span>
                <Link href={`/news/${a.id}/`}>{a.title}</Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {picksItems && picksItems.length > 0 && (
        <div className="panel">
          <h3>{picksTitle}</h3>
          <ul className="biz-list">
            {picksItems.map((a) => (
              <li key={a.id}>
                <Link href={`/news/${a.id}/`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {extra}
    </aside>
  );
}
