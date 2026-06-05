// lib/supabase/server.ts （Server Component / Server Action 用）
// Next.js 15+ では cookies() は await が必要。
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export async function createClient() {
  const store = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は set 不可。middleware 側で更新される。
          }
        },
      },
    },
  );
}
