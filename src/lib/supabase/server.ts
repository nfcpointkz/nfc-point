import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Клиент с сессией пользователя (cookies). Для проверки входа администратора.
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // вызов из Server Component — игнорируем, cookies обновит proxy
          }
        },
      },
    },
  );
}
