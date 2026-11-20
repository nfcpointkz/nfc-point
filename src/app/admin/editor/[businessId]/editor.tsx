"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, ImagePlus, MousePointerSquareDashed, Pencil, Plus, Rocket, Save, Trash2, X } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn, formatDate } from "@/lib/utils";
import type { Hotspot } from "@/lib/types";
import { createUploadTarget, publishPage, removeDraftImage, saveDraft, setDraftImage } from "./actions";

type Img = { url: string; w: number; h: number };
type Drag =
  | { mode: "move" | "resize"; key: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number }
  | { mode: "draw"; sx: number; sy: number } // стартовая точка в % изображения
  | null;

const MIN = 1; // минимальный размер зоны, %
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function Editor({
  businessId,
  initialImage,
  initialZones,
  publishedAt: initialPublishedAt,
}: {
  businessId: string;
  initialImage: Img | null;
  initialZones: Hotspot[];
  publishedAt: string | null;
}) {
  const [image, setImage] = useState<Img | null>(initialImage);
  const [zones, setZones] = useState<Hotspot[]>(initialZones);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false); // режим «рисуем новую зону»
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sel = zones.find((z) => z.hotspot_key === selected) ?? null;

  const change = useCallback((fn: (prev: Hotspot[]) => Hotspot[]) => {
    setZones(fn);
    setDirty(true);
  }, []);
  const patch = useCallback(
    (key: string, p: Partial<Hotspot>) => change((prev) => prev.map((z) => (z.hotspot_key === key ? { ...z, ...p } : z))),
    [change],
  );

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Esc отменяет рисование; стрелки двигают зону; Delete удаляет
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "Escape") {
        setDrawing(false);
        setDraft(null);
        dragRef.current = null;
        return;
      }
      if (!selected || preview) return;
      const z = zones.find((x) => x.hotspot_key === selected);
      if (!z) return;
      const step = e.shiftKey ? 2 : 0.5;
      if (e.key === "ArrowLeft") patch(selected, { x: clamp(round1(z.x - step), 0, 100 - z.w) });
      else if (e.key === "ArrowRight") patch(selected, { x: clamp(round1(z.x + step), 0, 100 - z.w) });
      else if (e.key === "ArrowUp") patch(selected, { y: clamp(round1(z.y - step), 0, 100 - z.h) });
      else if (e.key === "ArrowDown") patch(selected, { y: clamp(round1(z.y + step), 0, 100 - z.h) });
      else if (e.key === "Delete") {
        change((prev) => prev.filter((x) => x.hotspot_key !== selected));
        setSelected(null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, preview, zones, patch, change]);

  /** Координаты указателя в процентах изображения (всегда относительно реального размера холста). */
  function pct(e: { clientX: number; clientY: number }) {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100, 0, 100),
    };
  }

  // ---------- Указатель ----------
  function onCanvasDown(e: React.PointerEvent) {
    if (preview) return;
    if (drawing) {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      const p = pct(e);
      dragRef.current = { mode: "draw", sx: p.x, sy: p.y };
      setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
    } else {
      setSelected(null);
    }
  }
  function startZoneDrag(e: React.PointerEvent, z: Hotspot, mode: "move" | "resize") {
    if (preview || drawing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(z.hotspot_key);
    dragRef.current = { mode, key: z.hotspot_key, sx: e.clientX, sy: e.clientY, ox: z.x, oy: z.y, ow: z.w, oh: z.h };
  }
  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    if (d.mode === "draw") {
      const p = pct(e);
      setDraft({ x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
      return;
    }
    const dx = ((e.clientX - d.sx) / rect.width) * 100;
    const dy = ((e.clientY - d.sy) / rect.height) * 100;
    if (d.mode === "move") {
      patch(d.key, { x: round1(clamp(d.ox + dx, 0, 100 - d.ow)), y: round1(clamp(d.oy + dy, 0, 100 - d.oh)) });
    } else {
      patch(d.key, { w: round1(clamp(d.ow + dx, MIN, 100 - d.ox)), h: round1(clamp(d.oh + dy, MIN, 100 - d.oy)) });
    }
  }
  function onUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.mode === "draw" && draft) {
      setDraft(null);
      if (draft.w < MIN || draft.h < MIN) {
        toast.message("Зона слишком маленькая — растяните область побольше");
        return;
      }
      const z: Hotspot = {
        hotspot_key: crypto.randomUUID(),
        name: `Зона ${zones.length + 1}`,
        url: "",
        x: round1(draft.x),
        y: round1(draft.y),
        w: round1(Math.min(draft.w, 100 - draft.x)),
        h: round1(Math.min(draft.h, 100 - draft.y)),
        sort_order: zones.length,
      };
      change((prev) => [...prev, z]);
      setSelected(z.hotspot_key);
      setDrawing(false);
    }
  }

  function removeZone(key: string) {
    change((prev) => prev.filter((z) => z.hotspot_key !== key));
    if (selected === key) setSelected(null);
  }

  // ---------- Изображение ----------
  async function onFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !["png", "jpg", "jpeg", "webp"].includes(ext)) {
      toast.error("Допустимы только PNG, JPG и WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл больше 10 МБ. Сожмите изображение.");
      return;
    }
    if (image && zones.length > 0 && !window.confirm("Зоны сохранятся в процентах и могут не совпасть с новым изображением. Заменить?")) return;
    setUploading(true);
    try {
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
        img.src = url;
      });
      const target = await createUploadTarget(businessId, ext);
      if (!target.ok || !target.path || !target.token) throw new Error(target.error ?? "Ошибка подготовки загрузки");
      const up = await createBrowserSupabase()
        .storage.from("page-images")
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
      if (up.error) throw new Error(up.error.message);
      const saved = await setDraftImage(businessId, target.path, dims.w, dims.h);
      if (!saved.ok || !saved.imageUrl) throw new Error(saved.error ?? "Не удалось сохранить изображение");
      setImage({ url: saved.imageUrl, w: dims.w, h: dims.h });
      toast.success("Изображение загружено");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onRemoveImage() {
    if (!window.confirm("Убрать изображение из черновика? Опубликованная страница не изменится.")) return;
    start(async () => {
      const r = await removeDraftImage(businessId);
      if (r.ok) {
        setImage(null);
        setDrawing(false);
        toast.success(r.message ?? "Готово");
      } else toast.error(r.error ?? "Ошибка");
    });
  }

  // ---------- Сохранение ----------
  function onSave() {
    start(async () => {
      const r = await saveDraft(businessId, zones);
      if (r.ok) {
        setDirty(false);
        toast.success(r.message ?? "Сохранено");
      } else toast.error(r.error ?? "Ошибка");
    });
  }
  function onPublish() {
    const missing = zones.filter((z) => !z.url.trim());
    if (missing.length && !window.confirm(`У ${missing.length} зон нет ссылки — они не будут работать. Опубликовать всё равно?`)) return;
    start(async () => {
      const r = await publishPage(businessId, zones);
      if (r.ok) {
        setDirty(false);
        setPublishedAt(new Date().toISOString());
        toast.success(r.message ?? "Опубликовано");
      } else toast.error(r.error ?? "Ошибка");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ---------- Холст ---------- */}
      <div>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
          <button
            className={drawing ? "btn bg-brand text-white !py-2" : "btn-ghost !py-2"}
            onClick={() => {
              setPreview(false);
              setDrawing((v) => !v);
            }}
            disabled={!image}
          >
            {drawing ? <X size={16} /> : <Plus size={16} />} {drawing ? "Отменить рисование" : "Добавить зону"}
          </button>
          <button className="btn-ghost !py-2" onClick={() => { setDrawing(false); setPreview((v) => !v); }} disabled={!image}>
            {preview ? <Pencil size={16} /> : <Eye size={16} />} {preview ? "Редактировать" : "Предпросмотр"}
          </button>
          <button className="btn-ghost !py-2" onClick={onSave} disabled={pending || !dirty}>
            <Save size={16} /> Сохранить черновик
          </button>
          <button className="btn-brand !py-2" onClick={onPublish} disabled={pending || !image}>
            <Rocket size={16} /> {publishedAt ? "Опубликовать снова" : "Опубликовать"}
          </button>
          <span className="ml-auto text-xs text-muted">
            {dirty ? "Есть несохранённые изменения" : "Черновик сохранён"}
            {publishedAt && ` · опубликовано ${formatDate(publishedAt)}`}
          </span>
        </div>

        {drawing && (
          <p className="mb-3 rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand">
            Зажмите кнопку мыши (или палец) и обведите область на изображении. Esc — отмена.
          </p>
        )}

        <div className="mx-auto w-full max-w-[560px]">
          {!image ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="card grid aspect-[9/16] w-full place-items-center border-2 border-dashed text-center transition hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="px-8">
                <ImagePlus className="mx-auto mb-3 text-brand" size={36} />
                <span className="block font-bold">{uploading ? "Загружаем…" : "Загрузить изображение"}</span>
                <span className="mt-1 block text-sm text-muted">PNG, JPG или WebP до 10 МБ</span>
              </span>
            </button>
          ) : (
            <div
              ref={canvasRef}
              className="relative select-none overflow-hidden rounded-2xl shadow-xl ring-1 ring-line"
              style={{
                aspectRatio: `${image.w} / ${image.h}`,
                cursor: drawing ? "crosshair" : "default",
                touchAction: drawing ? "none" : "pan-y",
              }}
              onPointerDown={onCanvasDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" width={image.w} height={image.h} draggable={false} className="pointer-events-none block h-full w-full" />

              {!preview &&
                zones.map((z) => {
                  const isSel = z.hotspot_key === selected;
                  return (
                    <div
                      key={z.hotspot_key}
                      onPointerDown={(e) => startZoneDrag(e, z, "move")}
                      style={{
                        position: "absolute",
                        left: `${z.x}%`,
                        top: `${z.y}%`,
                        width: `${z.w}%`,
                        height: `${z.h}%`,
                        cursor: drawing ? "crosshair" : "move",
                        touchAction: drawing ? "none" : "none",
                        pointerEvents: drawing ? "none" : "auto",
                        background: isSel ? "rgba(58,75,255,0.28)" : "rgba(58,75,255,0.14)",
                        border: `2px solid ${isSel ? "#3a4bff" : "rgba(58,75,255,0.6)"}`,
                        borderRadius: 4,
                        boxSizing: "border-box",
                      }}
                    >
                      <span className="pointer-events-none absolute left-0 top-0 max-w-full -translate-y-full truncate rounded-t bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {z.name || "Без названия"}
                      </span>
                      {isSel && (
                        <span
                          onPointerDown={(e) => startZoneDrag(e, z, "resize")}
                          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-brand shadow"
                          style={{ touchAction: "none" }}
                        />
                      )}
                    </div>
                  );
                })}

              {draft && (
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-brand bg-brand/20"
                  style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.w}%`, height: `${draft.h}%` }}
                />
              )}
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <p className="mx-auto mt-3 max-w-[560px] text-center text-xs text-muted">
          {preview
            ? "Предпросмотр: так видит страницу посетитель — рамки и названия скрыты."
            : "Тяните зону, чтобы переместить; синюю точку в углу — чтобы изменить размер. Стрелки двигают выбранную зону. Рамки и названия видны только вам."}
        </p>
      </div>

      {/* ---------- Панель ---------- */}
      <div className="space-y-4">
        <section className="card p-4">
          <div className="label">Изображение</div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 !py-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImagePlus size={16} /> {uploading ? "Загрузка…" : image ? "Заменить" : "Загрузить"}
            </button>
            {image && (
              <button className="btn-danger !py-2" onClick={onRemoveImage} disabled={pending} title="Удалить изображение">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {image && <p className="mt-2 text-xs text-muted">{image.w} × {image.h} px · пропорции сохраняются</p>}
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="label !mb-0">Зоны ({zones.length})</div>
            <button className="btn-brand !px-3 !py-1.5 !text-xs" onClick={() => { setPreview(false); setDrawing(true); }} disabled={!image}>
              <Plus size={14} /> Добавить зону
            </button>
          </div>
          {zones.length === 0 ? (
            <p className="py-3 text-sm text-muted">
              Зон пока нет. Нажмите «Добавить зону» и обведите на изображении область, которая должна открывать ссылку.
            </p>
          ) : (
            <ul className="space-y-1">
              {zones.map((z) => (
                <li
                  key={z.hotspot_key}
                  className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm", z.hotspot_key === selected ? "bg-brand-soft" : "hover:bg-canvas")}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => { setSelected(z.hotspot_key); setPreview(false); setDrawing(false); }}
                  >
                    <MousePointerSquareDashed size={15} className="shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{z.name || "Без названия"}</span>
                      <span className={cn("block truncate text-xs", z.url ? "text-muted" : "text-warn")}>{z.url || "нет ссылки"}</span>
                    </span>
                  </button>
                  <button
                    title="Удалить зону"
                    className="p-1 text-muted hover:text-bad"
                    onClick={() => window.confirm(`Удалить зону «${z.name || "Без названия"}»?`) && removeZone(z.hotspot_key)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sel && (
          <section className="card space-y-4 p-4">
            <div className="label !mb-0">Свойства зоны</div>
            <div>
              <label className="label" htmlFor="zname">Название (видно только вам)</label>
              <input id="zname" className="input" maxLength={80} value={sel.name} placeholder="Instagram, Меню, 2ГИС…" onChange={(e) => patch(sel.hotspot_key, { name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="zurl">Ссылка</label>
              <input id="zurl" className="input" maxLength={1000} value={sel.url} placeholder="https://instagram.com/ваш_аккаунт" onChange={(e) => patch(sel.hotspot_key, { url: e.target.value })} />
              <p className="mt-1 text-xs text-muted">https://…, tel:+7… или mailto:…</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <div key={k}>
                  <label className="label">{k === "x" ? "X %" : k === "y" ? "Y %" : k === "w" ? "Шир." : "Выс."}</label>
                  <input
                    type="number"
                    step={0.5}
                    className="input !px-2"
                    value={sel[k]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      const p: Partial<Hotspot> =
                        k === "x" ? { x: clamp(v, 0, 100 - sel.w) } :
                        k === "y" ? { y: clamp(v, 0, 100 - sel.h) } :
                        k === "w" ? { w: clamp(v, MIN, 100 - sel.x) } :
                        { h: clamp(v, MIN, 100 - sel.y) };
                      patch(sel.hotspot_key, p);
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-danger w-full"
              onClick={() => window.confirm(`Удалить зону «${sel.name || "Без названия"}»?`) && removeZone(sel.hotspot_key)}
            >
              <Trash2 size={16} /> Удалить зону
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
