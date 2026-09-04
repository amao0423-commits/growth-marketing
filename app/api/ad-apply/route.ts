import { NextRequest, NextResponse } from "next/server";
import { sendMail, fieldsToHtml } from "@/lib/mail";
import { categoryLabel, isCategorySlug } from "@/lib/categories";

export const runtime = "nodejs";

// 「広告枠掲載のお申し込み」(/ad/apply/) の受信。編集部の受信メールアドレスへ通知する。
// 以前はフロントで完了画面に切り替えるだけで、内容がどこにも送られていなかった。

const DRAFT_LABELS: Record<string, string> = {
  agency: "編集部に原稿作成を依頼する",
  self: "自社で原稿を用意する",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const category = String(input.category ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const draft = String(input.draft ?? "").trim();
  const qty = Number(input.qty ?? 0);
  const billDiff = Boolean(input.billDiff);
  const wish = String(input.wish ?? "").trim();
  const wishType = String(input.wishType ?? "").trim();
  const org = String(input.org ?? "").trim();
  const pic = String(input.pic ?? "").trim();
  const tel = String(input.tel ?? "").trim();
  const mail = String(input.mail ?? "").trim();
  const site = String(input.site ?? "").trim();
  const memo = String(input.memo ?? "").trim();

  const errors: string[] = [];
  if (!isCategorySlug(category)) errors.push("カテゴリを選択してください");
  if (!subject) errors.push("掲載したい内容を入力してください");
  if (!org) errors.push("会社名・団体名を入力してください");
  if (!pic) errors.push("ご担当者名を入力してください");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) errors.push("メールアドレスの形式が不正です");
  if (!Number.isFinite(qty) || qty < 1) errors.push("掲載本数が不正です");
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" / ") }, { status: 400 });
  }

  const UNIT = 20000;
  const subtotal = UNIT * qty;
  const tax = Math.round(subtotal * 0.1);
  const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  const html = `
    <p style="font-family:sans-serif;font-size:14px">アドプレスの「広告枠掲載のお申し込み」フォームから受信しました。</p>
    ${fieldsToHtml([
      { label: "会社名・団体名", value: org },
      { label: "ご担当者名", value: pic },
      { label: "メール", value: mail },
      { label: "電話", value: tel },
      { label: "Webサイト", value: site },
      { label: "カテゴリ", value: categoryLabel(category) },
      { label: "掲載したい内容", value: subject },
      { label: "原稿", value: DRAFT_LABELS[draft] ?? draft },
      { label: "掲載本数", value: `${qty}本` },
      { label: "希望時期", value: wishType + (wish ? `（${wish}）` : "") },
      { label: "請求先", value: billDiff ? "申込者と異なる（要確認）" : "申込者と同じ" },
      { label: "備考", value: memo },
      { label: "概算", value: `小計 ${yen(subtotal)} / 消費税 ${yen(tax)} / 合計 ${yen(subtotal + tax)}` },
    ])}`;

  const result = await sendMail({
    subject: `【アドプレス】広告枠掲載のお申し込み（${org}）`,
    html,
    replyTo: mail,
  });

  if (!result.ok) {
    // 送信できていないのに「受け付けました」と見せない（以前の不具合の再発防止）
    console.error("ad-apply mail send failed:", result.error);
    return NextResponse.json(
      { error: "送信に失敗しました。お手数ですが info@cocomake-guide.com まで直接ご連絡ください。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
