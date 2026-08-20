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

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" });
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type DayGroup<T> = {
  key: string;
  day: string;
  month: string;
  weekday: string;
  items: T[];
};

// JST日付ごとに記事をグルーピングする（design-ref の daygroup/daymark と対応）。
export function groupByDay<T extends { published_at: string }>(items: T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const d = new Date(item.published_at);
    const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const key = `${jst.getFullYear()}-${jst.getMonth()}-${jst.getDate()}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        day: String(jst.getDate()).padStart(2, "0"),
        month: MONTH_EN[jst.getMonth()],
        weekday: WEEKDAY_JA[jst.getDay()],
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

// 24時間以内に公開された記事は「新着」として強調する
export function isFresh(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}
