import Link from "next/link";
import { Plus, CreditCard, PenTool, BarChart3 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSeries, fetchEvents, groupCount, summarize } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/utils";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { VisitsChart } from "@/components/line-chart";

export default async function DashboardPage() {
  const db = createAdminClient();
  const since = new Date(Date.now() - 29 * 86400000);
  since.setHours(0, 0, 0, 0);

  const [biz, active, cards, allViews, allClicks, ev, bizNames] = await Promise.all([
    db.from("businesses").select("*", { count: "exact", head: true }),
    db.from("businesses").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("nfc_cards").select("*", { count: "exact", head: true }),
    db.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
    db.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "button_click"),
    fetchEvents({ from: since }),
    db.from("businesses").select("id, name"),
  ]);

  const total = biz.count ?? 0;
  const activeCount = active.count ?? 0;
  const names = new Map((bizNames.data ?? []).map((b) => [b.id as string, b.name as string]));
  const series = buildSeries(ev.rows, since, null);
  const month = summarize(ev.rows);
  const top = [...groupCount(ev.rows, "page_view", (e) => e.business_id).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const recent = ev.rows.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Сводка по всем заведениям. Все цифры берутся из базы данных."
        actions={
          <>
            <Link href="/admin/businesses/new" className="btn-primary"><Plus size={16} /> Новое заведение</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Заведения" value={formatNumber(total)} hint={`${activeCount} активных · ${total - activeCount} отключено`} tone="brand" />
        <StatCard label="NFC-карты" value={formatNumber(cards.count ?? 0)} hint="создано всего" />
        <StatCard label="Просмотры" value={formatNumber(allViews.count ?? 0)} hint={`${formatNumber(month.views)} за 30 дней`} />
        <StatCard label="Клики" value={formatNumber(allClicks.count ?? 0)} hint={`${formatNumber(month.clicks)} за 30 дней`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card rise p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-extrabold">Посещения за 30 дней</h2>
          <VisitsChart data={series} />
          {ev.truncated && <p className="mt-2 text-xs text-muted">Показаны последние 30 000 событий.</p>}
        </section>

        <section className="card rise p-5">
          <h2 className="mb-4 text-base font-extrabold">Быстрые действия</h2>
          <div className="grid gap-2">
            <Link href="/admin/businesses/new" className="btn-ghost justify-start"><Plus size={16} /> Добавить заведение</Link>
            <Link href="/admin/cards" className="btn-ghost justify-start"><CreditCard size={16} /> Выпустить NFC-карту</Link>
            <Link href="/admin/editor" className="btn-ghost justify-start"><PenTool size={16} /> Открыть редактор</Link>
            <Link href="/admin/analytics" className="btn-ghost justify-start"><BarChart3 size={16} /> Аналитика</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card rise p-5">
          <h2 className="mb-4 text-base font-extrabold">Популярные заведения (30 дней)</h2>
          {top.length === 0 ? (
            <p className="py-6 text-sm text-muted">Пока нет просмотров.</p>
          ) : (
            <ul className="space-y-3">
              {top.map(([id, n]) => (
                <li key={id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/analytics?business=${id}`} className="truncate text-sm font-semibold hover:text-brand">
                    {names.get(id) ?? "Удалённое заведение"}
                  </Link>
                  <span className="text-sm font-bold">{formatNumber(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card rise p-5">
          <h2 className="mb-4 text-base font-extrabold">Последние события</h2>
          {recent.length === 0 ? (
            <EmptyState title="Событий пока нет" text="Откройте публичную страницу карты — просмотр появится здесь." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {e.event_type === "page_view" ? "Просмотр страницы" : `Клик: ${e.button_label ?? "зона"}`}
                    </div>
                    <div className="truncate text-xs text-muted">{names.get(e.business_id ?? "") ?? "—"}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted">{formatDate(e.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
