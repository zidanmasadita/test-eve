import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOSJIS — From Sky to Earth",
  description:
    "Premium canned drinks in 6 flavors. Scroll from the sky to the earth and watch each can transform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-sky-400 antialiased">{children}</body>
    </html>
  );
}
