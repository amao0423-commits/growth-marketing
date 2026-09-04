// フォーム受信通知メールの送信（Resend の REST API を直接叩く。SDK依存は追加しない）。
//
// 必要な環境変数:
//   RESEND_API_KEY   … Resend の API キー（未設定なら送信はスキップし、呼び出し側で失敗を返す）
//   MAIL_FROM        … 差出人。Resendで認証済みドメインのアドレスである必要がある。
//                      未認証ドメインを指定すると Resend が403を返す。
//                      現状の認証済みドメインは cocomarke.com のみ。
//   MAIL_TO          … 受信先。未設定時は info@cocomake-guide.com

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const MAIL_TO = process.env.MAIL_TO || "info@cocomake-guide.com";
const MAIL_FROM = process.env.MAIL_FROM || "アドプレス <noreply@cocomarke.com>";

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 「項目名: 値」の並びを、メール本文用のシンプルな定義リストHTMLにする。
export function fieldsToHtml(fields: { label: string; value: string }[]): string {
  const rows = fields
    .map(
      ({ label, value }) =>
        `<tr><th align="left" valign="top" style="padding:6px 14px 6px 0;white-space:nowrap;color:#55575E;font-weight:600">${escapeHtml(
          label
        )}</th><td valign="top" style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value || "（未入力）")}</td></tr>`
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;line-height:1.8">${rows}</table>`;
}

export type SendMailResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendMail(opts: {
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY が未設定です" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        subject: opts.subject,
        html: opts.html,
        // 返信するとそのまま問い合わせ者に返せるようにする
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` };
    }
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e).slice(0, 300) };
  }
}
