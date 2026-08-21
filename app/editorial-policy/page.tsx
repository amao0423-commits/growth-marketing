import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "編集ポリシー",
  description: "アドプレスに掲載される記事の種類と、編集部の関与範囲について説明します。",
};

export default function EditorialPolicyPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / 編集ポリシー
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>編集ポリシー</h1>
          <div className="updated">最終改定 2026年8月20日</div>

          <p className="intro">
            アドプレスに掲載される記事の位置づけと、編集部の関与範囲を説明します。現在、記事の投稿は編集部アカウントに限定しています。
          </p>

          <h2>投稿記事について</h2>
          <p>
            投稿記事は、編集部アカウントから作成し、掲載したものです。掲載前にルールベースの自動チェック（NGワードの検出など）を実施しますが、これは明らかに不適切な投稿を早期に見つけるための補助的な仕組みであり、内容の正確性や適法性を保証するものではありません。
          </p>
          <p>
            投稿記事の内容についての責任は、記事の発信元に帰属します。詳しくは<a href="/terms/">利用規約</a>および<a href="/guideline/">掲載ガイドライン</a>をご覧ください。
          </p>

          <h2>編集部記事について</h2>
          <p>
            「編集部」と表示された記事は、アドプレスの運営チームが作成したものです。マーケティング・SNS運用などに関するノウハウ記事を中心に掲載しています。
          </p>

          <h2>訂正・削除について</h2>
          <p>
            掲載内容に誤りや問題があると判明した場合、編集部の判断で記事を削除または非公開にすることがあります。この措置にあたり、投稿者への事前連絡は行いません（<a href="/terms/">利用規約第9条</a>）。内容についてお気づきの点がある場合は、<a href="/report/">掲載内容に関するご連絡フォーム</a>または<a href="/contact/">お問い合わせ</a>からご連絡ください。
          </p>

          <div className="sig">
            <strong>お問い合わせ</strong>
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
        </div>
      </article>
    </div>
  );
}
