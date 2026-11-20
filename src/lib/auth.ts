import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FALLBACK_ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "nfc.point.kz@gmail.com").toLowerCase();

/** Проверка, что пользователь есть в таблице admin_users (по email или user_id). */
async function isInAdminUsers(userId: string, email: string): Promise<boolean> {
  const db = createAdminClient();
  const byEmail = await db.from("admin_users").select("*").eq("email", email).limit(1);
  if (!byEmail.error) return (byEmail.data?.length ?? 0) > 0;
  const byUser = await db.from("admin_users").select("*").eq("user_id", userId).limit(1);
  if (!byUser.error) return (byUser.data?.length ?? 0) > 0;
  const byId = await db.from("admin_users").select("*").eq("id", userId).limit(1);
  if (!byId.error) return (byId.data?.length ?? 0) > 0;
  // Структура таблицы неизвестна — разрешаем только основной адрес администратора.
  return email === FALLBACK_ADMIN_EMAIL;
}

/** Вызывать в начале каждой админской страницы и каждого server action. */
export async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !user.email) redirect("/login");
  const ok = await isInAdminUsers(user.id, user.email.toLowerCase());
  if (!ok) {
    await supabase.auth.signOut();
    redirect("/login?error=denied");
  }
  return { id: user.id, email: user.email };
}
