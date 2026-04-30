import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@": path.join(process.cwd(), "src"),
      "@hopnet/shared/graph-engine": "./src/shared-engine/index.ts",
    },
  },
};

export default nextConfig;
