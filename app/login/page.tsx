"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function loginWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="ap-wrap" style={{ maxWidth: 480, padding: "60px 20px 100px", textAlign: "center" }}>
      <h1 style={{ marginBottom: 8 }}>ログイン</h1>
      <p style={{ color: "#55575E", fontSize: 13.5, marginBottom: 32 }}>
        記事の投稿・マイページの利用にはログインが必要です。
      </p>
      <button
        onClick={loginWithGoogle}
        disabled={loading}
        style={{
          width: "100%",
          height: 52,
          border: "1px solid #D5D6DC",
          borderRadius: 99,
          background: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {loading ? "リダイレクト中…" : "Googleでログイン"}
      </button>
    </div>
  );
}
