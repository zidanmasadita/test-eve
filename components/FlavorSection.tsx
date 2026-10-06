"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FLAVORS, formatIDR, type Flavor } from "@/lib/flavors";

gsap.registerPlugin(ScrollTrigger);

function Card({
  flavor,
  align,
  onAdd,
}: {
  flavor: Flavor;
  align: "left" | "right";
  onAdd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll(".reveal"),
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 65%" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const right = align === "right";

  return (
    <div ref={ref} id={`rasa-${flavor.index}`} className="relative h-[200vh]">
      {/* pinned ("fixed scroll") text: stays put while the can performs its carousel spin */}
      <div
        className={`sticky top-0 flex h-screen px-6 pt-24 md:px-0 md:pt-0 ${
          right
            ? "items-start justify-center md:items-center md:justify-end md:pr-16 lg:pr-28"
            : "items-start justify-center md:items-center md:justify-start md:pl-16 lg:pl-28"
        }`}
      >
        <div
          className={`reveal w-full max-w-md [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] ${
            right ? "md:text-right" : ""
          }`}
        >
          <p className="reveal text-sm font-extrabold uppercase tracking-[0.35em] text-white/85">
            {flavor.tagline}
          </p>
          <h2 className="reveal mt-3 font-display text-6xl font-extrabold leading-[0.95] text-white md:text-7xl">
            {flavor.name}
          </h2>
          <p className="reveal mt-5 text-lg leading-relaxed text-white/90">
            {flavor.description}
          </p>
          <div
            className={`reveal mt-8 flex flex-wrap items-center gap-4 ${
              right ? "md:justify-end" : ""
            }`}
          >
            <span className="font-display text-3xl font-extrabold text-white">
              {formatIDR(flavor.price)}
              <span className="ml-1 align-middle font-sans text-sm font-bold text-white/70">
                /can
              </span>
            </span>
            <button
              onClick={onAdd}
              className="rounded-full bg-white px-7 py-3 font-display text-base font-bold text-black shadow-xl transition hover:scale-105 active:scale-95"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlavorSections({ onAdd }: { onAdd: (f: Flavor) => void }) {
  return (
    <>
      {FLAVORS.map((f) => (
        <Card key={f.id} flavor={f} align={f.index % 2 === 0 ? "left" : "right"} onAdd={() => onAdd(f)} />
      ))}
    </>
  );
}
