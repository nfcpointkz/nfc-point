"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/utils";

export type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

function clean(v: FormDataEntryValue | null, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

// ---------- Заведения ----------

export async function saveBusiness(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = clean(formData.get("id"), 40);
  const name = clean(formData.get("name"), 120);
  const category = clean(formData.get("category"), 60);
  const is_active = formData.get("is_active") === "on";
  if (name.length < 2) return { ok: false, error: "Название должно содержать минимум 2 символа" };

  const db = createAdminClient();
  if (id) {
    if (!isUuid(id)) return { ok: false, error: "Некорректный идентификатор" };
    const { error } = await db
      .from("businesses")
      .update({ name, category: category || null, is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Заведение сохранено", id };
  }

  const { data, error } = await db
    .from("businesses")
    .insert({ name, category: category || null, is_active })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Не удалось создать заведение" };

  // Страница-заготовка для редактора + первая NFC-карта
  const pageRes = await db.from("business_pages").insert({ business_id: data.id });
  if (pageRes.error) return { ok: false, error: pageRes.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Заведение создано", id: data.id };
}

export async function toggleBusiness(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return { ok: false, error: "Некорректный идентификатор" };
  const { error } = await createAdminClient().from("businesses").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: active ? "Заведение включено" : "Заведение отключено" };
}

export async function deleteBusiness(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return { ok: false, error: "Некорректный идентификатор" };
  const { error } = await createAdminClient().from("businesses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Заведение удалено" };
}

// ---------- NFC-карты ----------

export async function createCard(businessId: string, label: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(businessId)) return { ok: false, error: "Выберите заведение" };
  const db = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken(10);
    const { data, error } = await db
      .from("nfc_cards")
      .insert({ business_id: businessId, token, label: label.trim().slice(0, 80) || null })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/admin", "layout");
      return { ok: true, message: "Карта создана", id: data.id };
    }
    if (error && error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "Не удалось сгенерировать уникальный токен, повторите попытку" };
}

export async function toggleCard(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return { ok: false, error: "Некорректный идентификатор" };
  const { error } = await createAdminClient().from("nfc_cards").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: active ? "Карта включена" : "Карта отключена" };
}

export async function deleteCard(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return { ok: false, error: "Некорректный идентификатор" };
  const { error } = await createAdminClient().from("nfc_cards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Карта удалена" };
}
