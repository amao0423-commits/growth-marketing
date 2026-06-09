# Growth Marketing — マーケティングサイト

SNS運用・広告運用に特化したマーケティング代行会社向けの静的サイトです。

## 構成
- `index.html` … トップページ
- `contact.html` … お問い合わせ／無料相談フォーム
- `blog/index.html` … ブログ一覧（カテゴリー絞り込み付き）
- `blog/*.html` … ブログ記事（全10本：SNS運用・広告運用・コンテンツ・SEO・ブランディング 各2本）
- `style.css` / `main.js` … 共通スタイル・スクリプト
- `sitemap.xml` / `robots.txt` … SEO用
- `vercel.json` … Vercel設定

## Vercelへのデプロイ
### 方法1：CLI
```bash
npm i -g vercel
vercel        # プレビュー
vercel --prod # 本番公開
```

### 方法2：GitHub連携（推奨）
1. このフォルダをGitHubリポジトリにpush
2. vercel.com で「New Project」→ リポジトリを選択
3. フレームワークは「Other（静的サイト）」のまま Deploy

ビルド設定は不要です（純粋な静的HTML）。

## カスタマイズのヒント
- ブランド名 `Growth Marketing` は各HTMLの `.brand` と `<title>` を置換
- `https://growth-marketing.example.com` を本番ドメインに一括置換（canonical / OGP / sitemap）
- 問い合わせフォームは現在フロント完結のデモ。実送信には Formspree や Vercel Functions の接続が必要
# growth-marketing
