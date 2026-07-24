"use client";

import React, { useEffect, useRef } from "react";
import { Star } from "lucide-react";

type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: number;
};

export default function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // hide scrollbar for webkit via injected style
    // set up auto-scroll every 4s
    function step() {
      if (!el) return;
      const children = el.querySelectorAll<HTMLElement>(".testimonial-card");
      if (!children || children.length === 0) return;
      const card = children[0];
      const stepWidth = card.getBoundingClientRect().width;
      const max = el.scrollWidth - el.clientWidth;
      const next = Math.min(el.scrollLeft + stepWidth, el.scrollWidth);
      if (el.scrollLeft >= max - 1) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: next, behavior: "smooth" });
      }
    }

    intervalRef.current = window.setInterval(step, 4000);

    // pause on hover/touch
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
  }, [testimonials]);

  return (
    <div className="-mx-4 px-4">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }`}</style>
      <div
        ref={ref}
        className="hide-scrollbar flex gap-6 overflow-x-auto snap-x snap-mandatory"
        aria-label="Client testimonials carousel"
      >
        {testimonials.map((t) => (
          <div key={t.name} className="testimonial-card snap-center flex-shrink-0 w-[66.666vw] md:w-auto rounded-2xl border border-white/10 bg-[var(--surface)] p-7 hover:border-[var(--gold)]/30 transition">
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
  );
}
