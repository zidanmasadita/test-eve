"use client";

export default function Header({ cart }: { cart: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 md:px-10">
      <div className="font-display text-xl font-extrabold tracking-[0.3em] text-white drop-shadow-lg">
        JOSJIS
      </div>
      <nav className="hidden items-center gap-8 text-sm font-medium text-white/90 md:flex">
        <a href="#rasa-0" className="transition hover:text-white">Flavors</a>
        <a href="#tentang" className="transition hover:text-white">About</a>
        <a href="#beli" className="transition hover:text-white">Shop</a>
      </nav>
      <button className="relative rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25">
        Cart
        {cart > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black">
            {cart}
          </span>
        )}
      </button>
    </header>
  );
}
