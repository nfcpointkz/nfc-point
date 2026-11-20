"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createCard } from "../actions";

export function NewCardForm({
  businesses,
  defaultBusiness,
}: {
  businesses: { id: string; name: string }[];
  defaultBusiness?: string;
}) {
  const [businessId, setBusinessId] = useState(defaultBusiness ?? businesses[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="card mb-6 flex flex-wrap items-end gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createCard(businessId, label);
          if (res.ok) {
            toast.success(res.message ?? "Карта создана");
            setLabel("");
            router.refresh();
          } else toast.error(res.error ?? "Ошибка");
        });
      }}
    >
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="b">Заведение</label>
        <select id="b" value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="input">
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="l">Метка (необязательно)</label>
        <input id="l" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className="input" placeholder="Стойка у кассы" />
      </div>
      <button className="btn-primary" disabled={pending || !businessId}>
        <Plus size={16} /> {pending ? "Создаём…" : "Создать карту"}
      </button>
    </form>
  );
}
