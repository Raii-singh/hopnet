import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@": path.join(process.cwd(), "src"),
      "@hopnet/shared/graph-engine": "./src/index.ts",
    },
  },
};

export default nextConfig;
