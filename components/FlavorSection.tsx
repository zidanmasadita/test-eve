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
          scrollTrigger: { trigger: el, start: "top 70%" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      id={`rasa-${flavor.index}`}
      className={`flex min-h-screen items-center px-6 md:px-16 ${
        align === "left" ? "justify-start" : "justify-end"
      }`}
    >
      <div className="reveal max-w-md rounded-3xl bg-black/25 p-8 backdrop-blur-xl md:p-10">
        <p className="reveal text-sm font-bold uppercase tracking-[0.35em] text-white/70">
          {flavor.tagline}
        </p>
        <h2 className="reveal mt-3 text-5xl font-black text-white drop-shadow-xl md:text-6xl">
          {flavor.name}
        </h2>
        <p className="reveal mt-4 leading-relaxed text-white/85">{flavor.description}</p>
        <div className="reveal mt-6 flex items-center justify-between">
          <span className="text-2xl font-extrabold text-white">
            {formatIDR(flavor.price)}
            <span className="text-sm font-normal text-white/60"> /kaleng</span>
          </span>
          <button
            onClick={onAdd}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-xl transition hover:scale-105 active:scale-95"
          >
            + Keranjang
          </button>
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
