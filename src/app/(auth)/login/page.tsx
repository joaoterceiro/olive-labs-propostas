"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const REMEMBER_KEY = "olive-remember-email";

/* ── Floating Input ── */
function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  delay = 0,
  error,
  name,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  delay?: number;
  error?: string;
  name?: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const actualType = type === "password" ? (visible ? "text" : "password") : type;
  const lifted = focused || value.length > 0;
  const inputId = name ?? label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${inputId}-error`;

  return (
    <div style={{ position: "relative", marginBottom: 20, animation: `olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          background: focused ? "rgba(163, 230, 53, 0.04)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${error ? "rgba(248,113,113,0.5)" : focused ? "rgba(163,230,53,0.5)" : "rgba(255,255,255,0.08)"}`,
          transition: "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
          boxShadow: focused ? "0 0 0 3px rgba(163,230,53,0.08), 0 0 20px rgba(163,230,53,0.06)" : "none",
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            position: "absolute",
            left: 14,
            top: lifted ? 8 : "50%",
            transform: lifted ? "none" : "translateY(-50%)",
            fontSize: lifted ? 10 : 13,
            color: lifted
              ? focused ? "#a3e635" : "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.35)",
            transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: "none",
            letterSpacing: lifted ? "0.08em" : "0",
            textTransform: lifted ? "uppercase" : "none",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {label}
        </label>
        <input
          id={inputId}
          name={name ?? inputId}
          type={actualType}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          required
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: lifted ? "24px 14px 8px" : "16px 14px",
            color: "#f0f0f0",
            fontSize: 14,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: type === "password" && !visible ? "0.15em" : "normal",
            boxSizing: "border-box",
            paddingRight: type === "password" ? 44 : 14,
            transition: "padding 0.2s ease",
          }}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: visible ? "#a3e635" : "rgba(255,255,255,0.25)",
              transition: "color 0.2s ease",
              display: "flex",
              alignItems: "center",
            }}
          >
            {visible ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          style={{ marginTop: 4, fontSize: 11, color: "#F87171", fontFamily: "'Montserrat', sans-serif" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Glow Button ── */
function GlowButton({ children, loading, type = "button" }: { children: React.ReactNode; loading?: boolean; type?: "button" | "submit" }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      disabled={loading}
      style={{
        width: "100%",
        padding: "15px",
        background: loading ? "rgba(163, 230, 53, 0.6)" : pressed ? "#8bc34a" : "#a3e635",
        border: "none",
        borderRadius: 10,
        color: "#0a0f0a",
        fontWeight: 700,
        fontSize: 14,
        fontFamily: "'Montserrat', sans-serif",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: loading ? "not-allowed" : "pointer",
        transform: pressed ? "scale(0.985)" : "scale(1)",
        transition: "all 0.15s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: pressed
          ? "0 0 0 0 rgba(163,230,53,0)"
          : "0 0 30px rgba(163, 230, 53, 0.25), 0 4px 16px rgba(163, 230, 53, 0.15)",
        position: "relative",
        overflow: "hidden",
        animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 500ms both",
      }}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="ol-spinner" />
          Entrando...
        </span>
      ) : (
        children
      )}
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

/* ── GitHub Button ── */
function GitHubButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: "13px",
        background: hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10,
        color: hovered ? "#e0e0e0" : "rgba(255,255,255,0.45)",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-1px)" : "none",
        animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 600ms both",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      Continuar com GitHub
    </button>
  );
}

/* ── Checkbox ── */
function OlCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
      onClick={onChange}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: `1px solid ${checked ? "#a3e635" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 4,
          background: checked ? "#a3e635" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0a0f0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", userSelect: "none" }}>
        {label}
      </span>
    </label>
  );
}

/* ── Login Form ── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Informe seu e-mail";
    if (!password) e.password = "Informe sua senha";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
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
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      router.push(callbackUrl);
    }
  }

  return (
    <>
      {/* Mobile-only brand */}
      <div className="mb-8 flex flex-col items-center gap-3 md:hidden" style={{ animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#a3e635",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#0a0f0a",
            boxShadow: "0 0 24px rgba(163,230,53,0.35)",
          }}
        >
          OL
        </div>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 20, color: "#f0f0f0" }}>
          Olive Labs
        </h1>
      </div>

      {/* Card header */}
      <div style={{ marginBottom: 28, animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
        <h2
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: "#f0f0f0",
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          Bem-vindo de volta
        </h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", fontFamily: "'Montserrat', sans-serif" }}>
          Insira suas credenciais para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FloatingInput
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
          }}
          delay={350}
          error={errors.email}
        />

        <FloatingInput
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          delay={400}
          error={errors.password}
        />

        {/* Remember + Forgot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 450ms both",
          }}
        >
          <OlCheckbox
            checked={remember}
            onChange={() => setRemember((r) => !r)}
            label="Lembrar de mim"
          />
          <Link
            href="/esqueci-senha"
            className="ol-forgot-btn"
            style={{
              fontSize: 12,
              color: "rgba(163,230,53,0.6)",
              fontFamily: "'Montserrat', sans-serif",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#a3e635")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(163,230,53,0.6)")}
          >
            Esqueceu a senha?
          </Link>
        </div>

        {/* Auth error */}
        {authError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              marginBottom: 20,
              borderRadius: 10,
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
              animation: "olSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span style={{ fontSize: 13, color: "#F87171", fontFamily: "'Montserrat', sans-serif" }}>{authError}</span>
          </div>
        )}

        <GlowButton loading={loading} type="submit">
          Entrar
        </GlowButton>
      </form>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "20px 0",
          animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 480ms both",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.1em" }}>
          OU
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
      </div>

      {/* GitHub */}
      <GitHubButton />

      {/* Footer */}
      <p
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 11,
          color: "rgba(255,255,255,0.18)",
          animation: "olSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 700ms both",
        }}
      >
        &copy; {new Date().getFullYear()} Olive Labs &middot; Todos os direitos reservados
      </p>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes olSpin {
          to { transform: rotate(360deg); }
        }
        .ol-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #0a0f0a;
          border-radius: 50%;
          animation: olSpin 0.7s linear infinite;
          display: inline-block;
        }
      `}} />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid rgba(163,230,53,0.3)",
              borderTopColor: "#a3e635",
              borderRadius: "50%",
              animation: "olSpin 0.7s linear infinite",
            }}
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
