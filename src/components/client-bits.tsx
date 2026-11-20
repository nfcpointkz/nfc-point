"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ActionResult } from "@/app/admin/actions";

export function ActionButton({
  action,
  confirmText,
  className = "btn-ghost",
  children,
  redirectTo,
}: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  className?: string;
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res.ok) {
            toast.success(res.message ?? "Готово");
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          } else toast.error(res.error ?? "Ошибка");
        });
      }}
    >
      {children}
    </button>
  );
}

export function CopyButton({ text, label = "Копировать ссылку" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost !px-3 !py-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Ссылка скопирована");
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("Не удалось скопировать");
        }
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
      {label}
    </button>
  );
}
