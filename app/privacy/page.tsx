import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "アドプレスにおける個人情報の取り扱いについて定めたプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / プライバシーポリシー
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>プライバシーポリシー</h1>
          <div className="updated">制定 2026年8月20日</div>

          <div className="legal-note">
            <strong>このポリシーは雛形です。</strong>実際の運用開始前に、必ず弁護士等の専門家によるレビューを受けてください。
          </div>

          <p className="intro">
            株式会社ホットセラー（以下「当社」）は、プレスリリース掲載サービス「アドプレス」（以下「本サービス」）における利用者の個人情報を、以下の方針にもとづき適切に取り扱います。
          </p>

          <h2>1. 取得する情報</h2>
          <ul>
            <li>Googleアカウントによるログイン時に取得する氏名・メールアドレス</li>
            <li>投稿記事の入力内容（会社名・団体名・連絡先メールアドレス・電話番号・URL等）</li>
            <li>本サービスの利用状況に関するアクセスログ</li>
          </ul>

          <h2>2. 利用目的</h2>
          <ul>
            <li>本サービスの提供・運営（ログイン認証、投稿記事の管理、マイページの表示）</li>
            <li>お知らせ・重要な連絡の送付</li>
            <li>不正利用の防止、規約違反への対応</li>
            <li>サービス改善のための分析</li>
          </ul>

          <h2>3. 第三者提供</h2>
          <p>
            当社は、法令に定める場合を除き、利用者の同意なく個人情報を第三者に提供しません。ただし、投稿者が記事内で公開を選択した連絡先（メールアドレス・電話番号・URL）は、記事とともに公開されます。
          </p>

          <h2>4. 委託先</h2>
          <p>
            本サービスは、データベース・認証基盤としてSupabase Inc.を、ホスティングとしてVercel Inc.を利用しています。これらの委託先における情報の取り扱いは、各社のプライバシーポリシーに従います。
          </p>

          <h2>5. Cookieについて</h2>
          <p>
            本サービスは、ログイン状態を維持するためにCookieを使用します。Cookieを無効にした場合、ログインが必要な機能をご利用いただけないことがあります。
          </p>

          <h2>6. 開示・訂正・削除等の請求</h2>
          <p>
            利用者は、当社が保有する自己の個人情報について、開示・訂正・削除等を請求することができます。ご希望の場合は、下記のお問い合わせ先までご連絡ください。
          </p>

          <h2>7. お問い合わせ窓口</h2>
          <p>
            本ポリシーに関するお問い合わせは、下記までご連絡ください。
          </p>

          <div className="sig">
            <strong>運営者情報</strong>
            <dl>
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

          <p style={{ marginTop: "1.6em", fontSize: 13, color: "var(--ink-3)" }}>以上</p>
        </div>
      </article>
    </div>
  );
}
