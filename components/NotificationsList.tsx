"use client";

import { useState } from "react";
import Link from "next/link";

type Notification = {
  id: number;
  article_id: number | null;
  type: string;
  message: string;
  created_at: string;
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
            <button key={n.id} className={`notif-item${n.id === activeId ? " on" : ""}`} onClick={() => setActiveId(n.id)}>
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
            <Link href={`/news/${active.article_id}/`} className="post-btn">
              記事を見る
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
