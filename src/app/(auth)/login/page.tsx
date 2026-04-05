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
  const callbackUrl = searchParams.get("callbackUrl") || "/propostas";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
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
      {/* Card */}
      <div className="rounded-lg glass-strong px-8 py-10">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#94C020] text-sm font-bold text-white shadow-[0_0_20px_rgba(148,192,32,0.2)]">
            OL
          </div>
          <div className="text-xl font-bold text-[#E2E3E4]">
            Olive Labs
          </div>
          <p className="text-sm text-[#6B6F76]">Faca login na sua conta</p>
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
              if (errors.password)
                setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
          />

          <Checkbox
            label="Lembrar de mim"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />

          {authError && (
            <div className="flex items-center gap-2 rounded-md border border-[#F87171]/20 bg-[#F87171]/10 px-4 py-2.5">
              <Icon
                name="alert"
                size={16}
                className="shrink-0 text-[#F87171]"
              />
              <span className="text-sm text-[#F87171]">{authError}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-[#4A4B50]">Olive Labs</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse text-center text-[#6B6F76]">
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
