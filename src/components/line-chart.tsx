import type { DayPoint } from "@/lib/queries";

// Лёгкий SVG-график без внешних библиотек: просмотры (линия) и клики (линия).
export function VisitsChart({ data }: { data: DayPoint[] }) {
  const W = 760;
  const H = 240;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (data.length === 0) {
    return <div className="grid h-60 place-items-center text-sm text-muted">Пока нет данных за выбранный период</div>;
  }

  const max = Math.max(1, ...data.map((d) => Math.max(d.views, d.clicks)));
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / niceMax) * ih;
  const path = (key: "views" | "clicks") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${path("views")} L${x(data.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-brand" /> Просмотры</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ok" /> Клики</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="График посещений">
        <defs>
          <linearGradient id="vfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3a4bff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3a4bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e7e5de" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b6a63">{t}</text>
          </g>
        ))}
        <path d={area} fill="url(#vfill)" />
        <path d={path("views")} fill="none" stroke="#3a4bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("clicks")} fill="none" stroke="#14a06b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={x(i)} cy={y(d.views)} r="6" fill="transparent">
              <title>{`${d.day}: ${d.views} просм., ${d.clicks} кликов`}</title>
            </circle>
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b6a63">
                {d.day.slice(8, 10)}.{d.day.slice(5, 7)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
