import Link from "next/link";
import { Plus, PenTool, BarChart3 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Business } from "@/lib/types";

const PER_PAGE = 20;

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;
  const db = createAdminClient();
  const { data, count } = await db
    .from("businesses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);
  const rows = (data ?? []) as Business[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Заведения"
        subtitle="Ваши клиенты. У каждого — своя страница и сколько угодно NFC-карт."
        actions={<Link href="/admin/businesses/new" className="btn-primary"><Plus size={16} /> Новое заведение</Link>}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Заведений пока нет"
          text="Создайте первое заведение, чтобы выпустить для него NFC-карту и оформить страницу."
          action={<Link href="/admin/businesses/new" className="btn-primary"><Plus size={16} /> Создать</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Название</th>
                <th className="hidden px-5 py-3 sm:table-cell">Категория</th>
                <th className="hidden px-5 py-3 md:table-cell">Создано</th>
                <th className="px-5 py-3">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.id} className="transition hover:bg-canvas/50">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/businesses/${b.id}`} className="font-bold hover:text-brand">{b.name}</Link>
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted sm:table-cell">{b.category ?? "—"}</td>
                  <td className="hidden px-5 py-3.5 text-muted md:table-cell">{formatDate(b.created_at)}</td>
                  <td className="px-5 py-3.5"><Badge tone={b.is_active ? "ok" : "off"}>{b.is_active ? "Активно" : "Отключено"}</Badge></td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/editor/${b.id}`} className="btn-ghost !px-3 !py-2" title="Редактор"><PenTool size={15} /></Link>
                      <Link href={`/admin/analytics?business=${b.id}`} className="btn-ghost !px-3 !py-2" title="Аналитика"><BarChart3 size={15} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-ghost" href={`?page=${page - 1}`}>Назад</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link className="btn-ghost" href={`?page=${page + 1}`}>Вперёд</Link>}
        </div>
      )}
    </>
  );
}
