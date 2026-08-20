"use client";

import { useState } from "react";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";

type LinkRow = { label: string; url: string };
type SubmitResult = { id: number };

export default function SubmitForm({
  defaultOrg,
  defaultEmail,
}: {
  defaultOrg: string;
  defaultEmail: string;
}) {
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ label: "", url: "" }]);
  const [org, setOrg] = useState(defaultOrg);
  const [email, setEmail] = useState(defaultEmail);
  const [tel, setTel] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [contactPublic, setContactPublic] = useState(false);
  const [agreeAll, setAgreeAll] = useState({ rights: false, referral: false, terms: false });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const validLinks = links.filter((l) => l.url.trim());

  function updateLink(i: number, field: keyof LinkRow, value: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!category) errs.push("カテゴリを選んでください");
    if (!title.trim()) errs.push("タイトルを入力してください");
    if (bodyText.trim().length < 200) errs.push("本文は200字以上入力してください");
    if (validLinks.length > 2) errs.push("無料掲載ではリンクは2本までです");
    if (!org.trim()) errs.push("発信元（会社名・団体名等）を入力してください");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("連絡先メールアドレスを正しく入力してください");
    if (!agreeAll.rights || !agreeAll.referral || !agreeAll.terms) errs.push("すべての確認事項にチェックしてください");
    if (errs.length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const bodyHtml = bodyText
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("\n");
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: category,
          title,
          bodyHtml,
          contactOrg: org,
          contactEmail: email,
          contactTel: tel || undefined,
          contactUrl: siteUrl || undefined,
          contactPublic,
          links: validLinks.map((l) => ({ url: l.url, anchorText: l.label || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "送信に失敗しました。時間をおいて再度お試しください。"]);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setResult({ id: data.id });
    } catch {
      setErrors(["通信に失敗しました。時間をおいて再度お試しください。"]);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="ap-wrap" style={{ maxWidth: 760, padding: "40px 20px 80px" }}>
        <section style={{ background: "#D3F0E4", color: "#1F6B52", borderRadius: 14, padding: 28, marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 8px" }}>公開しました</h1>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.85 }}>
            投稿は審査を待たずにすでに公開されています。内容の確認は編集部が事後に行い、規約に反する内容は削除する場合があります（事前のご連絡はいたしません）。
          </p>
        </section>
        <section className="sec" style={{ marginBottom: 16, border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
          <h2>記事ページ</h2>
          <p>
            <a href={`/news/${result.id}/`}>{`https://www.nishinippon-adv.jp/news/${result.id}/`}</a>
          </p>
        </section>
        <section className="sec" style={{ marginBottom: 16, border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
          <h2>記事の紹介について</h2>
          <p style={{ fontSize: 13, lineHeight: 1.85, marginBottom: 14 }}>
            公開日から14日以内に、記事を紹介したページ（自社サイトのお知らせ欄・SNS投稿など）のURLを<a href="/mypage/">マイページ</a>から提出してください。提出がない場合、記事が取り下げられることがあります。
          </p>
          <a href="/mypage/" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 99, background: "#C9D3FF", color: "#293A80", fontWeight: 700, textDecoration: "none" }}>
            マイページを開く
          </a>
        </section>
      </div>
    );
  }

  return (
    <form className="ap-wrap" style={{ maxWidth: 760, padding: "40px 20px 80px" }} onSubmit={handleSubmit}>
      <h1>記事を投稿する</h1>
      <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 24 }}>
        送信すると、審査を待たずにそのまま公開されます。掲載料はかかりません。
        投稿内容についての責任は投稿者ご自身が負うものとし、不適切な内容と判断した場合、編集部の判断で事前連絡なく削除することがあります。
      </p>

      {errors.length > 0 && (
        <div style={{ background: "#FFE8EB", color: "#A33A4E", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="sec" style={{ marginBottom: 16, border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
        <h2>記事の内容</h2>

        <div className="f" style={{ marginBottom: 18 }}>
          <label>カテゴリ<span style={{ color: "#A33A4E", marginLeft: 5, fontSize: 11 }}>必須</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                style={{
                  height: 34,
                  padding: "0 15px",
                  borderRadius: 99,
                  border: "1px solid #D5D6DC",
                  background: category === c.slug ? "#C9D3FF" : "#fff",
                  color: category === c.slug ? "#293A80" : "#55575E",
                  fontWeight: category === c.slug ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="title">タイトル<span style={{ color: "#A33A4E", marginLeft: 5, fontSize: 11 }}>必須</span></label>
          <input id="title" type="text" maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="body">本文<span style={{ color: "#A33A4E", marginLeft: 5, fontSize: 11 }}>必須</span></label>
          <p style={{ fontSize: 12, color: "#8A8D96", margin: "0 0 8px" }}>段落の間は空行で区切ってください。200字以上を目安に入力してください。</p>
          <textarea id="body" value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={14} style={{ ...inputStyle, resize: "vertical" }} />
          <p style={{ fontSize: 12, color: "#8A8D96", marginTop: 6 }}>{bodyText.trim().length} 字</p>
        </div>

        <div className="f">
          <label>参考リンク<span style={{ color: "#8A8D96", marginLeft: 5, fontSize: 11 }}>任意・最大2本</span></label>
          {links.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="表示名" value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} style={inputStyle} />
              <input type="url" placeholder="https://" value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} style={inputStyle} />
            </div>
          ))}
          {links.length < 2 && (
            <button type="button" onClick={() => setLinks((p) => [...p, { label: "", url: "" }])} style={{ fontSize: 12.5, color: "#293A80", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              + リンクを追加
            </button>
          )}
        </div>
      </section>

      <section className="sec" style={{ marginBottom: 16, border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
        <h2>投稿者の情報</h2>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="org">会社名・団体名・ニックネーム<span style={{ color: "#A33A4E", marginLeft: 5, fontSize: 11 }}>必須</span></label>
          <input id="org" type="text" value={org} onChange={(e) => setOrg(e.target.value)} style={inputStyle} />
        </div>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="email">連絡先メールアドレス<span style={{ color: "#A33A4E", marginLeft: 5, fontSize: 11 }}>必須・非公開</span></label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="tel">電話番号<span style={{ color: "#8A8D96", marginLeft: 5, fontSize: 11 }}>任意</span></label>
          <input id="tel" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} style={inputStyle} />
        </div>

        <div className="f" style={{ marginBottom: 18 }}>
          <label htmlFor="siteUrl">公式サイトURL<span style={{ color: "#8A8D96", marginLeft: 5, fontSize: 11 }}>任意</span></label>
          <input id="siteUrl" type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} style={inputStyle} />
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={contactPublic} onChange={(e) => setContactPublic(e.target.checked)} style={{ marginTop: 3 }} />
          <span>電話番号・公式サイトURLを記事末尾の問い合わせ先として公開する</span>
        </label>
      </section>

      <section className="sec" style={{ marginBottom: 16, border: "1px solid #E7E7EC", borderRadius: 10, padding: 22 }}>
        <h2>掲載条件の確認</h2>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={agreeAll.rights} onChange={(e) => setAgreeAll((p) => ({ ...p, rights: e.target.checked }))} style={{ marginTop: 3 }} />
          <span>記事の内容に虚偽がなく、掲載する権利を持っていることを確認しました。画像・文章の著作権についても問題ありません。</span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={agreeAll.referral} onChange={(e) => setAgreeAll((p) => ({ ...p, referral: e.target.checked }))} style={{ marginTop: 3 }} />
          <span>掲載後は、自社サイトのお知らせやSNSなどで記事を紹介し、そのページのURLを14日以内にマイページから提出します。提出がない場合、記事は取り下げられることがあります。</span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={agreeAll.terms} onChange={(e) => setAgreeAll((p) => ({ ...p, terms: e.target.checked }))} style={{ marginTop: 3 }} />
          <span>
            <a href="/guideline/">掲載ガイドライン</a>と<a href="/terms/">利用規約</a>に同意します。
          </span>
        </label>
        <button type="submit" disabled={submitting} style={submitButtonStyle}>
          {submitting ? "送信中…" : "投稿して公開する"}
        </button>
      </section>
    </form>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #D5D6DC",
  borderRadius: 8,
  padding: "10px 13px",
  fontSize: 14,
  fontFamily: "inherit",
};

const submitButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 54,
  border: "none",
  borderRadius: 99,
  background: "#C9D3FF",
  color: "#293A80",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
};
