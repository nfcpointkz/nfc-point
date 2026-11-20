import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSeries, fetchEvents, groupCount, summarize } from "@/lib/queries";
import { RANGE_LABELS, resolveRange, type RangeKey } from "@/lib/range";
import { formatDate, formatNumber } from "@/lib/utils";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { VisitsChart } from "@/components/line-chart";
import type { NfcCard } from "@/lib/types";

type SP = { range?: string; from?: string; to?: string; business?: string; card?: string; page?: string };
const PER_PAGE = 25;
const PRESETS: RangeKey[] = ["today", "yesterday", "7d", "30d", "90d", "all"];

function qs(sp: SP, patch: Partial<SP>) {
  const m = { ...sp, ...patch };
  const p = new URLSearchParams();
  Object.entries(m).forEach(([k, v]) => v && p.set(k, v));
  return `?${p.toString()}`;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const r = resolveRange(sp.range, sp.from, sp.to);
  const db = createAdminClient();

  const [ev, bizRes, cardRes] = await Promise.all([
    fetchEvents({ from: r.from, to: r.to, businessId: sp.business || undefined, cardId: sp.card || undefined }),
    db.from("businesses").select("id, name").order("name"),
    db.from("nfc_cards").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  const businesses = (bizRes.data ?? []) as { id: string; name: string }[];
  const cards = (cardRes.data ?? []) as NfcCard[];
  const bizName = new Map(businesses.map((b) => [b.id, b.name]));
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const sum = summarize(ev.rows);
  const series = buildSeries(ev.rows, r.from, r.to);

  const viewsByBiz = groupCount(ev.rows, "page_view", (e) => e.business_id);
  const clicksByBiz = groupCount(ev.rows, "button_click", (e) => e.business_id);
  const bizIds = [...new Set([...viewsByBiz.keys(), ...clicksByBiz.keys()])].sort(
    (a, b) => (viewsByBiz.get(b) ?? 0) - (viewsByBiz.get(a) ?? 0),
  );

  const clicksByButton = groupCount(ev.rows, "button_click", (e) =>
    e.button_key ? `${e.business_id ?? ""}|${e.button_key}|${e.button_label ?? "Зона"}` : null,
  );
  const buttonRows = [...clicksByButton.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  const viewsByCard = groupCount(ev.rows, "page_view", (e) => e.card_id);
  const cardRows = [...viewsByCard.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(ev.rows.length / PER_PAGE));
  const history = ev.rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <PageHeader title="Аналитика" subtitle="Просмотры и клики по заведениям, зонам и NFC-картам." />

      <div className="card mb-6 space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((k) => (
            <Link
              key={k}
              href={qs(sp, { range: k, from: undefined, to: undefined, page: undefined })}
              className={r.key === k ? "btn bg-ink text-white !py-2" : "btn-ghost !py-2"}
            >
              {RANGE_LABELS[k]}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label className="label" htmlFor="from">С</label>
            <input id="from" type="date" name="from" defaultValue={sp.from} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="to">По</label>
            <input id="to" type="date" name="to" defaultValue={sp.to} className="input" />
          </div>
          <div className="min-w-44">
            <label className="label" htmlFor="business">Заведение</label>
            <select id="business" name="business" defaultValue={sp.business ?? ""} className="input">
              <option value="">Все</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="min-w-44">
            <label className="label" htmlFor="card">Карта</label>
            <select id="card" name="card" defaultValue={sp.card ?? ""} className="input">
              <option value="">Все</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{(bizName.get(c.business_id) ?? "—") + " · " + c.token}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary">Применить</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Просмотры" value={formatNumber(sum.views)} tone="brand" />
        <StatCard label="Клики" value={formatNumber(sum.clicks)} />
        <StatCard label="Уникальные посетители" value={formatNumber(sum.unique)} hint="приблизительно" />
        <StatCard label="CTR" value={sum.views ? `${((sum.clicks / sum.views) * 100).toFixed(1)}%` : "—"} hint="клики / просмотры" />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 text-base font-extrabold">Динамика по дням</h2>
        <VisitsChart data={series} />
        {ev.truncated && <p className="mt-2 text-xs text-muted">Показаны последние 30 000 событий периода. Сузьте фильтр для точных данных.</p>}
      </section>

      {ev.rows.length === 0 ? (
        <div className="mt-6"><EmptyState title="Нет событий за выбранный период" text="Измените фильтры или откройте публичную страницу карты." /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="card overflow-hidden">
              <h2 className="p-5 pb-3 text-base font-extrabold">По заведениям</h2>
              <table className="w-full text-sm">
                <thead className="bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-5 py-2">Заведение</th><th className="px-3 py-2 text-right">Просм.</th><th className="px-5 py-2 text-right">Клики</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bizIds.map((id) => (
                    <tr key={id}>
                      <td className="px-5 py-2.5 font-semibold">{id ? bizName.get(id) ?? "Удалено" : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{formatNumber(viewsByBiz.get(id) ?? 0)}</td>
                      <td className="px-5 py-2.5 text-right">{formatNumber(clicksByBiz.get(id) ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card overflow-hidden">
              <h2 className="p-5 pb-3 text-base font-extrabold">Популярные зоны</h2>
              {buttonRows.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">Кликов пока нет.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                    <tr><th className="px-5 py-2">Зона</th><th className="px-3 py-2">Заведение</th><th className="px-5 py-2 text-right">Клики</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {buttonRows.map(([key, n]) => {
                      const [bid, , label] = key.split("|");
                      return (
                        <tr key={key}>
                          <td className="px-5 py-2.5 font-semibold">{label}</td>
                          <td className="px-3 py-2.5 text-muted">{bizName.get(bid) ?? "—"}</td>
                          <td className="px-5 py-2.5 text-right">{formatNumber(n)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card overflow-hidden lg:col-span-2">
              <h2 className="p-5 pb-3 text-base font-extrabold">По NFC-картам (сканирования)</h2>
              {cardRows.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">Нет данных по картам.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                    <tr><th className="px-5 py-2">Карта</th><th className="px-3 py-2">Заведение</th><th className="px-5 py-2 text-right">Сканирования</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {cardRows.map(([id, n]) => {
                      const c = cardMap.get(id);
                      return (
                        <tr key={id}>
                          <td className="px-5 py-2.5 font-mono text-xs">{c ? c.token : "удалена"}{c?.label ? ` · ${c.label}` : ""}</td>
                          <td className="px-3 py-2.5 text-muted">{c ? bizName.get(c.business_id) ?? "—" : "—"}</td>
                          <td className="px-5 py-2.5 text-right">{formatNumber(n)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <section className="card mt-6 overflow-hidden">
            <h2 className="p-5 pb-3 text-base font-extrabold">История событий</h2>
            <table className="w-full text-sm">
              <thead className="bg-canvas/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-5 py-2">Время</th><th className="px-3 py-2">Событие</th><th className="hidden px-3 py-2 sm:table-cell">Заведение</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDate(e.created_at)}</td>
                    <td className="px-3 py-2.5 font-semibold">
                      {e.event_type === "page_view" ? "Просмотр" : `Клик: ${e.button_label ?? "зона"}`}
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{bizName.get(e.business_id ?? "") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4 text-sm">
                {page > 1 && <Link className="btn-ghost" href={qs(sp, { page: String(page - 1) })}>Назад</Link>}
                <span className="text-muted">{page} / {pages}</span>
                {page < pages && <Link className="btn-ghost" href={qs(sp, { page: String(page + 1) })}>Вперёд</Link>}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
