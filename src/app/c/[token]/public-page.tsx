"use client";

import { useEffect, useRef } from "react";

// Названия зон на клиент не передаются вообще: посетитель получает только id, ссылку и координаты.
export type PublicZone = { id: string; url: string; x: number; y: number; w: number; h: number };

const VID_KEY = "nfcp_vid";
const VID_TTL = 90 * 24 * 3600 * 1000; // 90 дней

/** Случайный id браузера с ограниченным сроком хранения (не IP, не отпечаток). */
function visitorId(): string | null {
  try {
    const raw = localStorage.getItem(VID_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { id: string; exp: number };
      if (v.exp > Date.now() && typeof v.id === "string") return v.id;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(VID_KEY, JSON.stringify({ id, exp: Date.now() + VID_TTL }));
    return id;
  } catch {
    return null;
  }
}

function track(body: Record<string, unknown>) {
  const data = JSON.stringify(body);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([data], { type: "application/json" }));
      return;
    }
  } catch {
    /* fallthrough */
  }
  fetch("/api/track", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

export function PublicPage({
  token,
  imageUrl,
  width,
  height,
  zones,
}: {
  token: string;
  imageUrl: string;
  width: number;
  height: number;
  zones: PublicZone[];
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // защита от двойного вызова эффекта в dev
    sent.current = true;
    track({ type: "page_view", token, visitorId: visitorId() });
  }, [token]);

  return (
    <main className="min-h-dvh bg-[#0c0c0c]">
      {/* Контейнер строго повторяет пропорции изображения — зоны в % всегда совпадают с картинкой */}
      <div className="relative mx-auto w-full" style={{ maxWidth: 560, aspectRatio: `${width} / ${height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          width={width}
          height={height}
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="absolute inset-0 block h-full w-full select-none"
        />
        {zones.map((z) => (
          <a
            key={z.id}
            href={z.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track({ type: "button_click", token, buttonKey: z.id, visitorId: visitorId() })}
            style={{
              position: "absolute",
              left: `${z.x}%`,
              top: `${z.y}%`,
              width: `${z.w}%`,
              height: `${z.h}%`,
              display: "block",
              background: "transparent",
              border: 0,
              outline: "none",
              WebkitTapHighlightColor: "transparent",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </main>
  );
}
