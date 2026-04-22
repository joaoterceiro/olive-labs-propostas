"use client";

import { useRef } from "react";

const GRID_SIZE = 40;
const PARTICLE_COUNT = 18;

function Particles() {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.3 + 0.05,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.current.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "#a3e635",
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function GridBackground() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(163, 230, 53, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(163, 230, 53, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        maskImage: "radial-gradient(ellipse 70% 70% at 60% 50%, black 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 60% 50%, black 30%, transparent 100%)",
      }}
    />
  );
}

function FeatureChips() {
  const features = ["IA integrada", "Templates prontos", "Colaboração em tempo real"];
  return (
    <div className="flex flex-wrap gap-2" style={{ animation: "olSlideUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.8s both" }}>
      {features.map((f) => (
        <span
          key={f}
          className="rounded-full text-[11px]"
          style={{
            padding: "6px 12px",
            background: "rgba(163,230,53,0.07)",
            border: "1px solid rgba(163,230,53,0.15)",
            color: "rgba(163,230,53,0.7)",
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ol-login-root">
      <GridBackground />
      <Particles />

      {/* Radial glow center-right */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          right: "25%",
          top: "30%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 70%)",
        }}
      />

      {/* LEFT PANEL */}
      <div className="ol-left">
        {/* Logo */}
        <div
          className="flex items-center gap-[10px]"
          style={{ animation: "olLogoReveal 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "#a3e635",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: "#0a0f0a",
              letterSpacing: "-0.02em",
              boxShadow: "0 0 16px rgba(163,230,53,0.35)",
            }}
          >
            OL
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.8)",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.02em",
            }}
          >
            Olive Labs
          </span>
        </div>

        {/* Headline */}
        <div style={{ animation: "olSlideUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}>
          <p className="ol-headline">Crie propostas</p>
          <p className="ol-headline" style={{ minHeight: "1.08em" }}>
            <span className="ol-shimmer-text">que impressionam.</span>
          </p>
          <p
            className="mt-5 max-w-[340px]"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.7,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
            }}
          >
            Editor visual inteligente para documentos profissionais.
          </p>
        </div>

        {/* Feature chips */}
        <FeatureChips />
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="ol-right">
        <div className="ol-card">
          <div className="ol-scan-line" />
          {children}
        </div>
      </div>

      {/* Inline styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        
        @keyframes olSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes olFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes particleFloat {
          from { transform: translate(0, 0); }
          to   { transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px); }
        }
        @keyframes olPulseGlow {
          0%, 100% { box-shadow: 0 0 60px rgba(163,230,53,0.08); }
          50%       { box-shadow: 0 0 100px rgba(163,230,53,0.16); }
        }
        @keyframes olScanLine {
          from { transform: translateY(-100%); }
          to   { transform: translateY(800px); }
        }
        @keyframes olLogoReveal {
          from { opacity: 0; transform: scale(0.85) rotate(-4deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes olShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .ol-login-root {
          min-height: 100vh;
          background: #050a05;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          font-family: 'Montserrat', sans-serif;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .ol-login-root { grid-template-columns: 1fr; }
          .ol-left { display: none !important; }
        }

        .ol-left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 40px;
          position: relative;
          z-index: 1;
        }

        .ol-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          z-index: 1;
        }

        .ol-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255,255,255,0.025);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 36px;
          animation: olPulseGlow 4s ease-in-out infinite, olFadeIn 0.6s ease 0.3s both;
          position: relative;
          overflow: hidden;
        }

        .ol-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(163,230,53,0.4), transparent);
        }

        .ol-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 60px;
          background: linear-gradient(to bottom, transparent, rgba(163,230,53,0.015), transparent);
          animation: olScanLine 6s linear 1s infinite;
          pointer-events: none;
        }

        .ol-headline {
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: clamp(36px, 4vw, 52px);
          color: #f0f0f0;
          line-height: 1.08;
          letter-spacing: -0.03em;
        }

        .ol-shimmer-text {
          background: linear-gradient(135deg, #a3e635 0%, #d9f99d 50%, #a3e635 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: olShimmer 3s linear 2s infinite;
        }
      `}} />
    </div>
  );
}
