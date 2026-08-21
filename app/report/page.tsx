import type { Metadata } from "next";
import ReportForm from "./ReportForm";

export const metadata: Metadata = {
  title: "掲載内容に関するご連絡",
  description:
    "アドプレスに掲載された記事について、事実と異なる記載、著作権侵害、個人情報、不適切な表現などをご連絡いただくフォームです。",
  robots: { index: false, follow: true },
};

export default function ReportPage() {
  return <ReportForm />;
}
