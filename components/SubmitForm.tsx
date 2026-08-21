"use client";

import { useRef, useState } from "react";
import { CATEGORIES, type CategorySlug, categoryDef } from "@/lib/categories";
import { generateEyecatchSvg } from "@/lib/eyecatch";

type SubmitResult = { id: number };
type RefLink = { label: string; url: string };

const MAX_LINKS = 2;
const MAX_IMAGES = 5;

export default function SubmitForm({
  defaultOrg,
  defaultEmail,
}: {
  defaultOrg: string;
  defaultEmail: string;
}) {
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [title, setTitle] = useState("");
  const [bodyChars, setBodyChars] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [refLinks, setRefLinks] = useState<RefLink[]>([{ label: "", url: "" }, { label: "", url: "" }]);
  const [org, setOrg] = useState(defaultOrg);
  const [email, setEmail] = useState(defaultEmail);
  const [tel, setTel] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [contactPublic, setContactPublic] = useState(false);
  const [agree, setAgree] = useState({ rights: false, terms: false });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [linkboxOpen, setLinkboxOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const cat = category ? categoryDef(category) : null;
  const previewSvg = generateEyecatchSvg({
    title: "",
    bg: cat?.bg ?? "#EDEEF2",
    fg: cat?.fg ?? "#3A3D45",
    categoryLabel: cat?.label ?? "カテゴリ未選択",
    width: 400,
    height: 210,
  });

  function countLinksInEditor() {
    const inEditor = editorRef.current?.querySelectorAll("a").length ?? 0;
    const inRefList = refLinks.filter((l) => l.url.trim()).length;
    return inEditor + inRefList;
  }

  function updateCounts() {
    const text = editorRef.current?.textContent?.trim() ?? "";
    setBodyChars(text.length);
    setLinkCount(countLinksInEditor());
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateCounts();
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function openLinkBox() {
    saveSelection();
    if (countLinksInEditor() >= MAX_LINKS) {
      setErrors(["リンクは合計2本までです（本文中＋参考リンクの合算）。"]);
      return;
    }
    const sel = window.getSelection();
    setLinkText(savedRangeRef.current && !savedRangeRef.current.collapsed ? (sel?.toString() ?? "") : "");
    setLinkboxOpen(true);
  }

  function insertLink() {
    const u = linkUrl.trim();
    if (!/^https?:\/\/.+\..+/.test(u)) {
      setErrors(["https:// から始まるURLを入力してください。"]);
      return;
    }
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
    const text = linkText.trim() || u;
    document.execCommand(
      "insertHTML",
      false,
      `<a href="${u.replace(/"/g, "&quot;")}" rel="nofollow">${escapeHtml(text)}</a>&nbsp;`
    );
    setLinkUrl("");
    setLinkText("");
    setLinkboxOpen(false);
    updateCounts();
  }

  function insertImagePlaceholder() {
    if (imageCount >= MAX_IMAGES) {
      setErrors(["画像は5点までです。"]);
      return;
    }
    editorRef.current?.focus();
    const n = imageCount + 1;
    document.execCommand(
      "insertHTML",
      false,
      `<figure style="margin:1.4em 0"><div style="background:#EDEEF2;border-radius:8px;height:150px;display:flex;align-items:center;justify-content:center;color:#8A8D96;font-size:13px">画像 ${n}</div></figure><p><br></p>`
    );
    setImageCount(n);
    updateCounts();
  }

  function updateRefLink(i: number, field: keyof RefLink, value: string) {
    setRefLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bodyHtml = editorRef.current?.innerHTML.trim() ?? "";
    const validRefLinks = refLinks.filter((l) => l.url.trim());
    const totalLinks = (editorRef.current?.querySelectorAll("a").length ?? 0) + validRefLinks.length;

    const errs: string[] = [];
    if (!category) errs.push("カテゴリを選んでください");
    if (!title.trim()) errs.push("タイトルを入力してください");
    if (bodyChars < 200) errs.push("本文は200字以上入力してください");
    if (totalLinks > MAX_LINKS) errs.push(`リンクは${MAX_LINKS}本までです（現在${totalLinks}本）`);
    if (!org.trim()) errs.push("発信元（会社名・団体名等）を入力してください");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("連絡先メールアドレスを正しく入力してください");
    if (!agree.rights || !agree.terms) errs.push("すべての確認事項にチェックしてください");
    if (errs.length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
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
          links: validRefLinks.map((l) => ({ url: l.url, anchorText: l.label || undefined })),
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
      <div className="wrap" style={{ maxWidth: 760, padding: "40px 20px 80px" }}>
        <section style={{ background: "var(--ok-bg)", color: "var(--ok-fg)", borderRadius: 14, padding: 28, marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 8px" }}>公開しました</h1>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.85 }}>
            投稿は審査を待たずにすでに公開されています。内容の確認は編集部が事後に行い、規約に反する内容は削除する場合があります（事前のご連絡はいたしません）。
          </p>
        </section>
        <section className="sec">
          <h2>記事ページ</h2>
          <p>
            <a href={`/news/${result.id}/`}>{`https://www.nishinippon-adv.jp/news/${result.id}/`}</a>
          </p>
        </section>
        <section className="sec">
          <h2>記事の管理</h2>
          <p style={{ fontSize: 13, lineHeight: 1.85, marginBottom: 14 }}>
            公開した記事は<a href="/mypage/">マイページ</a>から確認できます。必要に応じて、掲載後の状態やお知らせを確認してください。
          </p>
          <a href="/mypage/" className="post-btn" style={{ height: 50, fontSize: 15 }}>
            マイページを開く
          </a>
        </section>
      </div>
    );
  }

  return (
    <form className="wrap" style={{ maxWidth: 760, padding: "30px 20px 60px" }} onSubmit={handleSubmit}>
      <h1 style={{ fontFamily: "var(--font-disp)", fontSize: 25, letterSpacing: ".04em", margin: "0 0 6px" }}>記事を投稿する</h1>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: "0 0 24px" }}>
        送信すると、審査を待たずにそのまま公開されます。掲載料はかかりません。
      </p>

      {errors.length > 0 && (
        <div style={{ background: "#FCEBEB", color: "#A32D2D", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 記事の内容 */}
      <section className="sec">
        <h2>記事の内容</h2>
        <p className="h-note">事実を中心に、いつ・誰が・何を の順で書くと読まれやすくなります。</p>

        <div className="f">
          <label>
            カテゴリ<span className="req">必須</span>
          </label>
          <div className="cats-pick">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className="cat-pick"
                style={category === c.slug ? { background: c.bg, color: c.fg, borderColor: "transparent", fontWeight: 700 } : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="f">
          <label htmlFor="title">
            タイトル<span className="req">必須</span>
          </label>
          <p className="hint">30〜60字が目安です。社名やサービス名を前半に入れると検索で見つかりやすくなります。</p>
          <input id="title" type="text" maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="edbar">
            <span>
              タイトル <b className="mono">{title.length}</b> 字
            </span>
          </div>
        </div>

        <div className="f">
          <label>
            本文<span className="req">必須</span>
          </label>
          <p className="hint">見出しはツールバーで切り替えます。</p>
          <div className="tools">
            <button type="button" className="h2b" onClick={() => exec("formatBlock", "<h2>")} title="大見出し">
              大見出し
            </button>
            <button type="button" className="h3b" onClick={() => exec("formatBlock", "<h3>")} title="小見出し">
              小見出し
            </button>
            <button type="button" onClick={() => exec("formatBlock", "<p>")}>
              本文
            </button>
            <span className="sep" />
            <button type="button" onClick={() => exec("bold")} style={{ fontWeight: 700 }}>
              太字
            </button>
            <button type="button" onClick={() => exec("formatBlock", "<blockquote>")}>
              引用
            </button>
            <button type="button" onClick={() => exec("insertUnorderedList")}>
              箇条書き
            </button>
            <button type="button" onClick={() => exec("insertOrderedList")}>
              番号付き
            </button>
            <span className="sep" />
            <button type="button" onClick={openLinkBox}>
              リンク
            </button>
            <button type="button" onClick={insertImagePlaceholder}>
              画像
            </button>
          </div>
          {linkboxOpen && (
            <div className="linkbox on">
              <input type="text" placeholder="表示するテキスト" value={linkText} onChange={(e) => setLinkText(e.target.value)} />
              <input type="url" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <button type="button" onClick={insertLink}>
                挿入
              </button>
              <button type="button" className="cx" onClick={() => setLinkboxOpen(false)}>
                やめる
              </button>
            </div>
          )}
          <div
            className="ed"
            id="ed"
            contentEditable
            suppressContentEditableWarning
            ref={editorRef}
            data-ph="ここに本文を入力します。"
            onInput={updateCounts}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
          />
          <div className="edbar">
            <span>
              本文 <b className="mono">{bodyChars}</b> 字
            </span>
            <span>
              リンク <b className={`mono${linkCount > MAX_LINKS ? " over" : ""}`}>{linkCount}</b> / <b>{MAX_LINKS}</b> 本
            </span>
            <span>
              画像 <b className="mono">{imageCount}</b> / <b>{MAX_IMAGES}</b> 点
            </span>
          </div>
          {linkCount >= MAX_LINKS && (
            <div className="quota">
              リンクは本文と参考リンクをあわせて{MAX_LINKS}本までです。
            </div>
          )}
        </div>

        <div className="f">
          <label>
            参考リンク<span className="opt">任意</span>
          </label>
          <p className="hint">記事末尾にまとめて表示されます。上のリンクと合算して{MAX_LINKS}本までです。</p>
          <div className="reflist">
            {refLinks.map((l, i) => (
              <div className="r" key={i}>
                <input type="text" placeholder="表示名（例：公式サイト）" value={l.label} onChange={(e) => updateRefLink(i, "label", e.target.value)} />
                <input
                  type="url"
                  placeholder="https://"
                  value={l.url}
                  onChange={(e) => {
                    updateRefLink(i, "url", e.target.value);
                    setTimeout(updateCounts, 0);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* アイキャッチ */}
      <section className="sec">
        <h2>アイキャッチ画像</h2>
        <p className="h-note">登録しない場合、カテゴリの色から自動で作成します。</p>
        <div className="eye">
          <div className="prev" dangerouslySetInnerHTML={{ __html: previewSvg }} />
          <div>
            <div className="drop">
              <b>画像アップロードは準備中です</b>
              現在は自動生成されたアイキャッチのみご利用いただけます
            </div>
          </div>
        </div>
      </section>

      {/* 投稿者 */}
      <section className="sec">
        <h2>投稿者の情報</h2>
        <p className="h-note">メールアドレス以外は、公開するかどうかを選べます。</p>

        <div className="f">
          <label htmlFor="org">
            会社名・団体名・ニックネーム<span className="req">必須</span>
          </label>
          <input id="org" type="text" value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>

        <div className="f">
          <label htmlFor="mail">連絡先メールアドレス</label>
          <p className="hint">お知らせが届いた際のご案内に使用します。公開されません。</p>
          <input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="f">
          <label htmlFor="tel">
            電話番号<span className="opt">任意</span>
          </label>
          <input id="tel" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
        </div>

        <div className="f">
          <label>記事に関するお問い合わせ先{" "}<span className="opt">任意</span></label>
          <p className="hint">記事末尾に掲載されます。ここに書いたURLはリンク本数に含みません。</p>
          <input type="url" placeholder="公式サイトURL" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
        </div>

        <label className="check">
          <input type="checkbox" checked={contactPublic} onChange={(e) => setContactPublic(e.target.checked)} />
          <span>電話番号・公式サイトURLを記事末尾の問い合わせ先として公開する</span>
        </label>
      </section>

      {/* 同意 */}
      <section className="sec">
        <h2>掲載条件の確認</h2>
        <p className="h-note">すべてにチェックすると送信できます。</p>
        <div className="f">
          <label className="check">
            <input type="checkbox" checked={agree.rights} onChange={(e) => setAgree((p) => ({ ...p, rights: e.target.checked }))} />
            <span>記事の内容に虚偽がなく、掲載する権利を持っていることを確認しました。画像・文章の著作権についても問題ありません。</span>
          </label>
        </div>
        <div className="f">
          <label className="check">
            <input type="checkbox" checked={agree.terms} onChange={(e) => setAgree((p) => ({ ...p, terms: e.target.checked }))} />
            <span>
              <a href="/guideline/">掲載ガイドライン</a>と<a href="/terms/">利用規約</a>に同意します。
            </span>
          </label>
        </div>
        <button type="submit" className="submit" disabled={submitting}>
          {submitting ? "送信中…" : "記事を公開する"}
        </button>
      </section>

      <p className="foot-note">
        送信すると記事は公開され、自動審査が始まります。掲載料はかかりません。
        <br />
        審査で修正が必要になった場合は、マイページのお知らせでご案内します。
      </p>
    </form>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
