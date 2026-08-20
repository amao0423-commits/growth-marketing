import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="ap-footer">
      <div className="ap-wrap">
        <div className="ap-fnav">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}/`}>
              {c.label}
            </Link>
          ))}
        </div>
        <div className="ap-fnav">
          <Link href="/about/">運営会社</Link>
          <Link href="/guideline/">掲載ガイドライン</Link>
          <Link href="/editorial-policy/">編集方針</Link>
          <Link href="/ad/">広告枠掲載のお願い</Link>
          <Link href="/terms/">利用規約</Link>
          <Link href="/privacy/">プライバシーポリシー</Link>
          <Link href="/contact/">お問い合わせ</Link>
        </div>
        <p>
          掲載記事の内容は各投稿者に帰属します。「PR」表記のある記事は、掲載費用を受け取って掲載しています。
        </p>
        <p>© {year} ADPRESS</p>
      </div>
    </footer>
  );
}
