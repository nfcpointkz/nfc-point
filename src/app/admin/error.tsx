"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto mt-16 max-w-lg p-8 text-center">
      <h2 className="text-lg font-extrabold">Что-то пошло не так</h2>
      <p className="mt-2 break-words text-sm text-muted">{error.message}</p>
      <p className="mt-2 text-xs text-muted">
        Проверьте, что в .env.local заданы ключи Supabase и что SQL-миграция выполнена.
      </p>
      <button onClick={reset} className="btn-primary mt-5">Попробовать снова</button>
    </div>
  );
}
