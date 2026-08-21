"use client";

import { useState } from "react";
import Link from "next/link";

type Notification = {
  id: number;
  article_id: number | null;
  type: string;
  message: string;
  created_at: string;
  is_read?: boolean;
};

const KIND_LABEL: Record<string, { label: string; className: string }> = {
  published: { label: "公開", className: "k-pub" },
  flagged: { label: "確認中", className: "k-check" },
  removed: { label: "取り下げ", className: "k-rev" },
  referral_reminder: { label: "要対応", className: "k-ref" },
  referral_verified: { label: "確認済み", className: "k-pub" },
  report_ready: { label: "レポート", className: "k-rep" },
};

export default function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [activeId, setActiveId] = useState<number | null>(notifications[0]?.id ?? null);
  const active = notifications.find((n) => n.id === activeId) ?? notifications[0];

  if (notifications.length === 0) {
    return <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>お知らせはありません。</p>;
  }

  return (
    <div className="notif-layout">
      <nav className="notif-list" aria-label="お知らせ一覧">
        {notifications.map((n) => {
          const kind = KIND_LABEL[n.type] ?? { label: n.type, className: "k-pub" };
          return (
            <button key={n.id} className={`notif-item${n.id === activeId ? " on" : ""}${n.is_read === false ? " unread" : ""}`} onClick={() => setActiveId(n.id)}>
              <span className={`k ${kind.className}`}>{kind.label}</span>
              <p className="t">{n.message}</p>
              <span className="d">{new Date(n.created_at).toLocaleString("ja-JP")}</span>
            </button>
          );
        })}
      </nav>

      {active && (
        <section className="notif-detail">
          <div className="head">
            <span className={`k ${(KIND_LABEL[active.type] ?? { className: "k-pub" }).className}`} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
              {(KIND_LABEL[active.type] ?? { label: active.type }).label}
            </span>
            <h2>{active.message}</h2>
            <span className="when">{new Date(active.created_at).toLocaleString("ja-JP")}</span>
          </div>
          {active.article_id && (
            <div className="notif-article">
              <span className="tag" style={{ background: "var(--c-korea-bg)", color: "var(--c-korea-fg)" }}>
                記事
              </span>
              <h3>{active.message}</h3>
              <div className="u">https://www.nishinippon-adv.jp/news/{active.article_id}/</div>
              <Link href={`/news/${active.article_id}/`} className="btn">
                記事を見る
              </Link>
            </div>
          )}
          <NotificationBody notification={active} />
        </section>
      )}
    </div>
  );
}

function NotificationBody({ notification }: { notification: Notification }) {
  if (notification.type === "published") {
    return (
      <>
        <h3>掲載記事の紹介をお願いします</h3>
        <p>アドプレスの記事は、発信元ご自身の告知によって最初の読者が集まります。掲載後は、自社サイトのお知らせ欄やSNSで記事のURLをご紹介ください。</p>
        <div className="ways">
          <div className="way"><b>自社サイトのお知らせ欄・プレスルーム</b>記事タイトルとリンクを掲載してください。</div>
          <div className="way"><b>SNS</b>X・Instagram・Facebook・LINEなどで、記事URLを添えて投稿してください。</div>
          <div className="way"><b>メールマガジン・社内報・採用ページ</b>掲載実績としてご活用いただけます。</div>
        </div>
        <div className="tmpl">■メディア掲載実績{"\n\n"}プレスリリースサイト「アドプレス」に掲載されました。{"\n\n"}アドプレス掲載ページ：https://www.nishinippon-adv.jp/news/{notification.article_id ?? "00000"}/</div>
        <Link href="/mypage/" className="btn warn">紹介リンクを提出する</Link>
      </>
    );
  }

  if (notification.type === "referral_reminder") {
    return (
      <>
        <p>紹介リンクのご提出をお待ちしています。期限までにご提出がない場合、記事を取り下げることがあります。</p>
        <Link href="/mypage/" className="btn warn">紹介リンクを提出する</Link>
      </>
    );
  }

  if (notification.type === "report_ready") {
    return (
      <>
        <p>掲載から1ヶ月が経過したため、レポートを公開しました。日別の推移とリンク別のクリック数は、マイページの記事カードから確認できます。</p>
        <Link href="/mypage/" className="btn">レポートを見る</Link>
      </>
    );
  }

  if (notification.type === "flagged" || notification.type === "removed") {
    return (
      <>
        <h3>確認が必要な点</h3>
        <p>掲載ガイドラインまたは利用規約に照らして、編集部で確認しています。必要に応じて修正や取り下げのご案内を行います。</p>
        <Link href="/guideline/" className="btn">掲載ガイドラインを見る</Link>
      </>
    );
  }

  return (
    <>
      <p>アドプレスからのお知らせです。必要な対応がある場合は、マイページから手続きを進めてください。</p>
      <Link href="/mypage/" className="btn">マイページを開く</Link>
    </>
  );
}
