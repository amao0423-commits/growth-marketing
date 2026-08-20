# SEOブログ自動更新システム — 実装計画

> 目的：最新トレンド／Google検索意図に最適化したSEO記事を **週2回・全自動** で生成し本番公開する。
> 記事内には cocomarke.com/blog への**相互リンク**と、公式・一次情報への**被リンク（出典）を数本**自動挿入する。

確定方針：**GitHub Actions で実行** / **独自ドメインで運用** / **自動で本番公開**

---

## 1. アーキテクチャ全体像

```
          ┌─────────────── GitHub Actions (cron 週2回) ───────────────┐
          │  1. topics.json から次トピック選定（カテゴリ輪番・重複回避）  │
          │  2. Anthropic API + Web検索ツール で最新トレンド/事実を収集   │
          │  3. cocomarke sitemap.xml を取得 → 関連記事を相互リンク候補に │
          │  4. Claude が記事HTMLを生成（テンプレ準拠・SEOフル装備）      │
          │  5. 品質ゲート（LLM審査 + リンク死活/重複/文字数チェック）    │
          │  6. blog/index.html へカード追加 / sitemap.xml へURL追加     │
          │  7. topics.json 更新 → git commit & push                   │
          └────────────────────────────┬───────────────────────────────┘
                                        │ push（main）
                                        ▼
                            Vercel Git連携 → 自動ビルド&本番公開
                                        ▼
                          https://（独自ドメイン）/blog/＜slug＞
```

PCの電源に依存せず、24時間クラウドで完結する。

---

## 2. 一度だけの初期セットアップ（基盤づくり）

| # | 作業 | 内容 |
|---|------|------|
| 2-1 | Git化 & GitHub | このフォルダを `git init` → GitHubの新規プライベートリポジトリへpush |
| 2-2 | Vercel Git連携 | 既存 `growth-marketing` プロジェクトをGitHubリポジトリに接続（以後 push で自動デプロイ） |
| 2-3 | 独自ドメイン | **`nishinippon-adv.jp`** を使用。VercelにドメインとDNSを設定（Vercelの自動TLSでHTTPSも解決）。`growth-marketing.example.com` プレースホルダを `https://www.nishinippon-adv.jp` へ一括置換（canonical/OGP/sitemap、計16箇所）。**※現在このドメインには既存サイトが稼働中のため、接続＝既存サイトの置き換えになる点を事前確認すること** |
| 2-4 | APIキー | Anthropic APIキーを GitHub Secrets（`ANTHROPIC_API_KEY`）に登録。Web検索ツール利用可 |
| 2-5 | 公開設定 | `robots.txt`・`sitemap.xml` を新ドメイン基準に。Google Search Console へドメイン登録＆サイトマップ送信（流入計測の起点） |

---

## 3. 週2回 実行されるパイプライン（自動化の本体）

新規ファイル：
- `scripts/generate-post.mjs` … 生成オーケストレータ（Node.js / Anthropic SDK）
- `scripts/lib/template.mjs` … 記事HTML・カード・サムネSVGのレンダラ（既存テンプレ完全準拠）
- `scripts/lib/links.mjs` … cocomarke相互リンク・公式被リンクの選定ロジック
- `content/topics.json` … トピック台帳（キーワードクラスタ・公開済みslug・カテゴリ輪番状態）
- `.github/workflows/publish.yml` … cron トリガー

**処理ステップ**
1. **トピック選定** — `topics.json` の5カテゴリ（SNS運用/広告運用/コンテンツ/SEO/ブランディング）を輪番。直近公開と重複しない検索ニーズの高いテーマを選ぶ。
2. **トレンド収集** — Anthropic APIのWeb検索ツールで「該当テーマ × 2026最新動向 × 検索上位の論点」を調査。一次情報URL（出典候補）も同時取得。
3. **相互リンク候補抽出** — `https://www.cocomarke.com/sitemap.xml` を取得し記事URL/タイトル/キーワードを索引化。本文に出る語句と一致する記事を **1〜3本** 選定（例：「リール」「保存数」→ instagram-reels-saves-increase 等）。
4. **本文生成** — Claudeが見出し設計（検索意図に沿うH2/H3）・本文・目次・まとめを生成。SEO要件（§4）と挿入リンク（§5）を満たす。
5. **HTMLレンダリング** — 既存テンプレ（header/パンくず/hero/カバーSVG/article-body/CTA/関連記事/footer）へ流し込み、`blog/＜slug＞.html` を出力。
6. **品質ゲート（§6）** — 通過したもののみ公開。落ちたら再生成（最大N回）。
7. **インデックス反映** — `blog/index.html` の先頭にカード挿入（`data-cat`付き）、`sitemap.xml` にURL追加、`topics.json` 更新。
8. **公開** — commit & push → Vercelが自動デプロイ。

