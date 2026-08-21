import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "利用規約",
  description: "アドプレスの利用規約です。アカウント登録、記事の掲載、掲載内容の責任、禁止事項、記事の取り下げ、免責事項などを定めています。",
};

const TOC = [
  { href: "#a1", label: "第1条 適用" },
  { href: "#a2", label: "第2条 定義" },
  { href: "#a3", label: "第3条 アカウント" },
  { href: "#a4", label: "第4条 記事の投稿" },
  { href: "#a5", label: "第5条 掲載内容の責任" },
  { href: "#a6", label: "第6条 禁止事項" },
  { href: "#a7", label: "第7条 審査および掲載" },
  { href: "#a8", label: "第8条 掲載記事の紹介" },
  { href: "#a9", label: "第9条 編集および取り下げ" },
  { href: "#a10", label: "第10条 知的財産権" },
  { href: "#a11", label: "第11条 個人情報" },
  { href: "#a12", label: "第12条 免責事項" },
  { href: "#a13", label: "第13条 変更・中断・終了" },
  { href: "#a14", label: "第14条 規約の変更" },
  { href: "#a15", label: "第15条 準拠法・管轄" },
  { href: "#operator", label: "運営者情報" },
];

export default function TermsPage() {
  const html = fs.readFileSync(path.join(process.cwd(), "content/legal/terms.html"), "utf-8");
  return <LegalPage html={html} crumb="利用規約" toc={TOC} />;
}
