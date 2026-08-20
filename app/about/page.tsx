import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "アドプレスについて",
  description: "アドプレスは、企業・団体・個人が無料でプレスリリースを掲載できるメディアです。",
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
            アドプレス（ADPRESS）は、企業・団体・個人が無料でプレスリリースを掲載できるメディアです。Googleアカウントでログインして投稿するだけで、最短数十分で記事が公開されます。
          </p>

          <h2>特徴</h2>
          <ul>
            <li>掲載料は無料（広告枠掲載を除く）</li>
            <li>投稿は審査を待たずにそのまま公開</li>
            <li>K-POP／韓国情報／エンタメ／IT・テック／SNS・マーケ／ライフ／旅行／ビジネスの8カテゴリ</li>
            <li>マイページで投稿記事の管理・紹介リンクの提出が可能</li>
          </ul>

          <h2>広告枠掲載</h2>
          <p>
            より多くの読者に届けたいプレスリリースには、有料の広告枠掲載（1本20,000円・税別）もご用意しています。詳しくは<a href="/ad/">広告枠掲載のご案内</a>をご覧ください。
          </p>

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
              <dt>広告枠掲載</dt>
              <dd>
                <a href="mailto:a-ando@hotseller.jp">a-ando@hotseller.jp</a>
              </dd>
            </dl>
          </div>
        </div>
      </article>
    </div>
  );
}
