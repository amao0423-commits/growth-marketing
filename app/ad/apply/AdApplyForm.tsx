"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";

const UNIT = 20000;
const TAX = 0.1;

function yen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export default function AdApplyForm() {
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("agency");
  const [qty, setQty] = useState(1);
  const [billDiff, setBillDiff] = useState(false);
  const [agreed, setAgreed] = useState([false, false, false, false]);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    wish: "",
    wishType: "できるだけ早く掲載したい",
    org: "",
    pic: "",
    tel: "",
    mail: "",
    site: "",
    memo: "",
  });

  const total = useMemo(() => {
    const subtotal = UNIT * qty;
    return { subtotal, tax: Math.round(subtotal * TAX), amount: subtotal + Math.round(subtotal * TAX) };
  }, [qty]);

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: false }));
  }

  function submit() {
    const next = {
      category: !category,
      subject: subject.trim().length === 0,
      org: form.org.trim().length === 0,
      pic: form.pic.trim().length === 0,
      mail: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mail.trim()),
      agreed: agreed.some((v) => !v),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sent) {
    const cat = CATEGORIES.find((c) => c.slug === category);
    return (
      <div className="ad-apply">
        <div className="wrap ad-narrow">
          <div className="done-hero">
            <h1>お申し込みを受け付けました</h1>
            <p>内容を確認のうえ、1〜2営業日でご連絡します。この時点では費用は発生していません。</p>
            <div className="orderno">
              受付番号<b>AD-202608-0001</b>
            </div>
          </div>

          <section className="sec">
            <h2>お申し込みの内容</h2>
            <dl className="recap">
              <dt>お申し込み者</dt>
              <dd>{form.org}（{form.pic} 様）</dd>
              <dt>ご連絡先</dt>
              <dd>{form.mail}</dd>
              <dt>掲載カテゴリ</dt>
              <dd>{cat?.label}</dd>
              <dt>原稿</dt>
              <dd>{draft === "agency" ? "記事の作成を依頼する" : draft === "own" ? "原稿は自分で用意する" : "まだ決めていない"}</dd>
              <dt>掲載希望</dt>
              <dd>{form.wish ? `${form.wish.replaceAll("-", "/")} ${form.wishType}` : form.wishType}</dd>
              <dt>掲載本数</dt>
              <dd>{qty} 本</dd>
              <dt>お支払い予定額</dt>
              <dd>{yen(total.amount)}（税込） ※掲載後の請求書払い</dd>
            </dl>
          </section>

          <section className="sec">
            <h2>これからの流れ</h2>
            <div className="timeline-mini">
              {["編集部からのご連絡", "原稿の作成・ご確認", "AI自動審査", "掲載開始", "請求書の発行・お支払い", "PVレポートの公開"].map((label, i) => (
                <div className={`tl${i === 0 ? " now" : ""}`} key={label}>
                  <div className="dot">{i + 1}</div>
                  <div>
                    <h3>{label}</h3>
                    <p>{i === 0 ? "掲載可否、ご希望日の空き状況、原稿の進め方をお知らせします。" : "必要な確認を行いながら、掲載後のご報告まで進めます。"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-apply">
      <div className="wrap ad-narrow">
        <nav className="crumb">
          <a href="/">ホーム</a> / <a href="/ad/">広告枠掲載のご案内</a> / お申し込み
        </nav>

        <h1 className="form-title">広告枠掲載のお申し込み</h1>
        <p className="form-lede">送信いただいた内容を確認し、1〜2営業日で掲載可否とご希望日の空き状況をご連絡します。送信の時点では費用は発生しません。</p>

        <div className="apply-summary">
          <div>
            <b>広告枠掲載（PR記事）</b>
            トップページのPR枠に7日間／カテゴリ上部に14日間／リンク5本まで／記事の作成代行／PVレポート付き
          </div>
          <div className="amount">
            <div>{yen(total.amount)}</div>
            <span>{qty}本 {yen(total.subtotal)}（税別）</span>
          </div>
        </div>

        <section className="sec">
          <h2>掲載したい内容</h2>
          <p className="h-note">この時点で決まっている範囲で結構です。あとから変更できます。</p>

          <div className="f">
            <label>掲載カテゴリ<span className="req">必須</span></label>
            <div className="cats-pick">
              {CATEGORIES.map((c) => (
                <button
                  className={`cat-pick${category === c.slug ? " on" : ""}`}
                  key={c.slug}
                  type="button"
                  style={category === c.slug ? { background: c.bg, color: c.fg, borderColor: "transparent", fontWeight: 700 } : undefined}
                  onClick={() => {
                    setCategory(c.slug);
                    setErrors((current) => ({ ...current, category: false }));
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {errors.category && <p className="err on">カテゴリを選んでください。</p>}
          </div>

          <div className="f">
            <label htmlFor="subject">発表の概要<span className="req">必須</span></label>
            <p className="hint">何を発表したいかを、わかる範囲でご記入ください。参考になるURLがあれば貼ってください。</p>
            <textarea id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例）9月12日に東京・原宿へ日本1号店をオープンします。" />
            <div className="count mono">{subject.trim().length} 字</div>
            {errors.subject && <p className="err on">発表の概要をご記入ください。</p>}
          </div>

          <div className="f">
            <label>原稿のご用意<span className="req">必須</span></label>
            <div className="radios">
              {[
                ["agency", "記事の作成を依頼する（追加費用なし）", "資料やURLをお送りいただき、編集部が1,500字程度に構成します。"],
                ["own", "原稿は自分で用意する", "プレスリリースをすでにお持ちの場合。最短で翌営業日に掲載できます。"],
                ["undecided", "まだ決めていない", "ご連絡の際に一緒に決めましょう。"],
              ].map(([value, title, note]) => (
                <label className={`radio${draft === value ? " on" : ""}`} key={value}>
                  <input type="radio" name="draft" value={value} checked={draft === value} onChange={() => setDraft(value)} />
                  <span><b>{title}</b><span>{note}</span></span>
                </label>
              ))}
            </div>
          </div>

          <div className="two">
            <div className="f">
              <label htmlFor="wish">掲載希望日<span className="opt">任意</span></label>
              <input id="wish" type="date" value={form.wish} onChange={(e) => update("wish", e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="wishType">希望条件<span className="opt">任意</span></label>
              <select id="wishType" value={form.wishType} onChange={(e) => update("wishType", e.target.value)}>
                <option>この日に掲載したい</option>
                <option>この日以降であればいつでもよい</option>
                <option>できるだけ早く掲載したい</option>
              </select>
            </div>
          </div>

          <div className="f">
            <label htmlFor="qty">掲載本数<span className="req">必須</span></label>
            <div className="stepper">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
              <input id="qty" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
              <button type="button" onClick={() => setQty(Math.min(20, qty + 1))}>+</button>
            </div>
            <div className="calc">
              <dl><dt>掲載料 {yen(UNIT)} x {qty} 本</dt><dd>{yen(total.subtotal)}</dd><dt>消費税（10%）</dt><dd>{yen(total.tax)}</dd></dl>
              <dl className="total"><dt>お支払い合計（税込）</dt><dd>{yen(total.amount)}</dd></dl>
            </div>
          </div>
        </section>

        <section className="sec">
          <h2>お申し込み者の情報</h2>
          <p className="h-note">記事の発信元として公開されるのは会社名・団体名のみです。</p>
          <div className="f">
            <label htmlFor="org">会社名・団体名<span className="req">必須</span></label>
            <input id="org" type="text" value={form.org} onChange={(e) => update("org", e.target.value)} placeholder="例）AHUE JAPAN合同会社" />
            {errors.org && <p className="err on">会社名・団体名をご記入ください。</p>}
          </div>
          <div className="two">
            <div className="f">
              <label htmlFor="pic">ご担当者名<span className="req">必須</span></label>
              <input id="pic" type="text" value={form.pic} onChange={(e) => update("pic", e.target.value)} placeholder="例）安藤 葵" />
              {errors.pic && <p className="err on">ご担当者名をご記入ください。</p>}
            </div>
            <div className="f">
              <label htmlFor="tel">電話番号<span className="opt">任意</span></label>
              <input id="tel" type="tel" value={form.tel} onChange={(e) => update("tel", e.target.value)} placeholder="03-0000-0000" />
            </div>
          </div>
          <div className="f">
            <label htmlFor="mail">メールアドレス<span className="req">必須</span></label>
            <input id="mail" type="email" value={form.mail} onChange={(e) => update("mail", e.target.value)} placeholder="press@example.com" />
            {errors.mail && <p className="err on">メールアドレスの形式をご確認ください。</p>}
          </div>
          <div className="f">
            <label htmlFor="site">公式サイトURL<span className="opt">任意</span></label>
            <input id="site" type="url" value={form.site} onChange={(e) => update("site", e.target.value)} placeholder="https://" />
          </div>
        </section>

        <section className="sec">
          <h2>請求書について</h2>
          <p className="h-note">お支払いは掲載後の銀行振込です。前払いは不要で、オンライン決済は行っていません。</p>
          <div className="note">請求書は掲載を確認いただいたあとに発行し、PDFにてお送りします。お支払い期限は請求書発行日の翌月末です。</div>
          <label className="toggle">
            <input type="checkbox" checked={billDiff} onChange={(e) => setBillDiff(e.target.checked)} />
            <span><b>請求書の宛名・送付先が上記と異なる</b><span>チェックしない場合、会社名とご担当者のメールアドレス宛にお送りします。</span></span>
          </label>
          {billDiff && (
            <div className="reveal on">
              <div className="two">
                <input type="text" placeholder="請求書の宛名" />
                <input type="email" placeholder="送付先メールアドレス" />
              </div>
            </div>
          )}
          <div className="f">
            <label htmlFor="memo">ご要望・ご質問<span className="opt">任意</span></label>
            <textarea id="memo" value={form.memo} onChange={(e) => update("memo", e.target.value)} placeholder="例）社内稟議のため、事前に見積書をいただけますか。" />
          </div>
        </section>

        <section className="sec">
          <h2>お申し込みの前にご確認ください</h2>
          <div className="note">
            <b>PR表記は省略できません。</b>記事タイトル横の <span className="pr-badge">PR</span> バッジ、記事冒頭の広告である旨の明記、外部リンクへの <span className="mono">rel=&quot;sponsored&quot;</span> 付与を行います。
          </div>
          {[
            "広告記事としてPR表記が行われることに同意します。",
            "掲載後のお取消はできないこと、掲載後に発行される請求書にもとづき銀行振込でお支払いすることを承知しました。",
            "掲載内容について公表する権限を持っていること、内容に虚偽がないことを確認しました。",
            "掲載ガイドラインと利用規約に同意します。",
          ].map((label, i) => (
            <div className="f" key={label}>
              <label className="check">
                <input type="checkbox" checked={agreed[i]} onChange={(e) => setAgreed((current) => current.map((v, index) => (index === i ? e.target.checked : v)))} />
                <span>{label}</span>
              </label>
            </div>
          ))}
          {errors.agreed && <p className="err on">すべての項目にチェックしてください。</p>}
          <button className="submit" type="button" onClick={submit}>この内容で申し込む</button>
        </section>

        <p className="foot-note">送信の時点では費用は発生しません。<br />掲載可否とご希望日の空き状況を、1〜2営業日でご連絡します。</p>
      </div>
    </div>
  );
}
