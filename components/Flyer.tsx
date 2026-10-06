"use client";

import { useEffect, useRef } from "react";
import type { Flavor } from "@/lib/flavors";

interface Props {
  flavor: Flavor;
  x: number;
  y: number;
  onDone: () => void;
}

/**
 * A mini can that flies from the Add button to the cart icon,
 * arcing slightly upward before shrinking into the cart.
 */
export default function Flyer({ flavor, x, y, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cartBtn = document.getElementById("cart-button");
    let dx = window.innerWidth - 80 - x;
    let dy = 40 - y;
    if (cartBtn) {
      const c = cartBtn.getBoundingClientRect();
      dx = c.left + c.width / 2 - x;
      dy = c.top + c.height / 2 - y;
    }
    const anim = el.animate(
      [
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(0.65) rotate(10deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.18) rotate(0deg)`,
          opacity: 0.85,
        },
      ],
      {
        duration: 750,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );
    anim.onfinish = () => doneRef.current();
    return () => anim.cancel();
  }, [x, y]);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[70]"
      style={{ transform: `translate(${x - 32}px, ${y - 48}px)` }}
    >
      <div
        ref={ref}
        className="h-24 w-16 overflow-hidden rounded-[16px] shadow-2xl ring-1 ring-black/10"
        style={{
          backgroundImage: `url(${flavor.label})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="h-full w-full bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </div>
    </div>
  );
}
