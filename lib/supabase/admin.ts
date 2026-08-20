import "server-only";
import { createClient } from "@supabase/supabase-js";

// service_role キーを使う管理者クライアント。RLSを全てバイパスするため、
// 投稿の自動審査・紹介リンク期限チェックなど、サーバー内部処理でのみ使用すること。
// ブラウザ・クライアントコンポーネントには絶対に公開しない。
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL が未設定です。.env.local を確認してください。"
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
