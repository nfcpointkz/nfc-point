import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { siteUrl } from "@/lib/utils";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const has = (v?: string) => (v ? "настроено" : "не задано");
  const rows: [string, string][] = [
    ["Аккаунт администратора", admin.email],
    ["Supabase Project URL", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "не задано"],
    ["Publishable key", has(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)],
    ["Secret key (только сервер)", has(process.env.SUPABASE_SECRET_KEY)],
    ["Адрес сайта", siteUrl()],
  ];
  return (
    <>
      <PageHeader title="Настройки" subtitle="Состояние подключения. Ключи здесь не показываются — они хранятся в переменных окружения." />
      <div className="card max-w-2xl divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
            <span className="font-semibold">{k}</span>
            <span className="break-all text-muted">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Чтобы сменить пароль администратора, откройте Supabase → Authentication → Users → ваш пользователь → «Send password recovery».
        Публичной регистрации нет: войти могут только аккаунты из таблицы admin_users.
      </p>
    </>
  );
}
