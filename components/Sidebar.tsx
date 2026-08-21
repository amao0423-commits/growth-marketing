import Link from "next/link";

type RankItem = { id: number; title: string };
type PickItem = { id: number; title: string };

// design-ref のサイドバー（注目記事ランキング・編集部記事リンク）。
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

      <div className="panel placement-cta">
        <h3>記事掲載のご相談</h3>
        <p className="lead">あなたのサービスを、読者に届く記事として紹介しませんか。</p>
        <ul>
          <li>新商品・サービスの紹介</li>
          <li>イベントやキャンペーンの告知</li>
          <li>編集部による記事化の相談</li>
        </ul>
        <a href="mailto:a-ando@hotseller.jp?subject=%E3%82%A2%E3%83%89%E3%83%97%E3%83%AC%E3%82%B9%20%E8%A8%98%E4%BA%8B%E6%8E%B2%E8%BC%89%E3%81%AE%E7%9B%B8%E8%AB%87">記事掲載を相談する</a>
      </div>

      {extra}
    </aside>
  );
}
