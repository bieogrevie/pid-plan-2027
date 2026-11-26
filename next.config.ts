import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages melayani situs di /<repo>; set PAGES_BASE_PATH saat build CI.
  basePath: process.env.PAGES_BASE_PATH || "",
  // Keep the dev server cache separate from production builds so `next build`
  // cannot replace chunks that an already-running `next dev` process expects.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
