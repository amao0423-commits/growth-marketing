import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "アドプレスについて",
  description: "アドプレスは、編集部が確認したプレスリリースやニュースを掲載するメディアです。",
};

export default function AboutPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / アドプレスについて
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>アドプレスについて</h1>

          <p className="intro">
            アドプレス（ADPRESS）は、編集部が確認したプレスリリースやニュースを掲載するメディアです。現在、記事の投稿は編集部アカウントに限定しています。
          </p>

          <h2>特徴</h2>
          <ul>
            <li>掲載料は無料</li>
            <li>編集部アカウントからの記事投稿に対応</li>
            <li>K-POP／韓国情報／エンタメ／IT・テック／SNS・マーケ／ライフ／旅行／ビジネスの8カテゴリ</li>
            <li>マイページで記事の状態やお知らせを確認可能</li>
          </ul>

          <div className="sig">
            <strong>運営者情報</strong>
            <dl>
              <dt>サービス名</dt>
              <dd>アドプレス（ADPRESS）</dd>
              <dt>運営会社</dt>
              <dd>
                <a href="https://www.cocomarke.com/about/" rel="noopener">
                  株式会社ホットセラー
                </a>
              </dd>
              <dt>所在地</dt>
              <dd>東京都中央区晴海</dd>
              <dt>お問い合わせ</dt>
              <dd>
                <a href="/contact/">お問い合わせフォーム</a>
              </dd>
            </dl>
          </div>
        </div>
      </article>
    </div>
  );
}
