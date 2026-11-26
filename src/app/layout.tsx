import type { Metadata } from "next";
// Font disimpan lokal (paket @fontsource) agar tetap tampil tanpa internet di TV.
// Body: Plus Jakarta Sans (mudah dibaca di layar besar). Judul: Sora (tegas & modern).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PID Maintenance Improvement Plan 2027",
  description: "PID Maintenance Improvement Plan 2027.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body suppressHydrationWarning>{children}</body></html>;
}
