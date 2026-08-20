// 記事一覧・記事詳細ページで共通して使う型と取得ロジック。

export type ArticleListItem = {
  id: number;
  title: string;
  excerpt: string | null;
  category_slug: string;
  contact_org: string;
  cover_url: string | null;
  is_sponsored: boolean;
  published_at: string;
};

export const ARTICLE_LIST_SELECT =
  "id, title, excerpt, category_slug, contact_org, cover_url, is_sponsored, published_at";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
