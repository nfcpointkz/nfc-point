export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "90d" | "all" | "custom";

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Сегодня",
  yesterday: "Вчера",
  "7d": "7 дней",
  "30d": "30 дней",
  "90d": "90 дней",
  all: "Всё время",
  custom: "Период",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resolveRange(key: string | undefined, from?: string, to?: string) {
  const now = new Date();
  const today = startOfDay(now);
  const k = (key as RangeKey) in RANGE_LABELS ? (key as RangeKey) : "30d";
  const day = 86400000;
  switch (k) {
    case "today":
      return { key: k, from: today, to: null as Date | null };
    case "yesterday":
      return { key: k, from: new Date(today.getTime() - day), to: today };
    case "7d":
      return { key: k, from: new Date(today.getTime() - 6 * day), to: null };
    case "30d":
      return { key: k, from: new Date(today.getTime() - 29 * day), to: null };
    case "90d":
      return { key: k, from: new Date(today.getTime() - 89 * day), to: null };
    case "all":
      return { key: k, from: null as Date | null, to: null };
    case "custom": {
      const f = from ? new Date(from) : null;
      const t = to ? new Date(new Date(to).getTime() + day) : null;
      return { key: k, from: f && !isNaN(+f) ? f : null, to: t && !isNaN(+t) ? t : null };
    }
  }
}