---

## 4. 全記事に必ず入るSEO仕様

- `<title>`（32文字前後・主要KW前方）/ `meta description`（120字前後）/ `meta keywords`
- `canonical`（新ドメイン絶対URL）/ OGP（og:type=article, title, description, section）
- 構造化データ `BlogPosting`（headline / description / **datePublished（実行日）** / articleSection / author / publisher）
- パンくず（ホーム / ブログ / カテゴリ）
- 検索意図に沿う見出し階層・目次（TOC）・読了時間・公開日表示
- 適切なKW密度、内部リンク（GM内の関連記事3本＝既存テンプレの「関連記事」枠を自動選定）
- カテゴリ別カラーの軽量インラインSVGサムネ（画像リクエスト0・高速表示＝Core Web Vitals配慮）

---

## 5. リンク戦略（ご要望の中核）

**A. cocomarke 相互リンク（内部ネットワーク強化）**
- 出典：`cocomarke.com/sitemap.xml`（機械可読・確認済み）。
- 本文中に関連語句が出た箇所へ **文脈リンクを1〜3本**（アンカーテキストは自然な語句）。
- `rel` は通常リンク（follow）。記事末「あわせて読みたい」枠にもcocomarke記事を併設可。

**B. 公式・一次情報への被リンク（E-E-A-T／信頼性）**
- **1記事あたり2〜4本**、権威ドメインのみ許可リスト方式で挿入：
  Google検索セントラル / Meta Business Help / Instagram / TikTok for Business / Think with Google / 総務省・各社公式リリース等。
- Web検索で得た一次情報URLを優先。死活チェック（200応答）を通過したものだけ採用。
- `rel="noopener"`、外部は新規タブ。引用は出典明記。

---

## 6. 品質ゲート（自動本番公開のための安全装置）

Googleの「スケール化されたコンテンツの悪用」ポリシー対策として、公開前に自動審査：
- **LLM審査**：独自性・検索意図充足・実用性・自然さを採点。基準未満は再生成。
- **機械チェック**：①既存slug/タイトルと重複しない ②最低文字数 ③schema が有効JSON ④全外部リンクが200 ⑤相互リンク1本以上・被リンク2本以上を満たす ⑥禁止表現なし。
- すべて通過 → 公開。N回再生成しても落ちる場合はスキップしログ通知（無理に公開しない）。

---

## 7. トピック戦略（流入を伸ばす設計）

- `topics.json` に **キーワードクラスタ**（柱テーマ＋関連ロングテール）を定義し、トピッククラスタ構造で内部リンクを相互に張る（Googleの評価が集まりやすい構造）。
- 検索ボリュームのある実需テーマを優先、季節・最新動向（アルゴリズム更新等）を都度反映。
- 公開ごとに台帳更新で重複・カニバリ回避。

---

## 8. スケジュール

- GitHub Actions cron：**週2回（例：火・金 09:00 JST）**。曜日・時刻は調整可。
- 手動実行（`workflow_dispatch`）も用意し、いつでもオンデマンド生成可能。

---

## 9. 着手にあたり必要なもの / 次アクション

| 必要なもの | 補足 |
|------------|------|
| ① 独自ドメイン | **`nishinippon-adv.jp` に確定**。要確認：既存稼働サイトの置き換えでよいか／DNS管理権限（ネームサーバーまたはAレコード変更）があるか |
| ② GitHubアカウント連携 | リポジトリ作成＆Vercel Git連携に使用 |
| ③ Anthropic APIキー | 記事生成・Web検索の実行に必要（GitHub Secretsに登録） |
| ④ 曜日/時刻の確定 | 既定は火・金 09:00 JST |

**承認後の実装順**：2.基盤セットアップ → 3.スクリプト＆ワークフロー実装 → テスト実行で1記事生成・公開を確認 → cron有効化。
