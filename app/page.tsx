"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SmoothScroll from "@/components/SmoothScroll";
import CanScene from "@/components/CanScene";
import Header from "@/components/Header";
import FlavorSections from "@/components/FlavorSection";
import CartDropdown, { type CartItem } from "@/components/CartDropdown";
import Flyer from "@/components/Flyer";
import FlavorDetail from "@/components/FlavorDetail";
import { scrollState } from "@/lib/scrollState";
import { FLAVORS, type Flavor } from "@/lib/flavors";

gsap.registerPlugin(ScrollTrigger);

interface FlyerData {
  id: number;
  flavor: Flavor;
  x: number;
  y: number;
}

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [flyers, setFlyers] = useState<FlyerData[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const flyerId = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = cartItems.reduce((s, it) => s + it.qty, 0);

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

  // close dropdown on outside click / Escape
  useEffect(() => {
    if (!cartOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.("#cart-button")) return;
      setCartOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [cartOpen]);

  // flavor detail opened by tapping a 3D can
  useEffect(() => {
    const h = (e: Event) => {
      const idx = (e as CustomEvent).detail;
      if (typeof idx === "number") {
        setCartOpen(false);
        setDetailIdx(idx);
      }
    };
    window.addEventListener("josjis:open-detail", h);
    return () => window.removeEventListener("josjis:open-detail", h);
  }, []);

  const addToCartWithRect = (f: Flavor, r: DOMRect) => {
    // 1. dropdown opens FIRST so the landing target is visible…
    setCartOpen(true);
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    // 2. …then the can flies in
    window.setTimeout(() => {
      flyerId.current += 1;
      const id = flyerId.current;
      setFlyers((prev) => [...prev, { id, flavor: f, x, y }]);
    }, 220);
  };

  const addToCart = (f: Flavor, e: ReactMouseEvent<HTMLElement>) => {
    addToCartWithRect(f, e.currentTarget.getBoundingClientRect());
  };

  const addToCartFromDetail = (f: Flavor, e: ReactMouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDetailIdx(null); // close the modal first…
    window.setTimeout(() => addToCartWithRect(f, r), 350); // …then fly
  };

  const handleFlyDone = (id: number, f: Flavor) => {
    setFlyers((prev) => prev.filter((fl) => fl.id !== id));
    setCartItems((prev) => {
      const ex = prev.find((it) => it.flavor.id === f.id);
      if (ex) {
        return prev.map((it) =>
          it.flavor.id === f.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [...prev, { flavor: f, qty: 1 }];
    });
    setHighlightId(f.id);
    window.setTimeout(
      () => setHighlightId((h) => (h === f.id ? null : h)),
      1300
    );
  };

  const incQty = (id: string) =>
    setCartItems((prev) =>
      prev.map((it) =>
        it.flavor.id === id ? { ...it, qty: it.qty + 1 } : it
      )
    );
  const decQty = (id: string) =>
    setCartItems((prev) =>
      prev
        .map((it) =>
          it.flavor.id === id ? { ...it, qty: it.qty - 1 } : it
        )
        .filter((it) => it.qty > 0)
    );
  const removeItem = (id: string) =>
    setCartItems((prev) => prev.filter((it) => it.flavor.id !== id));

  return (
    <SmoothScroll>
      <CanScene />
      <Header count={cartCount} onCartClick={() => setCartOpen((o) => !o)} />

      {cartOpen && (
        <div ref={dropdownRef}>
          <CartDropdown
            items={cartItems}
            highlightId={highlightId}
            onInc={incQty}
            onDec={decQty}
            onRemove={removeItem}
            onClose={() => setCartOpen(false)}
          />
        </div>
      )}

      {flyers.map((fl) => (
        <Flyer
          key={fl.id}
          flavor={fl.flavor}
          x={fl.x}
          y={fl.y}
          onDone={() => handleFlyDone(fl.id, fl.flavor)}
        />
      ))}

      {detailIdx !== null && (
        <FlavorDetail
          index={detailIdx}
          onClose={() => setDetailIdx(null)}
          onAdd={addToCartFromDetail}
        />
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
                onClick={(e) => addToCart(f, e)}
                className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:scale-105 hover:bg-white hover:text-black"
              >
                {f.name}
              </button>
            ))}
          </div>
          <p className="mt-8 text-white/70">
            {cartCount === 0
              ? "Your cart is still empty."
              : `${cartCount} can${cartCount > 1 ? "s" : ""} in your cart — checkout coming soon!`}
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
