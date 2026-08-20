import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function Header() {
  return (
    <header className="ap-header">
      <div className="ap-wrap">
        <Link className="ap-mast" href="/">
          アドプレス<small>ADPRESS</small>
        </Link>
        <nav className="ap-nav">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}/`}>
              {c.label}
            </Link>
          ))}
        </nav>
        <Link className="ap-post" href="/submit/">
          記事を投稿する
        </Link>
      </div>
    </header>
  );
}
