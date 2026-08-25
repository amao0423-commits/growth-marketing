import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // ログイン専用・投稿フォーム・通報フォーム・API・認証コールバックは
        // 個人ごとの内容/低SEO価値のためクロール対象外にする。
        disallow: ["/mypage/", "/login/", "/auth/", "/api/", "/submit/", "/report/", "/ad/apply/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
