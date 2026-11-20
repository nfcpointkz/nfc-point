import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, EmptyState, Badge } from "@/components/ui";

export default async function EditorIndexPage() {
  const db = createAdminClient();
  const [{ data: biz }, { data: pages }] = await Promise.all([
    db.from("businesses").select("id, name, is_active").order("name"),
    db.from("business_pages").select("business_id, draft_image_url, published_at"),
  ]);
  const pageBy = new Map((pages ?? []).map((p) => [p.business_id as string, p]));

  return (
    <>
      <PageHeader title="Редактор страниц" subtitle="Выберите заведение, чтобы загрузить дизайн и выделить интерактивные зоны." />
      {!biz || biz.length === 0 ? (
        <EmptyState title="Нет заведений" action={<Link href="/admin/businesses/new" className="btn-primary">Создать заведение</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {biz.map((b) => {
            const p = pageBy.get(b.id);
            return (
              <Link key={b.id} href={`/admin/editor/${b.id}`} className="card rise group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="font-extrabold group-hover:text-brand">{b.name}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={p?.draft_image_url ? "brand" : "off"}>{p?.draft_image_url ? "Есть дизайн" : "Без дизайна"}</Badge>
                  <Badge tone={p?.published_at ? "ok" : "off"}>{p?.published_at ? "Опубликовано" : "Не опубликовано"}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
