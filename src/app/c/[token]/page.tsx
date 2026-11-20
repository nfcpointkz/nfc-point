import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicPage } from "./public-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const TOKEN = /^[A-Za-z0-9]{6,32}$/;

function Unavailable() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-line text-muted">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold">Страница временно недоступна</h1>
        <p className="mt-2 text-sm text-muted">Обратитесь к администрации заведения.</p>
        <h2 className="mt-6 text-base font-bold">Бет уақытша қолжетімсіз</h2>
        <p className="mt-1 text-sm text-muted">Мекеме әкімшілігіне хабарласыңыз.</p>
      </div>
    </main>
  );
}

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return <Unavailable />;

  const db = createAdminClient();
  const { data: card } = await db.from("nfc_cards").select("id, business_id, is_active").eq("token", token).maybeSingle();
  if (!card || !card.is_active) return <Unavailable />;

  const { data: biz } = await db.from("businesses").select("id, is_active").eq("id", card.business_id).maybeSingle();
  if (!biz || !biz.is_active) return <Unavailable />;

  const { data: page } = await db
    .from("business_pages")
    .select("id, published_image_url, published_image_width, published_image_height")
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!page?.published_image_url || !page.published_image_width || !page.published_image_height) return <Unavailable />;

  const { data: zs } = await db
    .from("page_hotspots")
    .select("hotspot_key, url, x, y, w, h")
    .eq("page_id", page.id)
    .eq("version", "published")
    .order("sort_order");
  // Зоны без ссылки не отдаём; названия не выбираем вообще.
  const zones = (zs ?? [])
    .filter((z) => typeof z.url === "string" && z.url.trim() !== "")
    .map((z) => ({ id: z.hotspot_key as string, url: z.url as string, x: Number(z.x), y: Number(z.y), w: Number(z.w), h: Number(z.h) }));

  return (
    <PublicPage
      token={token}
      imageUrl={page.published_image_url}
      width={page.published_image_width}
      height={page.published_image_height}
      zones={zones}
    />
  );
}
