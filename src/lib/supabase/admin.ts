import "server-only";
import { createClient } from "@supabase/supabase-js";

// Клиент с секретным ключом. Используется ТОЛЬКО на сервере.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Не заданы NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SECRET_KEY в .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
