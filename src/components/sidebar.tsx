"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, LayoutDashboard, LogOut, PenTool, Settings, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Заведения", icon: Store },
  { href: "/admin/cards", label: "NFC-карты", icon: CreditCard },
  { href: "/admin/editor", label: "Редактор", icon: PenTool },
  { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  return (
    <>
      {/* Десктоп */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-3 px-2 pt-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12a7 7 0 0 1 7-7M5 12a7 7 0 0 0 7 7M9 12a3 3 0 0 1 3-3M9 12a3 3 0 0 0 3 3" />
              <circle cx="15.5" cy="12" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <span className="text-lg font-extrabold tracking-tight">NFC POINT</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active ? "bg-ink text-white" : "text-muted hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-line p-3">
          <div className="truncate text-xs text-muted">{email}</div>
          <form action={signOut}>
            <button className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink hover:text-bad">
              <LogOut size={16} /> Выйти
            </button>
          </form>
        </div>
      </aside>

      {/* Мобильная нижняя навигация */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-surface/95 px-1 py-1.5 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold",
                active ? "text-brand" : "text-muted",
              )}
            >
              <Icon size={20} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
