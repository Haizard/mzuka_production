import Image from "next/image";
import Link from "next/link";
import {
  Crown, Camera, ShieldCheck, Download, Star,
  CalendarDays, CheckCircle2, ArrowRight, Play,
  Mail, Phone, MapPin, Globe, Share2, GalleryHorizontalEnd,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-white overflow-x-hidden pb-[72px] lg:pb-0">
      <Nav />
      <Hero />
      <TrustBar />
      <Services />
      <HowItWorks />
      <Gallery />
      <AISection />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
      <MobileHomeBottomBar />
    </main>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl lg:rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
            <Crown className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <p className="text-base font-bold tracking-widest text-[var(--gold)]">[MG]</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Muzuka Gilbert</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {[["Services", "#services"], ["Gallery", "#gallery"], ["How It Works", "#how"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label as string} href={href as string}
              className="text-sm text-zinc-400 hover:text-white transition">
              {label as string}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-flex h-10 items-center px-4 text-sm text-zinc-300 hover:text-white transition border border-white/10 rounded-lg hover:border-white/20">
            Sign In
          </Link>
          {/* Desktop only Book button — mobile uses the bottom bar */}
          <Link href="/register" className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black hover:bg-yellow-400 transition">
            Book a Session
          </Link>
          {/* Mobile: sign in link */}
          <Link href="/login" className="sm:hidden inline-flex h-9 items-center px-3 text-xs text-zinc-300 border border-white/10 rounded-xl hover:bg-white/5 transition">
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Mobile Home Bottom Action Bar ─────────────────────────────────────────────

function MobileHomeBottomBar() {
  return (
    <div className="lg:hidden mobile-bottom-nav">
      {/* Quick access row */}
      <div className="flex items-center px-4 pt-2 pb-1 gap-3">
        <Link
          href="/register"
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-[var(--gold)] text-black font-bold text-sm transition active:scale-95 active:opacity-90"
        >
          <CalendarDays className="h-4 w-4" />
          Book Appointment
        </Link>
        <Link
          href="/client"
          className="flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-white/8 border border-white/10 text-white text-sm font-medium transition active:scale-95"
        >
          <GalleryHorizontalEnd className="h-4 w-4 text-[var(--gold)]" />
          Gallery
        </Link>
      </div>
      <div className="h-[env(safe-area-inset-bottom,4px)]" />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-dvh flex items-center justify-center overflow-hidden pt-16">
      {/* Background image */}
      <Image
        src="/brand/muzuka-primary-concept.jpeg"
        alt="Muzuka Gilbert luxury photography"
        fill
        priority
        className="object-cover object-center"
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {/* Gold accent line */}
      <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--gold)]/40 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-black/50 px-4 py-2 mb-8 backdrop-blur">
            <Star className="h-3.5 w-3.5 text-[var(--gold)] fill-[var(--gold)]" />
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Luxury Photography &amp; Videography</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-[1.0] tracking-tight mb-6">
            <span className="block text-white">We don&apos;t just</span>
            <span className="block text-white">take pictures.</span>
            <span className="block text-[var(--gold)]">We create</span>
            <span className="block text-[var(--gold)]">masterpieces.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl leading-relaxed mb-10">
            Private booking. Protected gallery delivery. Cinematic quality. Every image scored by AI before it reaches you — only the best makes the cut.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[var(--gold)] px-8 text-base font-bold text-black hover:bg-yellow-400 transition group">
              <CalendarDays className="h-5 w-5" />
              Book Your Session
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#gallery"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-8 text-base font-medium text-white hover:bg-white/10 hover:border-white/30 transition backdrop-blur">
              <Play className="h-5 w-5 text-[var(--gold)]" />
              View Our Work
            </a>
          </div>

          {/* Stats */}
          <div className="mt-14 flex flex-wrap gap-x-10 gap-y-4">
            {[["500+", "Sessions Delivered"], ["98%", "Client Satisfaction"], ["6K/8K", "Full Resolution"], ["100%", "Private & Secure"]].map(([num, label]) => (
              <div key={label as string}>
                <p className="text-3xl font-bold text-[var(--gold)]">{num as string}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{label as string}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <div className="w-px h-8 bg-gradient-to-b from-[var(--gold)]/60 to-transparent" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/60" />
      </div>
    </section>
  );
}

// ── Trust Bar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <section className="border-y border-white/8 bg-black/60 backdrop-blur-sm py-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-zinc-500">
          {[
            "Wedding Photography",
            "Corporate Events",
            "Portrait Sessions",
            "Videography & Reels",
            "AI-Scored Quality",
            "Private Gallery Delivery",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────

const services = [
  {
    icon: Camera,
    title: "Wedding Photography",
    desc: "Every moment captured with cinematic precision. From the first look to the final dance — nothing is missed.",
    tag: "Most Popular",
  },
  {
    icon: Play,
    title: "Videography & Reels",
    desc: "Cinematic films and social media reels that make your audience feel every emotion. 4K/6K production.",
    tag: "Trending",
  },
  {
    icon: Star,
    title: "Portrait Sessions",
    desc: "Personal and corporate portraits with luxury lighting setups, professional retouching, and private delivery.",
    tag: null,
  },
  {
    icon: CalendarDays,
    title: "Corporate Events",
    desc: "Conferences, product launches, galas. Professional coverage delivered within 48 hours.",
    tag: null,
  },
];

function Services() {
  return (
    <section id="services" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">What We Do</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">Our Services</h2>
          <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
            Every service backed by our private gallery system, AI quality gate, and secure delivery platform.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div key={s.title}
              className="group relative rounded-2xl border border-white/10 bg-[var(--surface)] p-6 hover:border-[var(--gold)]/40 hover:bg-[var(--surface-strong)] transition-all duration-300">
              {s.tag && (
                <span className="absolute -top-3 left-5 text-xs px-3 py-1 rounded-full bg-[var(--gold)] text-black font-bold">
                  {s.tag}
                </span>
              )}
              <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center mb-5 group-hover:bg-[var(--gold)]/20 transition">
                <s.icon className="h-6 w-6 text-[var(--gold)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
              <Link href="/register"
                className="inline-flex items-center gap-1.5 mt-5 text-sm text-[var(--gold)] hover:gap-2.5 transition-all">
                Book Now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const steps = [
  { num: "01", title: "Request Access", desc: "Create your private account. Our team reviews and approves access within 24 hours." },
  { num: "02", title: "Book Your Session", desc: "Choose your service, pick a date, and select your package. Reminders sent automatically." },
  { num: "03", title: "AI Quality Gate", desc: "Every photo is scored by our AI across 7 dimensions. Only top-tier images pass to your gallery." },
  { num: "04", title: "Protected Delivery", desc: "Watermarked previews first. Complete payment to unlock full 6K/8K quality downloads." },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">The Process</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">How It Works</h2>
          <p className="mt-4 text-zinc-400 text-lg max-w-xl mx-auto">
            From booking to delivery — a seamless, private, and fully controlled experience.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%_-_16px)] w-full h-px bg-gradient-to-r from-[var(--gold)]/40 to-transparent z-10" />
              )}
              <div className="relative">
                <div className="text-5xl font-black text-[var(--gold)]/15 mb-4 leading-none">{step.num}</div>
                <div className="w-14 h-14 rounded-2xl bg-[var(--gold)] flex items-center justify-center mb-5 text-black font-bold text-lg">
                  {parseInt(step.num)}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Gallery Showcase ──────────────────────────────────────────────────────────

function Gallery() {
  return (
    <section id="gallery" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Our Work</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white">Masterpieces</h2>
          </div>
          <Link href="/register"
            className="inline-flex items-center gap-2 text-sm text-[var(--gold)] hover:text-yellow-400 transition">
            Access Full Gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Asymmetric gallery grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Large featured image */}
          <div className="col-span-2 lg:col-span-2 row-span-2 relative rounded-2xl overflow-hidden aspect-square lg:aspect-auto lg:h-[500px] group">
            <Image src="/brand/muzuka-primary-concept.jpeg" alt="Featured work" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5">
              <span className="text-xs uppercase tracking-widest text-[var(--gold)] bg-black/60 px-3 py-1.5 rounded-full backdrop-blur">Wedding Coverage</span>
            </div>
          </div>

          {/* Top right */}
          <div className="relative rounded-2xl overflow-hidden aspect-square group">
            <Image src="/brand/customer-admin-concept.jpeg" alt="Client portal" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-xs uppercase tracking-widest text-[var(--gold)] bg-black/60 px-2 py-1 rounded-full backdrop-blur">Portrait</span>
            </div>
          </div>

          {/* Bottom right */}
          <div className="relative rounded-2xl overflow-hidden aspect-square group">
            <Image src="/brand/mg-ai-dashboard-concept.jpeg" alt="AI powered" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <div className="w-16 h-16 rounded-full bg-[var(--gold)] flex items-center justify-center">
                <Play className="h-7 w-7 text-black ml-1" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3">
              <span className="text-xs uppercase tracking-widest text-[var(--gold)] bg-black/60 px-2 py-1 rounded-full backdrop-blur">Cinematic</span>
            </div>
          </div>
        </div>

        {/* Gallery access CTA */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--surface)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-[var(--gold)] shrink-0" />
            <div>
              <p className="font-semibold text-white">Private Gallery Access</p>
              <p className="text-sm text-zinc-400">Your full gallery is protected and only accessible to you.</p>
            </div>
          </div>
          <Link href="/register"
            className="shrink-0 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-sm font-bold text-black hover:bg-yellow-400 transition">
            Request Your Gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── AI Section ────────────────────────────────────────────────────────────────

const aiScores = [
  { label: "Sharpness",   value: 96 },
  { label: "Lighting",    value: 94 },
  { label: "Face Quality",value: 98 },
  { label: "Composition", value: 93 },
  { label: "Emotion",     value: 97 },
  { label: "Color Grade", value: 95 },
];

function AISection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)] relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--gold)]/3 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left: text */}
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">AI-Powered Quality</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
              Only your best photos reach your gallery.
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              Every image is automatically analyzed across 7 quality dimensions by our AI engine. Photos scoring below 70 are filtered out — so you only receive masterpieces.
            </p>
            <div className="space-y-2">
              {["Sharpness & focus detection", "Professional lighting analysis", "Facial expression & emotion scoring", "Composition & framing evaluation", "Color grading assessment"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[var(--gold)] shrink-0" />
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI score card */}
          <div className="rounded-2xl border border-[var(--gold)]/20 bg-black p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--gold)] mb-1">AI Analysis Report</p>
                <p className="text-white font-semibold">Wedding Session — June 2026</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full border-4 border-[var(--gold)] flex items-center justify-center">
                  <div>
                    <p className="text-2xl font-black text-white">95</p>
                    <p className="text-[9px] uppercase text-[var(--gold)] tracking-widest">score</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {aiScores.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">{s.label}</span>
                    <span className="text-white font-semibold">{s.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-yellow-400"
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-zinc-300">
                <span className="text-white font-semibold">147 of 183 photos</span> passed the quality gate
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: "Amina & David",
    role: "Wedding — Nairobi, Kenya",
    text: "Muzuka Gilbert captured every single emotion from our wedding day. The private gallery delivery was seamless — we felt our memories were truly protected.",
    rating: 5,
  },
  {
    name: "Sarah Kimani",
    role: "Corporate Portrait Session",
    text: "Professional, cinematic, and delivered within 24 hours. The AI quality gate meant every photo in my gallery was magazine-ready. Absolutely worth it.",
    rating: 5,
  },
  {
    name: "The Odhiambo Family",
    role: "Family Portrait Session",
    text: "We had tried other photographers before but nothing compared to this. The watermarked preview system was brilliant — we knew our photos were safe.",
    rating: 5,
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Client Stories</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">What Our Clients Say</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-7 hover:border-[var(--gold)]/30 transition">
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-[var(--gold)] fill-[var(--gold)]" />
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] font-bold text-sm shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Essential",
    price: "From $299",
    desc: "Perfect for portrait sessions and small events.",
    features: ["Up to 3 hours coverage", "50+ edited photos", "Private gallery (30 days)", "Watermarked previews", "Full-res download after payment"],
    cta: "Book Essential",
    highlight: false,
  },
  {
    name: "Signature",
    price: "From $799",
    desc: "Our most popular package for weddings and corporate events.",
    features: ["Full day coverage (8 hrs)", "300+ edited photos", "Cinematic highlight reel", "Private gallery (90 days)", "AI quality scoring", "6K/8K delivery", "SMS & email reminders"],
    cta: "Book Signature",
    highlight: true,
  },
  {
    name: "Legacy",
    price: "From $1,499",
    desc: "The complete luxury experience — no limits.",
    features: ["Multi-day coverage", "Unlimited edited photos", "Full cinematic film", "Private gallery (1 year)", "AI quality gate", "8K delivery + RAW files", "Dedicated account manager", "Priority support"],
    cta: "Book Legacy",
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Investment</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">Choose Your Package</h2>
          <p className="mt-4 text-zinc-400 text-lg">Every package includes private gallery access and AI quality scoring.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? "border-2 border-[var(--gold)] bg-gradient-to-b from-[var(--gold)]/10 to-black shadow-2xl shadow-[var(--gold)]/10 scale-[1.02]"
                  : "border border-white/10 bg-black hover:border-white/20"
              }`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[var(--gold)] text-black text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm text-zinc-500 uppercase tracking-widest mb-1">{plan.name}</p>
                <p className="text-4xl font-black text-white mb-2">{plan.price}</p>
                <p className="text-sm text-zinc-400">{plan.desc}</p>
              </div>

              <div className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-[var(--gold)]" : "text-zinc-500"}`} />
                    <span className="text-sm text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/register"
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
                  plan.highlight
                    ? "bg-[var(--gold)] text-black hover:bg-yellow-400"
                    : "border border-white/20 text-white hover:bg-white/5"
                }`}>
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-zinc-500 mt-8">
          All prices are starting rates. Final quote based on event specifics.{" "}
          <Link href="/register" className="text-[var(--gold)] hover:underline">Contact us for custom packages.</Link>
        </p>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <Image src="/brand/mg-ai-command-center.jpeg" alt="" fill className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-4">Ready to Begin?</p>
        <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6">
          Your story deserves to be told beautifully.
        </h2>
        <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
          Join hundreds of clients who trust Muzuka Gilbert to capture their most important moments — and protect them.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[var(--gold)] px-10 text-base font-black text-black hover:bg-yellow-400 transition group">
            <CalendarDays className="h-5 w-5" />
            Book Your Session
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login"
            className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/20 px-10 text-base font-medium text-white hover:bg-white/5 transition">
            <Download className="h-5 w-5 text-[var(--gold)]" />
            Access My Gallery
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold tracking-widest text-[var(--gold)]">[MG]</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Muzuka Gilbert</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed mb-5">
              Luxury photography & videography. We don&apos;t just take pictures — we create masterpieces.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[Globe, Share2, Mail].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-zinc-500 hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">Services</p>
            <ul className="space-y-3">
              {["Wedding Photography","Videography & Reels","Portrait Sessions","Corporate Events","AI Quality Gallery"].map((item) => (
                <li key={item}>
                  <a href="#services" className="text-sm text-zinc-500 hover:text-white transition">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">Account</p>
            <ul className="space-y-3">
              {[["Book a Session", "/register"],["Sign In", "/login"],["My Gallery", "/client"],["My Bookings", "/client/bookings"]].map(([label, href]) => (
                <li key={label as string}>
                  <Link href={href as string} className="text-sm text-zinc-500 hover:text-white transition">{label as string}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">Contact</p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-zinc-500">
                <Mail className="h-4 w-4 text-[var(--gold)] shrink-0" />
                info@muzukagilbert.com
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-500">
                <Phone className="h-4 w-4 text-[var(--gold)] shrink-0" />
                +254 700 000 000
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-500">
                <MapPin className="h-4 w-4 text-[var(--gold)] shrink-0" />
                Nairobi, Kenya
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Muzuka Gilbert. All rights reserved. All images are protected intellectual property.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
            Private &amp; Secure Gallery System
          </div>
        </div>
      </div>
    </footer>
  );
}
