import { createClient } from "@/lib/supabase/server";
import HeaderChrome from "@/components/HeaderChrome";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("is_editorial").eq("id", user.id).single()
    : { data: null };

  return <HeaderChrome isLoggedIn={!!user} isEditorial={!!profile?.is_editorial} />;
}
