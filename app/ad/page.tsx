import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "広告枠掲載のご案内",
  description: "アドプレスの広告枠掲載（PR記事）のご案内です。1本20,000円（税別）、請求書払いでご利用いただけます。",
};

export default function AdPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / 広告枠掲載のご案内
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>広告枠掲載のご案内</h1>
          <p className="intro">
            ここ一番で届けたいプレスリリースには、有料の広告枠掲載をご用意しています。月額費用ではなく、1回ごとの掲載としてご利用いただけます。
          </p>

          <div
            style={{
              background: "var(--action-bg)",
              color: "var(--action-fg)",
              borderRadius: 12,
              padding: "24px 26px",
              margin: "0 0 1.6em",
            }}
          >
            <div className="mono" style={{ fontSize: 30, fontWeight: 500, marginBottom: 10 }}>
              ¥20,000<em style={{ fontStyle: "normal", fontSize: 13, fontFamily: "var(--font-body)" }}> / 1本（税別）</em>
            </div>
            <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9 }}>
              <li>記事の作成代行（1,500字程度・任意）</li>
              <li>リンクを5本まで挿入可（通常は2本まで）</li>
              <li>トップページのPR枠に7日間固定表示</li>
              <li>カテゴリ上部に14日間表示</li>
              <li>画像5点まで／記事は恒久掲載</li>
              <li>掲載1ヶ月後にPVレポートを公開</li>
              <li>紹介リンクの提出は不要</li>
            </ul>
            <a
              href="mailto:a-ando@hotseller.jp?subject=%E3%82%A2%E3%83%89%E3%83%97%E3%83%AC%E3%82%B9%20%E5%BA%83%E5%91%8A%E6%9E%A0%E6%8E%B2%E8%BC%89%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87"
              style={{
                display: "block",
                textAlign: "center",
                height: 46,
                lineHeight: "46px",
                borderRadius: 99,
                background: "var(--action-fg)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14.5,
                textDecoration: "none",
              }}
            >
              広告枠の掲載を相談する
            </a>
            <p style={{ fontSize: 11.5, opacity: 0.8, margin: "10px 0 0" }}>お支払いは掲載後の請求書払いです。オンライン決済はご利用いただけません。</p>
          </div>

          <h2>掲載の流れ</h2>
          <ol className="art">
            <li>上記メールアドレスへご相談ください。内容を確認のうえ、掲載の可否を回答します。</li>
            <li>原稿をご用意いただくか、作成代行をご依頼ください。</li>
            <li>審査ののち掲載し、掲載後に請求書を発行します。銀行振込にてお支払いください。</li>
          </ol>

          <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            広告枠掲載にも、通常の投稿記事と同様に<a href="/guideline/">掲載ガイドライン</a>および<a href="/terms/">利用規約</a>が適用されます。
          </p>
        </div>
      </article>
    </div>
  );
}
