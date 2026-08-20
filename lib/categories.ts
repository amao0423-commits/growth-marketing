// カテゴリ定義（design-ref/adpress.css の --c-*-bg/--c-*-fg と対応）
export type CategorySlug =
  | "kpop"
  | "korea"
  | "ent"
  | "tech"
  | "sns"
  | "life"
  | "trip"
  | "biz";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: "kpop", label: "K-POP" },
  { slug: "korea", label: "韓国情報" },
  { slug: "ent", label: "エンタメ" },
  { slug: "tech", label: "IT・テック" },
  { slug: "sns", label: "SNS・マーケ" },
  { slug: "life", label: "ライフ" },
  { slug: "trip", label: "旅行" },
  { slug: "biz", label: "ビジネス" },
];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORIES.some((c) => c.slug === value);
}
