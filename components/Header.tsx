import { createClient } from "@/lib/supabase/server";
import HeaderChrome from "@/components/HeaderChrome";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HeaderChrome isLoggedIn={!!user} />;
}
