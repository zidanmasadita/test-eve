"use client";

import { formatIDR, type Flavor } from "@/lib/flavors";

export interface CartItem {
  flavor: Flavor;
  qty: number;
}

interface Props {
  items: CartItem[];
  highlightId: string | null;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function CartDropdown({
  items,
  highlightId,
  onInc,
  onDec,
  onRemove,
  onClose,
}: Props) {
  const subtotal = items.reduce((s, it) => s + it.flavor.price * it.qty, 0);

  return (
    <div className="dropdown-in fixed right-4 top-[76px] z-40 w-[330px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl md:right-10">
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="font-display text-xl font-extrabold">Your Cart</h3>
        <button
          onClick={onClose}
          aria-label="Close cart"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
        >
          ×
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Your cart is empty — grab a flavor!
        </p>
      ) : (
        <>
          <ul data-lenis-prevent className="max-h-[44vh] space-y-2.5 overflow-y-auto px-4 py-4">
            {items.map((it) => (
              <li
                key={it.flavor.id}
                className={`flex items-center gap-3 rounded-2xl bg-slate-100/80 p-2.5 ${
                  highlightId === it.flavor.id ? "item-pop" : ""
                }`}
              >
                <img
                  src={it.flavor.label}
                  alt={it.flavor.name}
                  className="h-16 w-11 shrink-0 rounded-lg object-cover shadow"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold">
                    {it.flavor.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatIDR(it.flavor.price)} /can
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => onDec(it.flavor.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold shadow transition hover:scale-110"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-sm font-extrabold">
                      {it.qty}
                    </span>
                    <button
                      onClick={() => onInc(it.flavor.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold shadow transition hover:scale-110"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold">
                    {formatIDR(it.flavor.price * it.qty)}
                  </p>
                  <button
                    onClick={() => onRemove(it.flavor.id)}
                    className="mt-1 text-xs font-medium text-slate-400 transition hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Subtotal</span>
              <span className="font-display text-lg font-extrabold">
                {formatIDR(subtotal)}
              </span>
            </div>
            <button className="mt-3 w-full rounded-full bg-slate-900 py-3 font-display text-sm font-bold text-white transition hover:scale-[1.02] active:scale-95">
              Checkout
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Checkout coming soon
            </p>
          </div>
        </>
      )}
    </div>
  );
}
