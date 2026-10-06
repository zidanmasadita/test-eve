# SKYFALL — Dari Langit ke Bumi

Website penjualan minuman kaleng premium dengan konsep **scroll journey dari langit ke bumi**:
setiap rasa kaleng bertransformasi mengikuti background (langit siang → matahari terbit →
awan → senja → hutan → tanah).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **GSAP + ScrollTrigger** — animasi berbasis scroll
- **Lenis** — smooth scroll
- **Three.js WebGPU** (`WebGPURenderer` + TSL) — kaleng 3D & background shader,
  otomatis fallback ke WebGLRenderer bila WebGPU tidak tersedia

## Struktur

```
app/
  page.tsx            # hero → 6 section rasa → tentang → finale/CTA → footer
  layout.tsx
  globals.css         # Tailwind + Lenis styles
components/
  CanScene.tsx        # canvas WebGPU: kaleng 3D, background gradient shader, partikel
  SmoothScroll.tsx    # Lenis + integrasi GSAP ticker
  FlavorSection.tsx   # kartu tiap rasa (reveal animation)
  Header.tsx          # nav + keranjang
lib/
  flavors.ts          # data 6 rasa + warna langit/bumi
  canTexture.ts       # label kaleng prosedural (canvas) — placeholder aset AI
  scrollState.ts      # state scroll bersama (ditulis ScrollTrigger, dibaca scene 3D)
```

## Aset

Label kaleng saat ini **prosedural** (digambar via canvas di `lib/canTexture.ts`).
Untuk mengganti dengan artwork AI: generate sesuai prompt master, taruh di
`public/labels/<id>.png`, lalu update `canTexture.ts` / `flavors.ts`.

## Development

```bash
npm install
npm run dev
```

## Deploy

Terhubung ke Vercel — setiap push ke `main` otomatis deploy.
