"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SmoothScroll from "@/components/SmoothScroll";
import CanScene from "@/components/CanScene";
import Header from "@/components/Header";
import FlavorSections from "@/components/FlavorSection";
import { scrollState } from "@/lib/scrollState";
import { FLAVORS, type Flavor } from "@/lib/flavors";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [cart, setCart] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: "#journey",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        scrollState.target = self.progress;
      },
    });
    const st2 = ScrollTrigger.create({
      trigger: "#beli",
      start: "top bottom",
      end: "top top",
      scrub: true,
      onUpdate: (self) => {
        scrollState.finaleTarget = self.progress;
      },
    });
    return () => {
      st.kill();
      st2.kill();
    };
  }, []);

  const addToCart = (f: Flavor) => {
    setCart((c) => c + 1);
    setLastAdded(f.name);
    window.setTimeout(() => setLastAdded(null), 2200);
  };

  return (
    <SmoothScroll>
      <CanScene />
      <Header cart={cart} />

      {lastAdded && (
        <div className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-2xl">
          {lastAdded} added to cart!
        </div>
      )}

      <main className="relative">
        {/* HERO — the sky */}
        <section className="flex min-h-screen flex-col items-start justify-center px-6 text-left md:px-16 lg:px-24">
          <p className="hero-reveal text-sm font-extrabold uppercase tracking-[0.5em] text-white/70">
            Premium Canned Drinks
          </p>
          <h1 className="hero-reveal hero-delay-1 mt-6 max-w-4xl font-display text-6xl font-extrabold leading-[0.95] text-white drop-shadow-2xl md:text-8xl">
            From Sky
            <br />
            to Earth
          </h1>
          <p className="hero-reveal hero-delay-2 mt-6 max-w-xl text-lg text-white/85">
            Six flavors, six altitudes. Scroll down and watch each can transform
            as it descends from the sky to the earth.
          </p>
        </section>

        {/* JOURNEY — 6 flavors */}
        <div id="journey">
          <FlavorSections onAdd={addToCart} />
        </div>

        {/* ABOUT */}
        <section
          id="tentang"
          className="flex min-h-screen items-center justify-center px-6"
        >
          <div className="max-w-2xl rounded-3xl bg-black/25 p-10 text-center backdrop-blur-xl">
            <h2 className="font-display text-4xl font-extrabold text-white md:text-5xl">
              Why JosJis?
            </h2>
            <p className="mt-6 leading-relaxed text-white/85">
              Every JosJis flavor is inspired by a layer of the journey from sky
              to earth — from the blue of the midday sky, the warmth of sunrise,
              the softness of clouds, the mystery of dusk, the lush forest, to
              the richness of the earth&apos;s core. Made with natural ingredients,
              no preservatives, packed in 100% recyclable aluminum cans.
            </p>
          </div>
        </section>

        {/* FINALE / SHOP */}
        <section
          id="beli"
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        >
          <h2 className="max-w-3xl font-display text-5xl font-extrabold text-white drop-shadow-2xl md:text-7xl">
            Touchdown.
            <br />
            Pick your flavor.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {FLAVORS.map((f) => (
              <button
                key={f.id}
                onClick={() => addToCart(f)}
                className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:scale-105 hover:bg-white hover:text-black"
              >
                {f.name}
              </button>
            ))}
          </div>
          <p className="mt-8 text-white/70">
            {cart === 0
              ? "Your cart is still empty."
              : `${cart} can${cart > 1 ? "s" : ""} in your cart — checkout coming soon!`}
          </p>
        </section>

        <footer className="border-t border-white/15 px-6 py-10 text-center text-sm text-white/60">
          <p className="font-black tracking-[0.3em] text-white/80">JOSJIS</p>
          <p className="mt-2">© 2026 JosJis Beverage. From sky to earth.</p>
        </footer>
      </main>
    </SmoothScroll>
  );
}
