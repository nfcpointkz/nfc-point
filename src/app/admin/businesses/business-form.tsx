"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveBusiness, type ActionResult } from "../actions";
import type { Business } from "@/lib/types";

export function BusinessForm({ business }: { business?: Business }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveBusiness, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Сохранено");
      if (!business) router.push(`/admin/businesses/${state.id}`);
      else router.refresh();
    } else toast.error(state.error ?? "Ошибка");
  }, [state, business, router]);

  return (
    <form action={action} className="card max-w-xl space-y-5 p-6">
      {business && <input type="hidden" name="id" value={business.id} />}
      <div>
        <label className="label" htmlFor="name">Название</label>
        <input id="name" name="name" required minLength={2} maxLength={120} defaultValue={business?.name} className="input" placeholder="Кофейня «Утро»" />
      </div>
      <div>
        <label className="label" htmlFor="category">Категория</label>
        <input id="category" name="category" maxLength={60} defaultValue={business?.category ?? ""} className="input" placeholder="Кафе, барбершоп, салон…" />
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={business ? business.is_active : true} className="h-4 w-4 accent-[var(--color-brand)]" />
        Заведение активно (страница доступна по картам)
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Сохраняем…" : business ? "Сохранить" : "Создать заведение"}
      </button>
    </form>
  );
}
