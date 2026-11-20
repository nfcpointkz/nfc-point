"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Почта</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
