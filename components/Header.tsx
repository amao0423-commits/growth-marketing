import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {user ? (
            <>
              <Link href="/mypage/" style={{ fontSize: 13 }}>
                マイページ
              </Link>
              <form action="/api/auth/signout" method="post">
                <button type="submit" style={{ background: "none", border: "none", fontSize: 13, color: "#55575E", cursor: "pointer", padding: 0 }}>
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link href="/login/" style={{ fontSize: 13 }}>
              ログイン
            </Link>
          )}
          <Link className="ap-post" href="/submit/">
            記事を投稿する
          </Link>
        </div>
      </div>
    </header>
  );
}
