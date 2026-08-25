import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/categories";
import { SITE_URL } from "@/lib/site";

// 1時間ごとに再生成。新着記事はこの間隔でsitemapに反映される。
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "hourly", priority: 1 },
  { path: "/about/", changeFrequency: "yearly", priority: 0.4 },
  { path: "/contact/", changeFrequency: "yearly", priority: 0.4 },
  { path: "/editorial-policy/", changeFrequency: "yearly", priority: 0.3 },
  { path: "/guideline/", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy/", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms/", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    changeFrequency: "hourly",
    priority: 0.7,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: articles } = await supabase
      .from("articles")
      .select("id, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50000);
    articleEntries = (articles || []).map((a) => ({
      url: `${SITE_URL}/news/${a.id}/`,
      lastModified: new Date(a.updated_at ?? a.published_at),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  }

  return [...staticEntries, ...categoryEntries, ...articleEntries];
}
