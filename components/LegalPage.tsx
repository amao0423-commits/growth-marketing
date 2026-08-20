export default function LegalPage({ html, crumb }: { html: string; crumb: string }) {
  return (
    <div className="legal-page">
      <nav className="crumb">
        <a href="/">ホーム</a> / {crumb}
      </nav>
      <article style={{ maxWidth: 720, margin: "16px auto 40px" }}>
        <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
