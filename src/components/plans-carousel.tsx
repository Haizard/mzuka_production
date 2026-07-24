"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export default function PlansCarousel({ plans }: { plans: Plan[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function step() {
      if (!el) return;
      const card = el.querySelector<HTMLElement>(".plan-card");
      if (!card) return;
      const stepWidth = card.getBoundingClientRect().width;
      const max = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= max - 1) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: Math.min(el.scrollLeft + stepWidth, el.scrollWidth), behavior: "smooth" });
      }
    }

    intervalRef.current = window.setInterval(step, 4000);

    function pause() {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    function resume() {
      if (!intervalRef.current) intervalRef.current = window.setInterval(step, 4000);
    }

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause);
    el.addEventListener("touchend", resume);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [plans]);

  return (
    <div className="-mx-4 px-4">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }`}</style>
      <div ref={ref} className="hide-scrollbar flex gap-6 overflow-x-auto snap-x snap-mandatory">
        {plans.map((p) => (
          <div key={p.name} className={`plan-card snap-center flex-shrink-0 w-[66.666vw] md:w-auto rounded-2xl p-8 transition ${p.highlight ? 'border-2 border-[var(--gold)] bg-gradient-to-b from-[var(--gold)]/10 to-black shadow-2xl scale-[1.02]' : 'border border-white/10 bg-black'}`}>
            <div className="mb-6">
              <p className="text-sm text-zinc-500 uppercase tracking-widest mb-1">{p.name}</p>
              <p className="text-4xl font-black text-white mb-2">{p.price}</p>
              <p className="text-sm text-zinc-400">{p.desc}</p>
            </div>

            <div className="space-y-3 flex-1 mb-6">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${p.highlight ? 'text-[var(--gold)]' : 'text-zinc-500'}`} />
                  <span className="text-sm text-zinc-300">{f}</span>
                </div>
              ))}
            </div>

            <Link href="/register" className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${p.highlight ? 'bg-[var(--gold)] text-black hover:bg-yellow-400' : 'border border-white/20 text-white hover:bg-white/5'}`}>
              {p.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
