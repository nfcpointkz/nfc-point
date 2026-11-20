"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeUrl } from "@/lib/utils";
import type { Hotspot } from "@/lib/types";

type Result = { ok: boolean; error?: string; message?: string; imageUrl?: string; path?: string; token?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "page-images";
const MAX_ZONES = 60;

async function getOrCreatePage(businessId: string) {
  const db = createAdminClient();
  const { data } = await db.from("business_pages").select("*").eq("business_id", businessId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await db.from("business_pages").insert({ business_id: businessId }).select("*").single();
  if (error || !created) throw new Error(error?.message ?? "Не удалось создать страницу");
  return created;
}

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function sanitize(zones: Hotspot[]): { rows: Hotspot[]; error?: string } {
  if (!Array.isArray(zones)) return { rows: [], error: "Некорректные данные зон" };
  if (zones.length > MAX_ZONES) return { rows: [], error: `Максимум ${MAX_ZONES} зон` };
  const seen = new Set<string>();
  const rows: Hotspot[] = [];
  for (const [i, z] of zones.entries()) {
    if (!z || typeof z.hotspot_key !== "string" || !UUID.test(z.hotspot_key) || seen.has(z.hotspot_key)) {
      return { rows: [], error: "Некорректный идентификатор зоны" };
    }
    seen.add(z.hotspot_key);
    const name = String(z.name ?? "").trim().slice(0, 80);
    const rawUrl = String(z.url ?? "").trim().slice(0, 1000);
    const url = rawUrl ? safeUrl(rawUrl) : "";
    if (rawUrl && !url) return { rows: [], error: `Недопустимая ссылка у зоны «${name || "без названия"}»` };
    const w = num(z.w, 0.5, 100, 10);
    const h = num(z.h, 0.5, 100, 10);
    rows.push({
      hotspot_key: z.hotspot_key,
      name,
      url: url ?? "",
      x: num(z.x, 0, 100 - w, 0),
      y: num(z.y, 0, 100 - h, 0),
      w,
      h,
      sort_order: i,
    });
  }
  return { rows };
}

async function replaceZones(pageId: string, version: "draft" | "published", rows: Hotspot[]) {
  const db = createAdminClient();
  const del = await db.from("page_hotspots").delete().eq("page_id", pageId).eq("version", version);
  if (del.error) return del.error.message;
  if (rows.length === 0) return null;
  const ins = await db.from("page_hotspots").insert(rows.map((r) => ({ ...r, page_id: pageId, version })));
  return ins.error?.message ?? null;
}

/** Шаг 1 загрузки: сервер выдаёт одноразовую ссылку, файл браузер отправляет напрямую в Storage. */
export async function createUploadTarget(businessId: string, ext: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(businessId)) return { ok: false, error: "Некорректное заведение" };
  const e = ext.toLowerCase();
  if (!["png", "jpg", "jpeg", "webp"].includes(e)) return { ok: false, error: "Допустимы только PNG, JPG и WebP" };
  const path = `${businessId}/${crypto.randomUUID()}.${e === "jpeg" ? "jpg" : e}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "Не удалось подготовить загрузку" };
  return { ok: true, path: data.path, token: data.token };
}

/** Шаг 2: после загрузки сохраняем изображение как черновик. */
export async function setDraftImage(businessId: string, path: string, width: number, height: number): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(businessId) || !path.startsWith(`${businessId}/`) || path.includes("..")) {
    return { ok: false, error: "Некорректный путь файла" };
  }
  const w = Math.round(num(width, 1, 20000, 0));
  const h = Math.round(num(height, 1, 20000, 0));
  if (!w || !h) return { ok: false, error: "Не удалось определить размеры изображения" };
  const db = createAdminClient();
  const page = await getOrCreatePage(businessId);
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await db
    .from("business_pages")
    .update({ draft_image_url: data.publicUrl, draft_image_width: w, draft_image_height: h, updated_at: new Date().toISOString() })
    .eq("id", page.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/editor/${businessId}`);
  return { ok: true, message: "Изображение загружено", imageUrl: data.publicUrl };
}

export async function removeDraftImage(businessId: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(businessId)) return { ok: false, error: "Некорректное заведение" };
  const page = await getOrCreatePage(businessId);
  const { error } = await createAdminClient()
    .from("business_pages")
    .update({ draft_image_url: null, draft_image_width: null, draft_image_height: null, updated_at: new Date().toISOString() })
    .eq("id", page.id);
  if (error) return { ok: false, error: error.message };
  // Файл в Storage остаётся: на него может ссылаться опубликованная версия.
  revalidatePath(`/admin/editor/${businessId}`);
  return { ok: true, message: "Изображение удалено из черновика" };
}

export async function saveDraft(businessId: string, zones: Hotspot[]): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(businessId)) return { ok: false, error: "Некорректное заведение" };
  const { rows, error } = sanitize(zones);
  if (error) return { ok: false, error };
  const page = await getOrCreatePage(businessId);
  const err = await replaceZones(page.id, "draft", rows);
  if (err) return { ok: false, error: err };
  await createAdminClient().from("business_pages").update({ updated_at: new Date().toISOString() }).eq("id", page.id);
  return { ok: true, message: "Черновик сохранён" };
}

export async function publishPage(businessId: string, zones: Hotspot[]): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(businessId)) return { ok: false, error: "Некорректное заведение" };
  const { rows, error } = sanitize(zones);
  if (error) return { ok: false, error };
  const page = await getOrCreatePage(businessId);
  if (!page.draft_image_url) return { ok: false, error: "Сначала загрузите изображение" };

  const e1 = await replaceZones(page.id, "draft", rows);
  if (e1) return { ok: false, error: e1 };
  const e2 = await replaceZones(page.id, "published", rows);
  if (e2) return { ok: false, error: e2 };

  const now = new Date().toISOString();
  const { error: e3 } = await createAdminClient()
    .from("business_pages")
    .update({
      published_image_url: page.draft_image_url,
      published_image_width: page.draft_image_width,
      published_image_height: page.draft_image_height,
      published_at: now,
      updated_at: now,
    })
    .eq("id", page.id);
  if (e3) return { ok: false, error: e3.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/c/[token]", "page");
  return { ok: true, message: "Страница опубликована" };
}
