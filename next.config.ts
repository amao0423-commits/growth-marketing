import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  // サイト内リンク・canonical・sitemap.xml はすべて末尾スラッシュ付き（/news/12/ 形式）で
  // 統一しているのに、Next.js の既定（trailingSlash: false）はスラッシュを削る方向へ
  // 308リダイレクトしていた。その結果 sitemap に載せた全URLがリダイレクト扱いになり、
  // Search Console で「ページにリダイレクトがあります」としてインデックスされなかった。
  // 既存の表記に合わせてスラッシュ付きを正規URLとする。
  trailingSlash: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
