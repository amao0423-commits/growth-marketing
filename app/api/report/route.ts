import { NextRequest, NextResponse } from "next/server";
import { sendMail, fieldsToHtml, escapeHtml } from "@/lib/mail";

export const runtime = "nodejs";

// 「掲載内容に関するご連絡」(/report/) の受信。編集部の受信メールアドレスへ通知する。
// 以前はフロントで完了画面に切り替えるだけで、内容がどこにも送られていなかった。

const REASON_LABELS: Record<string, string> = {
  false_info: "事実と異なる記載がある",
  copyright: "著作権を侵害している",
  privacy: "個人情報・プライバシーの問題がある",
  offensive: "不適切・差別的な表現がある",
  spam: "宣伝・スパムである",
  other: "その他",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const url = String(input.url ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const where = String(input.where ?? "").trim();
  const detail = String(input.detail ?? "").trim();
  const mail = String(input.mail ?? "").trim();
  const name = String(input.name ?? "").trim();

  const errors: string[] = [];
  if (!/^https?:\/\/.+\..+/.test(url)) errors.push("対象記事のURLが不正です");
  if (!REASON_LABELS[reason]) errors.push("ご連絡の理由を選択してください");
  if (detail.length < 10) errors.push("詳細を10文字以上で入力してください");
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) errors.push("メールアドレスの形式が不正です");
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" / ") }, { status: 400 });
  }

  const html = `
    <p style="font-family:sans-serif;font-size:14px">アドプレスの「掲載内容に関するご連絡」フォームから受信しました。</p>
    ${fieldsToHtml([
      { label: "対象記事URL", value: url },
      { label: "理由", value: REASON_LABELS[reason] },
      { label: "該当箇所", value: where },
      { label: "詳細", value: detail },
      { label: "お名前", value: name },
      { label: "返信先メール", value: mail },
    ])}
    <p style="font-family:sans-serif;font-size:12px;color:#8A8D96;margin-top:18px">
      対象記事: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>
    </p>`;

  const result = await sendMail({
    subject: `【アドプレス】掲載内容に関するご連絡（${REASON_LABELS[reason]}）`,
    html,
    replyTo: mail || undefined,
  });

  if (!result.ok) {
    // 送信できていないのに「受け付けました」と見せない（以前の不具合の再発防止）
    console.error("report mail send failed:", result.error);
    return NextResponse.json(
      { error: "送信に失敗しました。お手数ですが info@cocomake-guide.com まで直接ご連絡ください。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
