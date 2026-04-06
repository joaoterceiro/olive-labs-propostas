"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";

const REMEMBER_KEY = "olive-remember-email";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Informe seu e-mail";
    if (!password) e.password = "Informe sua senha";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    if (!validate()) return;

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);

    if (result?.error) {
      setAuthError("Email ou senha incorretos.");
    } else if (result?.ok) {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      router.push(callbackUrl);
    }
  }

  return (
    <div className="animate-fade-up">
      {/* Mobile-only brand (hidden on lg) */}
      <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#94C020] to-[#7DA61A] shadow-[0_0_30px_rgba(148,192,32,0.3)]">
          <span className="text-sm font-extrabold text-white">OL</span>
        </div>
        <h1 className="text-xl font-bold text-[#E2E3E4]">Olive Labs</h1>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0C0C0F]/80 p-8 shadow-[0_8px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        {/* Header */}
        <div className="mb-7">
          <h2 className="text-[17px] font-bold text-[#E2E3E4]">
            Bem-vindo de volta
          </h2>
          <p className="mt-1 text-[13px] text-[#6B6F76]">
            Insira suas credenciais para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            error={errors.email}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
          />

          <div className="flex items-center justify-between">
            <Checkbox
              label="Lembrar de mim"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <button
              type="button"
              className="text-[12px] text-[#6B6F76] transition-colors hover:text-[#94C020]"
            >
              Esqueceu a senha?
            </button>
          </div>

          {authError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-[#F87171]/20 bg-[#F87171]/[0.06] px-4 py-3">
              <Icon name="alert" size={16} className="shrink-0 text-[#F87171]" />
              <span className="text-[13px] text-[#F87171]">{authError}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full h-11 text-[14px] font-semibold shadow-[0_0_20px_rgba(148,192,32,0.2)]">
            Entrar
          </Button>
        </form>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <span className="text-[10px] text-[#3A3A3E] uppercase tracking-wider">ou</span>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>

        {/* SSO placeholder */}
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2.5 text-[13px] text-[#6B6F76] transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-[#ACACB0]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          Continuar com GitHub
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-[10px] text-[#2A2A2E]">
        © {new Date().getFullYear()} Olive Labs · Todos os direitos reservados
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#94C020] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
