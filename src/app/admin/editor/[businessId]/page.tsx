import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge } from "@/components/ui";
import { Editor } from "./editor";
import type { BusinessPage, NfcCard, Hotspot } from "@/lib/types";

export default async function EditorPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const db = createAdminClient();

  const { data: biz } = await db.from("businesses").select("id, name, is_active").eq("id", businessId).maybeSingle();
  if (!biz) notFound();

  let { data: page } = await db.from("business_pages").select("*").eq("business_id", businessId).maybeSingle();
  if (!page) {
    const created = await db.from("business_pages").insert({ business_id: businessId }).select("*").single();
    page = created.data;
  }
  if (!page) throw new Error("Не удалось создать страницу заведения");
  const p = page as BusinessPage;

  const [{ data: btns }, { data: cards }] = await Promise.all([
    db.from("page_hotspots").select("hotspot_key, name, url, x, y, w, h, sort_order").eq("page_id", p.id).eq("version", "draft").order("sort_order"),
    db.from("nfc_cards").select("*").eq("business_id", businessId).order("created_at"),
  ]);
  const cardList = (cards ?? []) as NfcCard[];
  const liveCard = cardList.find((c) => c.is_active) ?? cardList[0];

  return (
    <>
      <PageHeader
        title={`Редактор: ${biz.name}`}
        subtitle="Загрузите изображение и выделите на нём прозрачные кликабельные зоны."
        actions={
          <>
            <Badge tone={p.published_at ? "ok" : "off"}>{p.published_at ? "Опубликовано" : "Не опубликовано"}</Badge>
            {liveCard && p.published_at && (
              <Link href={`/c/${liveCard.token}`} target="_blank" className="btn-ghost"><ExternalLink size={16} /> Открыть страницу</Link>
            )}
            <Link href={`/admin/businesses/${businessId}`} className="btn-ghost">К заведению</Link>
          </>
        }
      />
      {cardList.length === 0 && (
        <p className="mb-4 rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">
          У заведения ещё нет NFC-карт — страница будет доступна только после выпуска карты в разделе «NFC-карты».
        </p>
      )}
      <Editor
        businessId={businessId}
        initialImage={
          p.draft_image_url && p.draft_image_width && p.draft_image_height
            ? { url: p.draft_image_url, w: p.draft_image_width, h: p.draft_image_height }
            : null
        }
        initialZones={(btns ?? []) as Hotspot[]}
        publishedAt={p.published_at}
      />
    </>
  );
}
