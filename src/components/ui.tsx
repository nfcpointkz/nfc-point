import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className={cn("card rise p-5", tone === "brand" && "border-transparent bg-ink text-white")}>
      <div className={cn("text-xs font-semibold uppercase tracking-wide", tone === "brand" ? "text-white/60" : "text-muted")}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", tone === "brand" ? "text-white/60" : "text-muted")}>{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </div>
      <div className="text-base font-bold">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "off" | "brand"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "badge",
        tone === "ok" && "bg-ok/10 text-ok",
        tone === "off" && "bg-line text-muted",
        tone === "brand" && "bg-brand-soft text-brand",
      )}
    >
      {children}
    </span>
  );
}
