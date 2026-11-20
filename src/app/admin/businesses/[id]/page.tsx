import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, PenTool, BarChart3 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge } from "@/components/ui";
import { ActionButton } from "@/components/client-bits";
import { deleteBusiness, toggleBusiness } from "../../actions";
import { BusinessForm } from "../business-form";
import type { Business, NfcCard } from "@/lib/types";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: biz } = await db.from("businesses").select("*").eq("id", id).maybeSingle();
  if (!biz) notFound();
  const business = biz as Business;
  const { data: cardsData } = await db.from("nfc_cards").select("*").eq("business_id", id).order("created_at");
  const cards = (cardsData ?? []) as NfcCard[];
  const first = cards.find((c) => c.is_active) ?? cards[0];

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle={business.category ?? "Без категории"}
        actions={
          <>
            <Badge tone={business.is_active ? "ok" : "off"}>{business.is_active ? "Активно" : "Отключено"}</Badge>
            <Link href={`/admin/editor/${business.id}`} className="btn-brand"><PenTool size={16} /> Редактор</Link>
            <Link href={`/admin/analytics?business=${business.id}`} className="btn-ghost"><BarChart3 size={16} /> Аналитика</Link>
            {first && (
              <Link href={`/c/${first.token}`} target="_blank" className="btn-ghost"><ExternalLink size={16} /> Страница</Link>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <BusinessForm business={business} />
        <div className="space-y-4">
          <div className="card p-5">
            <div className="label">Карты ({cards.length})</div>
            {cards.length === 0 ? (
              <p className="text-sm text-muted">Карт пока нет.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {cards.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate font-mono">{c.token}</span>
                    <span className={c.is_active ? "text-ok" : "text-muted"}>{c.is_active ? "вкл" : "выкл"}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/admin/cards?business=${business.id}`} className="btn-ghost mt-4 w-full">Управлять картами</Link>
          </div>
          <div className="card space-y-2 p-5">
            <ActionButton className="btn-ghost w-full" action={toggleBusiness.bind(null, business.id, !business.is_active)}>
              {business.is_active ? "Отключить заведение" : "Включить заведение"}
            </ActionButton>
            <ActionButton
              className="btn-danger w-full"
              redirectTo="/admin/businesses"
              confirmText={`Удалить «${business.name}» вместе со страницей, картами и статистикой? Это нельзя отменить.`}
              action={deleteBusiness.bind(null, business.id)}
            >
              Удалить заведение
            </ActionButton>
          </div>
        </div>
      </div>
    </>
  );
}
