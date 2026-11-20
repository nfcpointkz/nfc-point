"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 200) {
    return { error: "Введите почту и пароль" };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Неверная почта или пароль" };

  // Проверяем, что аккаунт есть в admin_users (иначе сразу выходим).
  const db = createAdminClient();
  let allowed = false;
  const q1 = await db.from("admin_users").select("*").eq("email", email).limit(1);
  if (!q1.error) allowed = (q1.data?.length ?? 0) > 0;
  else {
    const q2 = await db.from("admin_users").select("*").eq("user_id", data.user.id).limit(1);
    if (!q2.error) allowed = (q2.data?.length ?? 0) > 0;
    else allowed = email === (process.env.ADMIN_EMAIL ?? "nfc.point.kz@gmail.com").toLowerCase();
  }
  if (!allowed) {
    await supabase.auth.signOut();
    return { error: "У этого аккаунта нет доступа к панели" };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
