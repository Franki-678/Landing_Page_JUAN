import AIChat from "@/components/AIChat";

/* ============================================================
   Landing — RC Repuestos
   Server Component. Compone Hero + Features + el AIChat (client).
   ============================================================ */

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      <div className="bg-blobs" aria-hidden />

      <Navbar />

      <main className="relative z-10 flex flex-col gap-24 pb-24">
        <Hero />
        <Features />
        <ChatSection />
        <ClosingCTA />
      </main>

      <Footer />
    </div>
  );
}

/* ----------------------------- Navbar ----------------------------- */
function Navbar() {
  return (
    <header className="relative z-20">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center text-white font-black shadow-md">
            RC
          </span>
          <span className="font-semibold tracking-tight text-foreground">
            RC Repuestos
          </span>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-foreground/70">
          <a href="#features" className="hover:text-foreground transition">
            Cómo funciona
          </a>
          <a href="#chat" className="hover:text-foreground transition">
            Cotizar con IA
          </a>
        </nav>

        <a
          href="#chat"
          className="rounded-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-400 shadow-md hover:shadow-lg hover:brightness-105 transition"
        >
          Pedir ahora
        </a>
      </div>
    </header>
  );
}

/* ------------------------------ Hero ------------------------------ */
function Hero() {
  return (
    <section className="relative max-w-6xl w-full mx-auto px-6 pt-10 sm:pt-16">
      <div className="flex flex-col items-center text-center gap-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-white px-4 py-1.5 text-xs font-medium text-brand-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse" />
          Nuevo · Cotizá hablando con la IA
        </span>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.05]">
          <span className="block">RC Repuestos:</span>
          <span className="block">
            Los expertos en{" "}
            <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              chapa y pintura
            </span>
            .
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-foreground/70 leading-relaxed">
          Simplificá tus pedidos hablando con nuestra{" "}
          <strong className="text-foreground">Inteligencia Artificial</strong>.
          Cotizás en segundos y cerrás por WhatsApp con el dueño. Sin vueltas,
          sin esperas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href="#chat"
            className="rounded-2xl px-6 py-3.5 bg-gradient-to-br from-brand-500 to-brand-400 text-white font-semibold shadow-lg hover:shadow-xl hover:brightness-105 transition"
          >
            🤖 Empezar a cotizar
          </a>
          <a
            href="#features"
            className="rounded-2xl px-6 py-3.5 bg-white/80 border border-white text-foreground font-semibold shadow-sm hover:bg-white transition"
          >
            Ver cómo funciona
          </a>
        </div>

        <HeroFloatingCard />
      </div>
    </section>
  );
}

function HeroFloatingCard() {
  return (
    <div className="mt-10 w-full max-w-3xl">
      <div className="glass rounded-3xl p-5 sm:p-6 shadow-[0_30px_60px_-20px_rgba(107,77,255,0.25)] animate-float-soft">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-accent-400 grid place-items-center text-white text-lg shadow">
            🤖
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-foreground/60 mb-1">
              IA de RC Repuestos
            </p>
            <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
              ¡Hola! Decime <em>marca, modelo y año</em> de tu auto y qué pieza
              necesitás. Te armo la cotización en segundos. ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Features ---------------------------- */
function Features() {
  const items = [
    {
      icon: "💬",
      title: "Pedís en lenguaje natural",
      text: "Escribís como si le hablaras a un amigo. La IA entiende marcas, modelos, años y piezas al toque.",
    },
    {
      icon: "⚡",
      title: "Respuestas en segundos",
      text: "Olvidate de mandar 5 fotos y esperar horas. La IA identifica el repuesto y arma el pedido al instante.",
    },
    {
      icon: "🟢",
      title: "Cerrás por WhatsApp",
      text: "Cuando el pedido está listo, te llevamos directo al WhatsApp del dueño con todo el resumen escrito.",
    },
  ];

  return (
    <section id="features" className="relative max-w-6xl w-full mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Cotizar nunca fue tan{" "}
          <span className="bg-gradient-to-r from-accent-500 to-brand-500 bg-clip-text text-transparent">
            simple
          </span>
          .
        </h2>
        <p className="mt-3 text-foreground/60 max-w-2xl mx-auto">
          Tres pasos. Sin formularios eternos, sin llamadas perdidas.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {items.map((it, i) => (
          <FeatureCard key={i} index={i + 1} {...it} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  index,
}: {
  icon: string;
  title: string;
  text: string;
  index: number;
}) {
  return (
    <div className="glass rounded-3xl p-6 shadow-sm hover:shadow-md transition group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 grid place-items-center text-2xl shadow-inner">
          {icon}
        </div>
        <span className="text-xs font-bold text-brand-700 bg-brand-50 rounded-full px-2.5 py-1">
          PASO {index}
        </span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-foreground/65 leading-relaxed">{text}</p>
    </div>
  );
}

/* --------------------------- Chat section -------------------------- */
function ChatSection() {
  return (
    <section className="relative max-w-6xl w-full mx-auto px-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Probá la IA{" "}
          <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
            ahora mismo
          </span>
        </h2>
        <p className="mt-3 text-foreground/60 max-w-2xl mx-auto">
          Sin registro. Sin descargas. Empezá a escribir y la IA hace el resto.
        </p>
      </div>

      <AIChat />
    </section>
  );
}

/* --------------------------- Closing CTA --------------------------- */
function ClosingCTA() {
  return (
    <section className="relative max-w-4xl w-full mx-auto px-6">
      <div className="glass rounded-3xl p-8 sm:p-12 text-center shadow-md">
        <h3 className="text-2xl sm:text-3xl font-black text-foreground">
          ¿Tenés un taller de chapa y pintura?
        </h3>
        <p className="mt-3 text-foreground/65 max-w-xl mx-auto">
          Dejá de perder horas pidiendo presupuestos. Cotizá rápido con la IA y
          dedicale ese tiempo a lo que sabés hacer mejor: <em>tu trabajo</em>.
        </p>
        <a
          href="#chat"
          className="inline-block mt-6 rounded-2xl px-6 py-3.5 bg-gradient-to-br from-brand-500 to-accent-500 text-white font-semibold shadow-lg hover:shadow-xl hover:brightness-105 transition"
        >
          Empezar mi pedido →
        </a>
      </div>
    </section>
  );
}

/* ----------------------------- Footer ----------------------------- */
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/60 bg-white/40">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/55">
        <p>© {new Date().getFullYear()} RC Repuestos · Chapa y pintura</p>
        <p>Hecho con 🧡 + IA</p>
      </div>
    </footer>
  );
}
