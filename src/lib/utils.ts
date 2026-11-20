export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Случайный токен для ссылки карты (10 символов, криптостойкий). */
export function generateToken(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nfc-point-gamma.vercel.app").replace(/\/$/, "");
}

/** Разрешаем только безопасные схемы ссылок (https, http, tel, mailto). Иначе null. */
export function safeUrl(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (/^(https?:\/\/|tel:|mailto:)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // javascript:, data: и т.п.
  return `https://${v}`;
}
