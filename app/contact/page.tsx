import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "アドプレスへのお問い合わせ窓口です。",
};

export default function ContactPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / お問い合わせ
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>お問い合わせ</h1>
          <p className="intro">
            アドプレスに関するお問い合わせ（掲載内容についてのご指摘、規約についてのご質問、その他）は、下記メールアドレスまでご連絡ください。件名に「アドプレス お問い合わせ」とご記載いただけますとスムーズです。
          </p>

          <div className="sig">
            <strong>お問い合わせ先</strong>
            <dl>
              <dt>運営会社</dt>
              <dd>
                <a href="https://www.cocomarke.com/about/" rel="noopener">
                  株式会社ホットセラー
                </a>
              </dd>
              <dt>所在地</dt>
              <dd>東京都中央区晴海</dd>
              <dt>メール</dt>
              <dd>
                <a href="mailto:info@cocomake-guide.com">info@cocomake-guide.com</a>
              </dd>
            </dl>
          </div>

          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: "1.6em" }}>
            投稿記事の内容に関するお問い合わせについては、事実関係を確認のうえ対応します。対応の結果、投稿者へ個別に連絡を行わない場合があります。
          </p>
        </div>
      </article>
    </div>
  );
}
