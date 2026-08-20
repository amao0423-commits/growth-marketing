import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "掲載ガイドライン",
  description: "アドプレスへの記事掲載にあたってのルールをまとめたガイドラインです。",
};

const TOC = [
  { href: "#about", label: "1. アドプレスについて" },
  { href: "#who", label: "2. 掲載できる方" },
  { href: "#what", label: "3. 掲載できる内容" },
  { href: "#ng", label: "4. 掲載できない内容" },
  { href: "#write", label: "5. 記事の書き方" },
  { href: "#links", label: "6. リンクと画像" },
  { href: "#review", label: "7. AI自動審査" },
  { href: "#share", label: "8. 掲載後のご紹介" },
  { href: "#edit", label: "9. 記事の編集" },
  { href: "#remove", label: "10. 記事の取り下げ" },
  { href: "#ad", label: "11. 広告枠掲載" },
  { href: "#disclaimer", label: "12. 免責事項" },
  { href: "#contact", label: "13. お問い合わせ" },
];

export default function GuidelinePage() {
  const html = fs.readFileSync(path.join(process.cwd(), "content/legal/guideline.html"), "utf-8");
  return <LegalPage html={html} crumb="掲載ガイドライン" toc={TOC} />;
}
