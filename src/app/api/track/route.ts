import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TOKEN = /^[A-Za-z0-9]{6,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ограничение частоты: не более LIMIT событий за WINDOW с одного IP.
// IP хранится только в памяти процесса (в базу не пишется). На serverless это "best effort":
// каждый инстанс считает отдельно, но грубый флуд отсекается.
const WINDOW = 60_000;
const LIMIT = 40;
const hits = new Map<string, { n: number; reset: number }>();

function limited(key: string) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + WINDOW });
    return false;
  }
  h.n++;
  return h.n > LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { type?: unknown; token?: unknown; buttonKey?: unknown; visitorId?: unknown };
  try {
    const text = await req.text();
    if (text.length > 2000) return NextResponse.json({ ok: false }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = body.type;
  const token = typeof body.token === "string" ? body.token : "";
  if ((type !== "page_view" && type !== "button_click") || !TOKEN.test(token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const visitorId = typeof body.visitorId === "string" && UUID.test(body.visitorId) ? body.visitorId : null;

  const db = createAdminClient();
  const { data: card } = await db.from("nfc_cards").select("id, business_id, is_active").eq("token", token).maybeSingle();
  if (!card || !card.is_active) return NextResponse.json({ ok: false }, { status: 404 });

  let buttonKey: string | null = null;
  let buttonLabel: string | null = null;

  if (type === "button_click") {
    const key = typeof body.buttonKey === "string" ? body.buttonKey : "";
    if (!UUID.test(key)) return NextResponse.json({ ok: false }, { status: 400 });
    // Название берём из базы, а не от клиента — клиенту доверять нельзя.
    const { data: page } = await db.from("business_pages").select("id").eq("business_id", card.business_id).maybeSingle();
    if (!page) return NextResponse.json({ ok: false }, { status: 404 });
    const { data: btn } = await db
      .from("page_hotspots")
      .select("hotspot_key, name")
      .eq("page_id", page.id)
      .eq("version", "published")
      .eq("hotspot_key", key)
      .maybeSingle();
    if (!btn) return NextResponse.json({ ok: false }, { status: 404 });
    buttonKey = btn.hotspot_key;
    buttonLabel = btn.name || "Зона";
  }

  const { error } = await db.from("analytics_events").insert({
    event_type: type,
    business_id: card.business_id,
    card_id: card.id,
    button_key: buttonKey,
    button_label: buttonLabel,
    visitor_id: visitorId,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
