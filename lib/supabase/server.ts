import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバーコンポーネント/ルートハンドラ用のSupabaseクライアント（匿名キー・RLS適用）。
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出しでは Cookie を書けない場合がある。
            // ミドルウェアでセッションを更新している限り無視して問題ない。
          }
        },
      },
    }
  );
}
