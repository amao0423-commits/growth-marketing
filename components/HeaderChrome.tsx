"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

// ホーム／カテゴリ一覧ページは検索ボックス＋カテゴリチップ付きの .top ヘッダー
// （design-ref/index.html・category-korea.html 準拠）、それ以外のページは
// 従来の簡易ヘッダー（.ap-header、design-ref/article.html 等準拠）を出し分ける。
export default function HeaderChrome({ isLoggedIn }: { isLoggedIn: boolean; isEditorial: boolean }) {
  const pathname = usePathname();
  const isRich = pathname === "/" || pathname.startsWith("/category/");

  const authLinks = isLoggedIn ? (
    <>
      <Link href="/mypage/" style={{ fontSize: 13 }}>
        マイページ
      </Link>
      <form action="/api/auth/signout" method="post">
        <button type="submit" style={{ background: "none", border: "none", fontSize: 13, color: "var(--ink-2)", cursor: "pointer", padding: 0, font: "inherit" }}>
          ログアウト
        </button>
      </form>
    </>
  ) : (
    <Link href="/login/" style={{ fontSize: 13 }}>
      ログイン
    </Link>
  );

  if (isRich) {
    const activeCategory = pathname.startsWith("/category/") ? pathname.split("/")[2] : null;
    return (
      <>
        <header className="top">
          <div className="wrap top-in">
            <Link href="/" className="mast">
              <img src="/logo-icon.png" alt="" width={494} height={376} className="mast-logo" />
              アドプレス<small>ADPRESS</small>
            </Link>
            <div className="search">
              <input type="search" placeholder="キーワードで記事を探す" aria-label="記事を検索" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {authLinks}
            </div>
          </div>
        </header>
        <nav className="cats" aria-label="カテゴリ">
          <div className="cats-in">
            <Link
              href="/"
              className="chip"
              aria-current={!activeCategory ? "page" : undefined}
              style={!activeCategory ? { background: "var(--ink)", color: "#fff" } : undefined}
            >
              すべて
            </Link>
            {CATEGORIES.map((c) => {
              const active = activeCategory === c.slug;
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}/`}
                  className="chip"
                  aria-current={active ? "page" : undefined}
                  style={{
                    background: c.bg,
                    color: c.fg,
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? `inset 0 0 0 1.5px ${c.fg}` : undefined,
                  }}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  return (
    <header className="ap-header">
      <div className="ap-wrap">
        <Link className="ap-mast" href="/">
          <img src="/logo-icon.png" alt="" width={494} height={376} className="mast-logo" />
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
          {authLinks}
        </div>
      </div>
    </header>
  );
}
