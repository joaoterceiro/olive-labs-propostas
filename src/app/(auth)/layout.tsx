export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full overflow-hidden bg-[#040406]">
      {/* ── Animated background ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Nebula orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        {/* Grid with mask */}
        <div className="absolute inset-0" style={{ mask: 'radial-gradient(ellipse 60% 50% at 35% 50%, black, transparent)', WebkitMask: 'radial-gradient(ellipse 60% 50% at 35% 50%, black, transparent)' }}>
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(148,192,32,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,192,32,0.2) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        </div>

        {/* Horizon glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#94C020]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-t from-[#94C020]/[0.015] to-transparent" />
      </div>

      {/* ── Left panel: Branding + Design Animation ── */}
      <div className="relative hidden w-[560px] shrink-0 lg:flex lg:flex-col lg:justify-between p-14">
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-14 flex items-center gap-3 auth-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="auth-logo flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#94C020] to-[#7DA61A]">
              <span className="text-[13px] font-extrabold text-white drop-shadow-sm">OL</span>
            </div>
            <span className="text-lg font-bold text-[#E2E3E4] tracking-tight">Olive Labs</span>
          </div>

          {/* Hero */}
          <div className="auth-fade-in" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-[46px] font-extrabold leading-[1.02] tracking-tight text-white">
              Crie propostas<br />
              <span className="auth-gradient-text">que impressionam.</span>
            </h1>
          </div>
          <div className="auth-fade-in" style={{ animationDelay: '0.5s' }}>
            <p className="mt-6 max-w-[380px] text-[15px] leading-[1.75] text-[#5A5A60]">
              Editor visual inteligente para documentos profissionais.
            </p>
          </div>
        </div>

        {/* ── Design-themed animation: floating document mockup ── */}
        <div className="relative z-10 auth-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="auth-document-scene">
            {/* Main document */}
            <div className="auth-doc auth-doc-main">
              <div className="auth-doc-header">
                <div className="auth-doc-bar" />
                <div className="auth-doc-bar auth-doc-bar-short" />
              </div>
              <div className="auth-doc-body">
                <div className="auth-doc-line auth-doc-line-anim" style={{ width: '80%', animationDelay: '1.2s' }} />
                <div className="auth-doc-line auth-doc-line-anim" style={{ width: '65%', animationDelay: '1.4s' }} />
                <div className="auth-doc-line auth-doc-line-anim" style={{ width: '90%', animationDelay: '1.6s' }} />
                <div className="auth-doc-spacer" />
                <div className="auth-doc-block auth-doc-block-anim" style={{ animationDelay: '1.8s' }} />
                <div className="auth-doc-spacer" />
                <div className="auth-doc-line auth-doc-line-anim" style={{ width: '70%', animationDelay: '2.0s' }} />
                <div className="auth-doc-line auth-doc-line-anim" style={{ width: '55%', animationDelay: '2.2s' }} />
              </div>
              <div className="auth-doc-footer">
                <div className="auth-doc-tag">PDF</div>
                <div className="auth-doc-tag auth-doc-tag-accent">R$ 4.800</div>
              </div>
            </div>

            {/* Floating color palette */}
            <div className="auth-palette auth-float" style={{ animationDelay: '0.5s' }}>
              <div className="auth-swatch" style={{ background: '#94C020' }} />
              <div className="auth-swatch" style={{ background: '#E2E3E4' }} />
              <div className="auth-swatch" style={{ background: '#3B82F6' }} />
              <div className="auth-swatch" style={{ background: '#F87171' }} />
            </div>

            {/* Floating toolbar */}
            <div className="auth-toolbar auth-float" style={{ animationDelay: '1s' }}>
              <div className="auth-tool-btn">B</div>
              <div className="auth-tool-btn">I</div>
              <div className="auth-tool-btn auth-tool-btn-active">T</div>
              <div className="auth-tool-divider" />
              <div className="auth-tool-btn">☰</div>
            </div>

            {/* Floating layers indicator */}
            <div className="auth-layers auth-float" style={{ animationDelay: '1.5s' }}>
              <div className="auth-layer auth-layer-active" />
              <div className="auth-layer" />
              <div className="auth-layer" />
            </div>

            {/* Cursor */}
            <div className="auth-cursor" />
          </div>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="absolute inset-6 rounded-[28px] border border-white/[0.03] bg-white/[0.006] backdrop-blur-sm lg:inset-8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-[#94C020]/[0.025] blur-[80px]" />
        <div className="relative z-10 w-full max-w-[380px] auth-fade-in" style={{ animationDelay: '0.4s' }}>
          {children}
        </div>
      </div>

      {/* ── CSS Animations ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(20px,-35px) scale(1.04)} 50%{transform:translate(-15px,-55px) scale(1.02)} 75%{transform:translate(30px,-25px) scale(1.06)} }
        @keyframes gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes logo-breathe { 0%,100%{box-shadow:0 0 20px rgba(148,192,32,0.25),0 0 60px rgba(148,192,32,0.08)} 50%{box-shadow:0 0 35px rgba(148,192,32,0.45),0 0 100px rgba(148,192,32,0.12)} }
        @keyframes fade-up-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gentle-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes type-line { from{width:0} to{width:var(--w)} }
        @keyframes block-appear { from{opacity:0;transform:scaleY(0)} to{opacity:1;transform:scaleY(1)} }
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes cursor-move { 0%{top:30%;left:55%} 15%{top:35%;left:60%} 30%{top:50%;left:45%} 50%{top:55%;left:50%} 70%{top:40%;left:65%} 85%{top:45%;left:55%} 100%{top:30%;left:55%} }
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.5);opacity:0} }

        /* Orbs */
        .auth-orb{position:absolute;border-radius:50%}
        .auth-orb-1{top:-18%;left:-8%;width:550px;height:550px;background:radial-gradient(circle,rgba(148,192,32,0.1) 0%,transparent 70%);animation:float 16s ease-in-out infinite}
        .auth-orb-2{bottom:-22%;right:-8%;width:650px;height:650px;background:radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 70%);animation:float 20s ease-in-out infinite reverse}
        .auth-orb-3{top:25%;left:35%;width:300px;height:300px;background:radial-gradient(circle,rgba(148,192,32,0.04) 0%,transparent 70%);animation:float 12s ease-in-out infinite 3s}

        /* Text effects */
        .auth-gradient-text{background:linear-gradient(90deg,#7DA61A,#94C020,#B8E040,#94C020,#7DA61A);background-size:400% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gradient-shift 6s ease-in-out infinite}
        .auth-logo{animation:logo-breathe 4s ease-in-out infinite}
        .auth-fade-in{opacity:0;animation:fade-up-in 0.8s cubic-bezier(0.16,1,0.3,1) forwards}
        .auth-float{animation:gentle-float 4s ease-in-out infinite}

        /* ── Document scene ── */
        .auth-document-scene {
          position:relative; width:360px; height:240px;
        }

        /* Main document card */
        .auth-doc {
          position:absolute; border-radius:12px;
          border:1px solid rgba(255,255,255,0.06);
          overflow:hidden;
        }
        .auth-doc-main {
          top:10px; left:20px; width:200px; height:220px;
          background:rgba(255,255,255,0.03);
          backdrop-filter:blur(12px);
          animation:gentle-float 5s ease-in-out infinite;
        }
        .auth-doc-header {
          padding:14px 16px 10px;
          border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .auth-doc-bar {
          height:6px; width:60%; border-radius:3px;
          background:linear-gradient(90deg, #94C020, #B8E040);
          box-shadow:0 0 8px rgba(148,192,32,0.3);
        }
        .auth-doc-bar-short {
          width:35%; margin-top:6px;
          background:rgba(255,255,255,0.06);
          box-shadow:none;
        }
        .auth-doc-body { padding:12px 16px; }
        .auth-doc-line {
          height:4px; border-radius:2px;
          background:rgba(255,255,255,0.04);
          margin-bottom:8px;
        }
        .auth-doc-line-anim {
          animation:type-line 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
          width:0 !important;
          --w:80%;
        }
        .auth-doc-line-anim:nth-child(2) { --w:65% }
        .auth-doc-line-anim:nth-child(3) { --w:90% }
        .auth-doc-line-anim:nth-child(6) { --w:70% }
        .auth-doc-line-anim:nth-child(7) { --w:55% }
        .auth-doc-spacer { height:10px; }
        .auth-doc-block {
          height:28px; border-radius:6px;
          background:rgba(148,192,32,0.06);
          border:1px solid rgba(148,192,32,0.1);
        }
        .auth-doc-block-anim {
          animation:block-appear 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity:0; transform-origin:top;
        }
        .auth-doc-footer {
          position:absolute; bottom:0; left:0; right:0;
          padding:8px 16px;
          display:flex; gap:6px; align-items:center;
          border-top:1px solid rgba(255,255,255,0.04);
        }
        .auth-doc-tag {
          font-size:8px; font-weight:700; font-family:monospace;
          padding:2px 6px; border-radius:4px;
          background:rgba(255,255,255,0.05);
          color:rgba(255,255,255,0.3);
        }
        .auth-doc-tag-accent {
          background:rgba(148,192,32,0.1);
          color:#94C020;
        }

        /* Floating palette */
        .auth-palette {
          position:absolute; top:0; right:60px;
          display:flex; gap:4px; padding:6px 8px;
          background:rgba(15,15,17,0.8);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:8px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
        }
        .auth-swatch {
          width:16px; height:16px; border-radius:4px;
          transition:transform 0.2s;
        }

        /* Floating toolbar */
        .auth-toolbar {
          position:absolute; top:80px; right:30px;
          display:flex; align-items:center; gap:2px; padding:4px 6px;
          background:rgba(15,15,17,0.85);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:8px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
        }
        .auth-tool-btn {
          width:22px; height:22px; border-radius:4px;
          display:flex; align-items:center; justify-content:center;
          font-size:9px; font-weight:700; color:rgba(255,255,255,0.3);
          font-family:'Inter',sans-serif;
        }
        .auth-tool-btn-active {
          background:rgba(148,192,32,0.15);
          color:#94C020;
        }
        .auth-tool-divider {
          width:1px; height:14px; margin:0 3px;
          background:rgba(255,255,255,0.06);
        }

        /* Layers */
        .auth-layers {
          position:absolute; bottom:20px; right:50px;
          display:flex; flex-direction:column; gap:3px; padding:6px 8px;
          background:rgba(15,15,17,0.8);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:8px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
        }
        .auth-layer {
          width:40px; height:6px; border-radius:3px;
          background:rgba(255,255,255,0.06);
        }
        .auth-layer-active {
          background:linear-gradient(90deg, #94C020, #B8E040);
          box-shadow:0 0 6px rgba(148,192,32,0.4);
        }

        /* Cursor */
        .auth-cursor {
          position:absolute;
          width:12px; height:18px;
          border-left:2px solid #94C020;
          border-bottom:2px solid #94C020;
          transform:rotate(0deg);
          animation:cursor-move 10s ease-in-out infinite, cursor-blink 1s ease-in-out infinite;
          filter:drop-shadow(0 0 4px rgba(148,192,32,0.5));
        }
        .auth-cursor::after {
          content:'';
          position:absolute;
          top:-4px; left:-6px;
          width:8px; height:8px;
          border-radius:50%;
          background:#94C020;
          opacity:0.3;
          animation:pulse-ring 2s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
