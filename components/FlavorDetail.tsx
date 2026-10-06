"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { FLAVORS, formatIDR, type Flavor } from "@/lib/flavors";

interface Props {
  index: number;
  onClose: () => void;
  onAdd: (f: Flavor, e: ReactMouseEvent<HTMLElement>) => void;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/**
 * Flavor detail overlay. The commercial video is pinned while the user
 * scrolls through a tall zone — scroll position scrubs the video timeline
 * (lid pops, drink splashes out). Flavor info + add-to-cart below.
 */
export default function FlavorDetail({ index, onClose, onAdd }: Props) {
  const flavor = FLAVORS[index];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(true);

  const videoSrc = `/videos/${flavor.id}.mp4`;
  const posterSrc = `/can-shots/${flavor.id}.jpg`;

  // lock page scroll while the detail is open
  useEffect(() => {
    (window as any).__lenis?.stop();
    document.body.style.overflow = "hidden";
    return () => {
      (window as any).__lenis?.start();
      document.body.style.overflow = "";
    };
  }, []);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // scroll-scrub the video across the tall video zone
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const zone = zoneRef.current;
      const video = videoRef.current;
      if (!zone || !video || !video.duration || !isFinite(video.duration)) return;
      const total = zone.offsetHeight - scroller.clientHeight;
      const pr = total > 0 ? clamp01(scroller.scrollTop / total) : 0;
      const t = pr * video.duration;
      if (Math.abs(video.currentTime - t) > 0.04) video.currentTime = t;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [videoOk]);

  return (
    <div
      data-detail-modal
      ref={scrollerRef}
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 backdrop-blur-md"
    >
      {/* close */}
      <button
        onClick={onClose}
        aria-label="Close detail"
        className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white backdrop-blur-md transition hover:scale-110 hover:bg-white/25 md:right-8 md:top-6"
      >
        ×
      </button>

      {/* video zone — pinned video, scroll scrubs the timeline */}
      <div ref={zoneRef} className="relative h-[280vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center">
          {videoOk ? (
            <video
              key={videoSrc}
              ref={videoRef}
              className="max-h-[82vh] w-auto max-w-[92vw] rounded-3xl object-contain shadow-2xl"
              src={videoSrc}
              poster={posterSrc}
              muted
              playsInline
              preload="auto"
              onError={() => setVideoOk(false)}
            />
          ) : (
            <img
              src={posterSrc}
              alt={flavor.name}
              className="max-h-[82vh] w-auto max-w-[92vw] rounded-3xl object-contain shadow-2xl"
            />
          )}
          <p className="pointer-events-none absolute bottom-[7vh] left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold uppercase tracking-[0.3em] text-white/70 [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
            Scroll to play
          </p>
        </div>

        {/* captions that drift past while the video is pinned */}
        <div className="pointer-events-none absolute inset-x-0 top-[12%] text-center">
          <p className="font-display text-3xl font-extrabold text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.8)] md:text-5xl">
            Pull the tab…
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[46%] text-center">
          <p className="font-display text-3xl font-extrabold text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.8)] md:text-5xl">
            …pop! Fizz!
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[78%] px-6 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.4em] text-white/80 [text-shadow:0_2px_16px_rgba(0,0,0,0.8)]">
            {flavor.tagline}
          </p>
          <p className="mt-2 font-display text-5xl font-extrabold text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.8)] md:text-7xl">
            {flavor.name}
          </p>
        </div>
      </div>

      {/* info */}
      <div className="relative mx-auto max-w-2xl px-6 pb-24 pt-8 text-center">
        <p className="text-lg leading-relaxed text-white/90">{flavor.description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-white/75">
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
            {flavor.fruit}
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
            250 ml
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
            {flavor.tagline}
          </span>
        </div>
        <div className="mt-10 flex items-center justify-center gap-5">
          <span className="font-display text-4xl font-extrabold text-white">
            {formatIDR(flavor.price)}
          </span>
          <button
            onClick={(e) => onAdd(flavor, e)}
            className="rounded-full bg-white px-8 py-4 font-display text-base font-bold text-black shadow-xl transition hover:scale-105 active:scale-95"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
