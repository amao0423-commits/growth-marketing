import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "利用規約",
  description: "アドプレスの利用規約です。アカウント登録、記事の掲載、掲載内容の責任、禁止事項、記事の取り下げ、広告枠掲載、免責事項などを定めています。",
};

export default function TermsPage() {
  const html = fs.readFileSync(path.join(process.cwd(), "content/legal/terms.html"), "utf-8");
  return <LegalPage html={html} crumb="利用規約" />;
}
