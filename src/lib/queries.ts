import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsEvent } from "@/lib/types";

const PAGE = 1000;
const MAX_ROWS = 30000;
const TZ_SHIFT_MS = 5 * 3600 * 1000; // Казахстан, UTC+5

export type EventFilter = {
  from?: Date | null;
  to?: Date | null;
  businessId?: string;
  cardId?: string;
};

/** Загружает события страницами по 1000 (лимит Supabase) — не более MAX_ROWS. */
export async function fetchEvents(f: EventFilter): Promise<{ rows: AnalyticsEvent[]; truncated: boolean }> {
  const db = createAdminClient();
  const rows: AnalyticsEvent[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    let q = db
      .from("analytics_events")
      .select("id, created_at, event_type, business_id, card_id, button_key, button_label, visitor_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (f.from) q = q.gte("created_at", f.from.toISOString());
    if (f.to) q = q.lt("created_at", f.to.toISOString());
    if (f.businessId) q = q.eq("business_id", f.businessId);
    if (f.cardId) q = q.eq("card_id", f.cardId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as AnalyticsEvent[]));
    if (!data || data.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export function dayKey(iso: string) {
  return new Date(new Date(iso).getTime() + TZ_SHIFT_MS).toISOString().slice(0, 10);
}

export type DayPoint = { day: string; views: number; clicks: number };

/** Ряд по дням без пропусков. */
export function buildSeries(events: AnalyticsEvent[], from: Date | null, to: Date | null): DayPoint[] {
  const map = new Map<string, DayPoint>();
  for (const e of events) {
    const k = dayKey(e.created_at);
    const p = map.get(k) ?? { day: k, views: 0, clicks: 0 };
    if (e.event_type === "page_view") p.views++;
    else if (e.event_type === "button_click") p.clicks++;
    map.set(k, p);
  }
  const keys = [...map.keys()].sort();
  const start = from ? dayKey(from.toISOString()) : keys[0];
  const end = to ? dayKey(new Date(to.getTime() - 1).toISOString()) : dayKey(new Date().toISOString());
  if (!start) return [];
  const out: DayPoint[] = [];
  const cur = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  let guard = 0;
  while (cur <= last && guard++ < 800) {
    const k = cur.toISOString().slice(0, 10);
    out.push(map.get(k) ?? { day: k, views: 0, clicks: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function summarize(events: AnalyticsEvent[]) {
  let views = 0;
  let clicks = 0;
  const visitors = new Set<string>();
  for (const e of events) {
    if (e.event_type === "page_view") views++;
    else if (e.event_type === "button_click") clicks++;
    if (e.visitor_id) visitors.add(e.visitor_id);
  }
  return { views, clicks, unique: visitors.size };
}

export function groupCount<T extends string>(
  events: AnalyticsEvent[],
  type: "page_view" | "button_click",
  keyOf: (e: AnalyticsEvent) => T | null,
) {
  const m = new Map<T, number>();
  for (const e of events) {
    if (e.event_type !== type) continue;
    const k = keyOf(e);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
