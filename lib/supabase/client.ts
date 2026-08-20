"use client";

import { createBrowserClient } from "@supabase/ssr";

// ブラウザ（クライアントコンポーネント）用のSupabaseクライアント。
// 匿名キーのみを使用し、RLSに従う。書き込みが必要な操作はAPIルート経由で行うこと。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
