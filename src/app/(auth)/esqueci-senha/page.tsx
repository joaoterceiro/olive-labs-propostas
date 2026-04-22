"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao solicitar redefinicao");
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ol-card">
      <div className="ol-scan-line" />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#f0f0f0" }}>
        Redefinir senha
      </h1>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>

      {sent ? (
        <div style={{ fontSize: 14, color: "#a3e635" }}>
          Se o e-mail existir, você receberá um link em instantes. Verifique sua caixa de entrada.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Enviar link
          </Button>
        </form>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/login" style={{ fontSize: 13, color: "#a3e635" }}>
          ← Voltar ao login
        </Link>
      </div>
    </div>
  );
}
