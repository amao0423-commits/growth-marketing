import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "記事掲載のご相談",
  description: "サービスや発表をアドプレスの記事として届けたい方向けのご相談窓口です。",
};

export default function ArticlePlacementPage() {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <Link href="/">ホーム</Link> / 記事掲載のご相談
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body">
          <h1>記事掲載のご相談</h1>
          <p className="intro">
            あなたのサービス、イベント、新商品、取り組みをアドプレスの記事として届けませんか。編集部が内容を確認し、読者に伝わる形で掲載の進め方をご案内します。
          </p>

          <div className="callout">
            <h2>まずは掲載したい内容をお聞かせください</h2>
            <p>
              まだ原稿がなくても大丈夫です。サービスページ、資料、発表予定日、届けたい読者像など、決まっている範囲でご相談ください。
            </p>
          </div>

          <h2>相談できる内容</h2>
          <ul>
            <li>サービスや商品の紹介記事</li>
            <li>イベント、キャンペーン、店舗オープンなどの発表</li>
            <li>企業・団体の取り組みや実績の紹介</li>
            <li>記事化に向けた見出し、構成、掲載カテゴリの相談</li>
          </ul>

          <p>
            <a className="article-consult-btn" href="mailto:info@cocomake-guide.com?subject=%E3%82%A2%E3%83%89%E3%83%97%E3%83%AC%E3%82%B9%20%E8%A8%98%E4%BA%8B%E6%8E%B2%E8%BC%89%E3%81%AE%E7%9B%B8%E8%AB%87">
              記事掲載を相談する
            </a>
          </p>
        </div>
      </article>
    </div>
  );
}
