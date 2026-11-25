import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PID Maintenance Improvement Plan 2027",
  description: "PID Maintenance Improvement Plan 2027.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body suppressHydrationWarning>{children}</body></html>;
}
