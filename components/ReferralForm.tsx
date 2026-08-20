"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReferralForm({ articleId }: { articleId: number }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。");
        return;
      }
      router.push("/mypage/");
    } catch {
      setError("通信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p style={{ background: "#FFE8EB", color: "#A33A4E", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
          {error}
        </p>
      )}
      <input
        type="url"
        required
        placeholder="https://"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", border: "1px solid #D5D6DC", borderRadius: 8, padding: "10px 13px", fontSize: 14, marginBottom: 16 }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{ width: "100%", height: 50, border: "none", borderRadius: 99, background: "#C9D3FF", color: "#293A80", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
      >
        {submitting ? "送信中…" : "提出する"}
      </button>
    </form>
  );
}
