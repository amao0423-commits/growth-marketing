export type TocEntry = { href: string; label: string };

// design-ref/terms.html・guideline.html の2カラムレイアウト（左に固定TOC・右に本文カード）。
export default function LegalPage({ html, crumb, toc }: { html: string; crumb: string; toc: TocEntry[] }) {
  return (
    <div className="legal-page wrap">
      <nav className="crumb">
        <a href="/">ホーム</a> / {crumb}
      </nav>

      <div className="legal-layout">
        <nav className="legal-toc" aria-label="目次">
          <h2>目次</h2>
          {toc.map((t) => (
            <a key={t.href} href={t.href}>
              {t.label}
            </a>
          ))}
        </nav>

        <main className="legal-main">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
        </main>
      </div>
    </div>
  );
}
