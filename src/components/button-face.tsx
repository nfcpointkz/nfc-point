import {
  Camera, Facebook, Globe, Link2, Map as MapIcon, MapPin, MessageCircle, MessageSquare, Music2, Phone, Send, Star,
  ThumbsUp, UtensilsCrossed, Users, Youtube, type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { PageButton } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  instagram: Camera,
  whatsapp: MessageCircle,
  telegram: Send,
  tiktok: Music2,
  facebook: Facebook,
  youtube: Youtube,
  vk: Users,
  "2gis": MapPin,
  gmaps: MapIcon,
  greviews: Star,
  review: ThumbsUp,
  website: Globe,
  menu: UtensilsCrossed,
  call: Phone,
  message: MessageSquare,
  custom: Link2,
};

export function iconFor(type: string): LucideIcon {
  return ICONS[type] ?? Link2;
}

/** Размеры считаются в cqw (процент ширины контейнера-изображения), чтобы кнопка масштабировалась вместе с картинкой. */
export function faceStyle(b: PageButton, imgW: number, imgH: number): CSSProperties {
  const heightCqw = b.h * (imgH / imgW); // высота кнопки в cqw
  const base: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: `${heightCqw * 0.22}cqw`,
    fontSize: `${Math.max(1.6, heightCqw * 0.4)}cqw`,
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: `${(b.radius / 100) * heightCqw * 2}cqw`,
    overflow: "hidden",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    padding: `0 ${heightCqw * 0.3}cqw`,
    transition: "transform .15s ease, filter .15s ease",
  };
  switch (b.style) {
    case "outline":
      return { ...base, background: "transparent", color: b.bg_color, border: `${Math.max(0.3, heightCqw * 0.05)}cqw solid ${b.bg_color}` };
    case "ghost":
      return { ...base, background: `color-mix(in srgb, ${b.bg_color} 18%, transparent)`, color: b.bg_color };
    case "glass":
      return {
        ...base,
        background: "rgba(255,255,255,0.22)",
        color: b.text_color,
        border: "1px solid rgba(255,255,255,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      };
    default:
      return { ...base, background: b.bg_color, color: b.text_color, boxShadow: "0 0.4cqw 1.2cqw rgba(0,0,0,0.18)" };
  }
}

export function ButtonFace({ b, imgW, imgH }: { b: PageButton; imgW: number; imgH: number }) {
  const Icon = iconFor(b.type);
  const heightCqw = b.h * (imgH / imgW);
  const iconSize = `${Math.max(2, heightCqw * 0.46)}cqw`;
  return (
    <span style={faceStyle(b, imgW, imgH)}>
      {b.show_icon && <Icon style={{ width: iconSize, height: iconSize, flex: "none" }} strokeWidth={2.2} />}
      {b.show_label && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</span>}
    </span>
  );
}
