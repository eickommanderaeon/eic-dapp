import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDir,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
