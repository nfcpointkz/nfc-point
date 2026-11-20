import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { ActionButton, CopyButton } from "@/components/client-bits";
import { deleteCard, toggleCard } from "../actions";
import { NewCardForm } from "./new-card-form";
import { formatDate, formatNumber, siteUrl } from "@/lib/utils";
import type { NfcCard } from "@/lib/types";

const PER_PAGE = 20;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; business?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;
  const db = createAdminClient();

  let q = db
    .from("nfc_cards")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);
  if (sp.business) q = q.eq("business_id", sp.business);

  const [cardsRes, bizRes] = await Promise.all([q, db.from("businesses").select("id, name").order("name")]);
  const cards = (cardsRes.data ?? []) as NfcCard[];
  const businesses = (bizRes.data ?? []) as { id: string; name: string }[];
  const names = new Map(businesses.map((b) => [b.id, b.name]));
  const pages = Math.max(1, Math.ceil((cardsRes.count ?? 0) / PER_PAGE));

  // Количество сканирований по картам на текущей странице
  const scans = new Map<string, number>();
  await Promise.all(
    cards.map(async (c) => {
      const { count } = await db
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("card_id", c.id)
        .eq("event_type", "page_view");
      scans.set(c.id, count ?? 0);
    }),
  );

  return (
    <>
      <PageHeader title="NFC-карты" subtitle="Каждая карта имеет уникальную ссылку. Несколько карт могут вести на одну страницу." />
      {businesses.length === 0 ? (
        <EmptyState
          title="Сначала создайте заведение"
          action={<Link href="/admin/businesses/new" className="btn-primary">Создать заведение</Link>}
        />
      ) : (
        <>
          <NewCardForm businesses={businesses} defaultBusiness={sp.business} />
          {cards.length === 0 ? (
            <EmptyState title="Карт пока нет" text="Создайте первую карту — токен сгенерируется автоматически." />
          ) : (
            <div className="space-y-3">
              {cards.map((c) => {
                const url = `${siteUrl()}/c/${c.token}`;
                return (
                  <div key={c.id} className="card rise flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{names.get(c.business_id) ?? "—"}</span>
                        <Badge tone={c.is_active ? "ok" : "off"}>{c.is_active ? "Активна" : "Отключена"}</Badge>
                        {c.label && <Badge tone="brand">{c.label}</Badge>}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-muted">{url}</div>
                      <div className="mt-1 text-xs text-muted">
                        Сканирований: <b className="text-ink">{formatNumber(scans.get(c.id) ?? 0)}</b> · создана {formatDate(c.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton text={url} label="Ссылка" />
                      <Link href={`/c/${c.token}`} target="_blank" className="btn-ghost !px-3 !py-2"><ExternalLink size={16} /></Link>
                      <ActionButton className="btn-ghost !px-3 !py-2" action={toggleCard.bind(null, c.id, !c.is_active)}>
                        {c.is_active ? "Отключить" : "Включить"}
                      </ActionButton>
                      <ActionButton
                        className="btn-danger !px-3 !py-2"
                        confirmText="Удалить карту? Ссылка перестанет работать."
                        action={deleteCard.bind(null, c.id)}
                      >
                        Удалить
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link className="btn-ghost" href={`?page=${page - 1}${sp.business ? `&business=${sp.business}` : ""}`}>Назад</Link>}
              <span className="text-muted">{page} / {pages}</span>
              {page < pages && <Link className="btn-ghost" href={`?page=${page + 1}${sp.business ? `&business=${sp.business}` : ""}`}>Вперёд</Link>}
            </div>
          )}
        </>
      )}
    </>
  );
}
