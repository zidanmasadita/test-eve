"use client";

import { Fragment, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
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
  onAdd: (f: Flavor, e: ReactMouseEvent<HTMLElement>) => void;
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
    <div ref={ref} id={`rasa-${flavor.index}`} className="relative h-[150vh]">
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
              onClick={(e) => onAdd(flavor, e)}
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

function BottleShowcase({
  onAdd,
}: {
  onAdd: (f: Flavor, e: ReactMouseEvent<HTMLElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const flavor = FLAVORS[2]; // cloud coconut

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

  return (
    <div ref={ref} className="relative h-[150vh]">
      {/* pinned showcase: the 3D can dives away, the 3D contour bottle
          (real label wrapped on a cylinder) takes over */}
      <div className="sticky top-0 flex h-screen items-start px-6 pt-24 md:items-center md:px-0 md:pt-0">
        <div className="reveal w-full max-w-md [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] md:pl-16 lg:pl-24">
            <p className="reveal text-sm font-extrabold uppercase tracking-[0.35em] text-white/85">
              Same flavor, new shape
            </p>
            <h2 className="reveal mt-3 font-display text-5xl font-extrabold leading-[0.95] text-white md:text-6xl">
              Cloud Coconut, now in a bottle
            </h2>
            <p className="reveal mt-5 text-lg leading-relaxed text-white/90">
              The cloud-soft coconut you love, poured into the iconic contour
              bottle. Same 250 ml of silky refreshment — now with a cap.
            </p>
            <div className="reveal mt-8">
              <button
                onClick={(e) => onAdd(flavor, e)}
                className="rounded-full bg-white px-7 py-3 font-display text-base font-bold text-black shadow-xl transition hover:scale-105 active:scale-95"
              >
                Add to Cart
              </button>
            </div>
            <p className="reveal mt-4 text-xs font-semibold uppercase tracking-widest text-white/60">
              Tap the bottle for the full flavor story
            </p>
        </div>
      </div>
    </div>
  );
}

export default function FlavorSections({ onAdd }: { onAdd: (f: Flavor, e: ReactMouseEvent<HTMLElement>) => void }) {
  return (
    <>
      {FLAVORS.map((f) => (
        <Fragment key={f.id}>
          <Card flavor={f} align={f.index % 2 === 0 ? "left" : "right"} onAdd={(fl, e) => onAdd(fl, e)} />
          {f.index === 2 && <BottleShowcase onAdd={onAdd} />}
        </Fragment>
      ))}
    </>
  );
}
