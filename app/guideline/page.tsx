import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "掲載ガイドライン",
  description: "アドプレスへの記事掲載にあたってのルールをまとめたガイドラインです。",
};

export default function GuidelinePage() {
  const html = fs.readFileSync(path.join(process.cwd(), "content/legal/guideline.html"), "utf-8");
  return <LegalPage html={html} crumb="掲載ガイドライン" />;
}
