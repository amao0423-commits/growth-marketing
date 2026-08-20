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
  bg: string;
  fg: string;
}

// app/globals.css の --c-*-bg / --c-*-fg と対応
export const CATEGORIES: CategoryDef[] = [
  { slug: "kpop", label: "K-POP", bg: "#FFD9E4", fg: "#8A3A55" },
  { slug: "korea", label: "韓国情報", bg: "#FFE2CC", fg: "#94502A" },
  { slug: "ent", label: "エンタメ", bg: "#E7DCFF", fg: "#5B429B" },
  { slug: "tech", label: "IT・テック", bg: "#D6E7FF", fg: "#2B5A93" },
  { slug: "sns", label: "SNS・マーケ", bg: "#D3F0E4", fg: "#1F6B52" },
  { slug: "life", label: "ライフ", bg: "#FFF0C4", fg: "#846412" },
  { slug: "trip", label: "旅行", bg: "#CDECF2", fg: "#1F6A76" },
  { slug: "biz", label: "ビジネス", bg: "#E3E5EA", fg: "#474E5C" },
];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function categoryDef(slug: string): CategoryDef {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug: slug as CategorySlug, label: slug, bg: "#E3E5EA", fg: "#474E5C" };
}

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORIES.some((c) => c.slug === value);
}
