"use client";

import { useState } from "react";

const reasons = [
  ["false_info", "事実と異なる記載がある", "発表されていない内容、誤った日付・価格・名称など"],
  ["copyright", "著作権を侵害している", "文章・画像・図表の無断転載、他サイト記事の複製"],
  ["privacy", "個人情報・プライバシーの問題がある", "同意のない氏名・連絡先・顔写真の掲載、名誉毀損"],
  ["offensive", "不適切・差別的な表現がある", "誹謗中傷、差別的表現、性的・暴力的な表現"],
  ["spam", "宣伝・スパムである", "繰り返し投稿、無関係なリンク、記事内容と関係のない誘導"],
  ["other", "その他", "上記に当てはまらない問題（薬機法・景品表示法に関わる表現など）"],
];

export default function ReportForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState([false, false]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ url: "", where: "", detail: "", mail: "", name: "" });

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: false }));
  }

  async function submit() {
    const next = {
      url: !/^https?:\/\/.+\..+/.test(form.url.trim()),
      reason: !reason,
      detail: form.detail.trim().length < 10,
      mail: Boolean(form.mail.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mail.trim()),
      agreed: agreed.some((v) => !v),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 送信できていないのに完了画面を出さない
        setSendError(data?.error || "送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSendError("送信に失敗しました。通信環境をご確認のうえ再度お試しください。");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="report-page">
        <div className="wrap report-wrap">
          <div className="done-hero">
            <h1>ご連絡を受け付けました</h1>
            <p>お知らせいただきありがとうございます。編集部で内容を確認します。対応が必要と判断した場合は、記事の訂正または取り下げを行います。</p>
            <div className="orderno">受付番号<b>RP-20260820-0031</b></div>
          </div>

          <section className="sec">
            <h2>これからの流れ</h2>
            <div className="timeline-mini">
              {[
                ["編集部で内容を確認", "いただいた内容と記事を照合します。緊急性が高い場合は、確認中の記事を一時的に非公開にすることがあります。"],
                ["必要に応じて投稿者へ確認", "事実関係を投稿者に確認します。ご連絡先は投稿者へ開示しません。"],
                ["訂正・取り下げなどの対応", "訂正で足りる場合は投稿者に修正を依頼します。ガイドラインまたは利用規約に反する場合は記事を取り下げます。"],
                ["結果のご連絡", "メールアドレスをご記入いただいた場合、確認の結果をお知らせします。ただし、判断基準の詳細はお伝えできません。"],
              ].map(([title, text], i) => (
                <div className={`tl${i === 0 ? " now" : ""}`} key={title}>
                  <div className="dot">{i + 1}</div>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>追加の情報がある場合</h2>
            <p className="h-note" style={{ marginBottom: 14 }}>証拠資料の追加や補足がある場合は、受付番号を添えてお問い合わせフォームからご連絡ください。</p>
            <a href="/" className="home">トップページへ戻る</a>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="wrap report-wrap">
        <nav className="crumb"><a href="/">ホーム</a> / 掲載内容に関するご連絡</nav>

        <h1 className="form-title">掲載内容に関するご連絡</h1>
        <p className="form-lede">掲載内容の責任は各投稿者にありますが、法令違反や権利侵害のご連絡をいただいた場合は、編集部が事実関係を確認し、必要な対応を行います。</p>

        <div className="calm">
          <b>お心当たりの記事について、まず投稿者へ直接ご連絡いただくこともご検討ください。</b>
          記事末尾の「この記事に関するお問い合わせ」に、発信元の連絡先が掲載されている場合があります。
        </div>

        <section className="sec">
          <h2>対象の記事</h2>
          <p className="h-note">記事ページのURLをそのまま貼り付けてください。</p>
          <div className="f">
            <label htmlFor="url">記事のURL<span className="req">必須</span></label>
            <input id="url" type="url" value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://www.nishinippon-adv.jp/news/" />
            {errors.url && <p className="err on">記事のURLをご記入ください。</p>}
            {/nishinippon-adv\.jp\/(news|blog)\//.test(form.url) && (
              <div className="article-peek on">
                <span className="tag" style={{ background: "var(--c-korea-bg)", color: "var(--c-korea-fg)" }}>韓国情報</span>
                <h3>韓国コスメブランド「AHUE」、日本1号店を9月12日に原宿へオープン</h3>
                <div className="m">AHUE JAPAN合同会社 ／ <span className="mono">2026.08.19 11:20 公開</span></div>
              </div>
            )}
          </div>
          <div className="f">
            <label htmlFor="where">問題のある箇所<span className="opt">任意</span></label>
            <input id="where" type="text" value={form.where} onChange={(e) => update("where", e.target.value)} placeholder="例）「日本限定色12色を同時発売」の段落" />
          </div>
        </section>

        <section className="sec">
          <h2>ご連絡の理由</h2>
          <p className="h-note">もっとも近いものを1つお選びください。</p>
          <div className="reasons">
            {reasons.map(([value, title, note]) => (
              <label className={`reason${reason === value ? " on" : ""}`} key={value}>
                <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => {
                  setReason(value);
                  setErrors((current) => ({ ...current, reason: false }));
                }} />
                <span><b>{title}</b><span>{note}</span></span>
              </label>
            ))}
          </div>
          {errors.reason && <p className="err on">ご連絡の理由をお選びください。</p>}

          {(reason === "copyright" || reason === "privacy") && (
            <div className="reveal on">
              <h3>権利者ご本人・代理人の方へ</h3>
              <p className="rn">差し支えなければ、元の著作物や権利者名もご記入ください。確認材料になります。</p>
              <input type="text" placeholder="転載元URL、公開日、権利者名など" />
            </div>
          )}

          <div className="f">
            <label htmlFor="detail">詳しい内容<span className="req">必須</span></label>
            <textarea id="detail" value={form.detail} onChange={(e) => update("detail", e.target.value)} placeholder="どの記述がどのように問題なのかを、できるだけ具体的にご記入ください。" />
            <div className="count mono">{form.detail.trim().length} 字</div>
            {errors.detail && <p className="err on">確認のため、10字以上で詳しくご記入ください。</p>}
          </div>
        </section>

        <section className="sec">
          <h2>ご連絡先</h2>
          <p className="h-note">確認の結果をお知らせする場合に使用します。記入がなくても送信できます。</p>
          <div className="f">
            <label htmlFor="mail">メールアドレス<span className="opt">任意</span></label>
            <input id="mail" type="email" value={form.mail} onChange={(e) => update("mail", e.target.value)} placeholder="you@example.com" />
            {errors.mail && <p className="err on">メールアドレスの形式をご確認ください。</p>}
          </div>
          <div className="f">
            <label htmlFor="name">お名前・団体名<span className="opt">任意</span></label>
            <input id="name" type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="例）安藤" />
          </div>
        </section>

        <section className="sec">
          <h2>送信の前にご確認ください</h2>
          <div className="note"><b>個別の回答をお約束するものではありません。</b>いただいたご連絡はすべて確認しますが、確認の結果や対応の可否について個別にご回答できない場合があります。</div>
          {[
            "記載した内容が事実であることを確認しました。",
            "ご連絡いただいた内容は、事実確認のために必要な範囲で投稿者へお伝えする場合があることに同意します。",
          ].map((label, i) => (
            <div className="f" key={label}>
              <label className="check">
                <input type="checkbox" checked={agreed[i]} onChange={(e) => setAgreed((current) => current.map((v, index) => (index === i ? e.target.checked : v)))} />
                <span>{label}</span>
              </label>
            </div>
          ))}
          {errors.agreed && <p className="err on">すべての項目にチェックしてください。</p>}
          {sendError && <p className="err on">{sendError}</p>}
          <button type="button" className="submit" onClick={submit} disabled={sending}>
            {sending ? "送信中…" : "この内容で送信する"}
          </button>
        </section>

        <section className="sec">
          <h2>よくあるご質問</h2>
          <div className="faq">
            <details open><summary>連絡してから、どのくらいで対応されますか。</summary><p>営業日の受付分を順次確認しています。緊急性が高いと判断した場合は、確認中の記事を一時的に非公開にすることがあります。</p></details>
            <details><summary>記事は必ず削除されますか。</summary><p>いいえ。編集部が事実関係を確認し、訂正で足りる場合は投稿者に修正を依頼します。</p></details>
            <details><summary>匿名で連絡できますか。</summary><p>できます。ただし、追加の確認が必要になった場合にご連絡できないため、確認に時間がかかることがあります。</p></details>
          </div>
        </section>
      </div>
    </div>
  );
}
