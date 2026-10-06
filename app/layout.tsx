import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOSJIS — Dari Langit ke Bumi",
  description:
    "Minuman kaleng premium 6 rasa. Scroll dari langit ke bumi dan saksikan setiap kaleng bertransformasi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-sky-400 antialiased">{children}</body>
    </html>
  );
}
