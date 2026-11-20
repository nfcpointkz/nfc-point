import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
      <div className="rise card relative w-full max-w-sm p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12a7 7 0 0 1 7-7M5 12a7 7 0 0 0 7 7M9 12a3 3 0 0 1 3-3M9 12a3 3 0 0 0 3 3" />
              <circle cx="15.5" cy="12" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-extrabold leading-none tracking-tight">NFC POINT</div>
            <div className="mt-1 text-xs text-muted">Панель управления</div>
          </div>
        </div>
        {error === "denied" && (
          <p className="mb-4 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Нет доступа к панели.</p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
