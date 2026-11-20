import type { PageButton } from "@/lib/types";

export type ButtonPreset = {
  type: string;
  label: string;
  placeholder: string;
  bg: string;
  text: string;
};

// Библиотека кнопок. Иконки подбираются в компоненте ButtonIcon по полю type.
export const BUTTON_LIBRARY: ButtonPreset[] = [
  { type: "instagram", label: "Instagram", placeholder: "https://instagram.com/ваш_аккаунт", bg: "#E1306C", text: "#ffffff" },
  { type: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/77001234567", bg: "#25D366", text: "#ffffff" },
  { type: "telegram", label: "Telegram", placeholder: "https://t.me/ваш_аккаунт", bg: "#229ED9", text: "#ffffff" },
  { type: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@ваш_аккаунт", bg: "#111111", text: "#ffffff" },
  { type: "facebook", label: "Facebook", placeholder: "https://facebook.com/ваша_страница", bg: "#1877F2", text: "#ffffff" },
  { type: "youtube", label: "YouTube", placeholder: "https://youtube.com/@ваш_канал", bg: "#FF0000", text: "#ffffff" },
  { type: "vk", label: "VK", placeholder: "https://vk.com/ваша_страница", bg: "#0077FF", text: "#ffffff" },
  { type: "2gis", label: "2GIS", placeholder: "https://2gis.kz/...", bg: "#2DBE4E", text: "#ffffff" },
  { type: "gmaps", label: "Google Maps", placeholder: "https://maps.google.com/?q=...", bg: "#34A853", text: "#ffffff" },
  { type: "greviews", label: "Google Reviews", placeholder: "https://g.page/r/.../review", bg: "#FBBC05", text: "#111111" },
  { type: "review", label: "Оставить отзыв", placeholder: "https://...", bg: "#F59E0B", text: "#111111" },
  { type: "website", label: "Сайт", placeholder: "https://ваш-сайт.kz", bg: "#111111", text: "#ffffff" },
  { type: "menu", label: "Меню", placeholder: "https://ссылка-на-меню", bg: "#7C3AED", text: "#ffffff" },
  { type: "call", label: "Позвонить", placeholder: "tel:+77001234567", bg: "#0EA5E9", text: "#ffffff" },
  { type: "message", label: "Написать", placeholder: "https://wa.me/77001234567", bg: "#14B8A6", text: "#ffffff" },
  { type: "custom", label: "Кнопка", placeholder: "https://...", bg: "#111111", text: "#ffffff" },
];

export function presetFor(type: string): ButtonPreset {
  return BUTTON_LIBRARY.find((b) => b.type === type) ?? BUTTON_LIBRARY[BUTTON_LIBRARY.length - 1];
}

export function newButton(type: string, order: number): PageButton {
  const p = presetFor(type);
  return {
    button_key: crypto.randomUUID(),
    type,
    label: p.label,
    url: "",
    x: 10,
    y: 10 + (order % 8) * 8,
    w: 38,
    h: 6.5,
    bg_color: p.bg,
    text_color: p.text,
    style: "solid",
    radius: 16,
    show_icon: true,
    show_label: true,
    sort_order: order,
    is_enabled: true,
  };
}

/** Разрешаем только безопасные схемы ссылок. */
export function safeUrl(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (/^(https?:\/\/|tel:|mailto:)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // javascript:, data: и т.п.
  return `https://${v}`;
}
