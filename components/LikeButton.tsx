"use client";

import { useState, useTransition } from "react";

export default function LikeButton({
  articleId,
  initialCount,
  initialLiked,
  isLoggedIn,
}: {
  articleId: number;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!isLoggedIn) {
      setMessage("いいねするにはログインしてください。");
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    setMessage("");

    startTransition(async () => {
      const res = await fetch(`/api/articles/${articleId}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLiked(!nextLiked);
        setCount((current) => Math.max(0, current + (nextLiked ? -1 : 1)));
        setMessage(data?.error ?? "いいねを更新できませんでした。");
        return;
      }
      if (typeof data?.count === "number") setCount(data.count);
      if (typeof data?.liked === "boolean") setLiked(data.liked);
    });
  }

  return (
    <div className="like-box">
      <button type="button" className={`like-button${liked ? " on" : ""}`} onClick={toggle} disabled={pending}>
        <span aria-hidden="true">♥</span>
        <span>{liked ? "いいね済み" : "いいね"}</span>
        <b className="mono">{count}</b>
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
