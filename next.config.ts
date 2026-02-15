import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(fileURLToPath(import.meta.url));

const enableWorkerThreads = process.env.NEXT_ENABLE_WORKER_THREADS === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDir,
  },
  experimental: {
    cpus: 1,
    workerThreads: enableWorkerThreads,
    webpackBuildWorker: false,
  },
  webpack: (config, { dev }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@gemini-wallet/core": false,
      "@metamask/sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@safe-global/safe-apps-sdk": false,
      porto: false,
      "porto/internal": false,
    };
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
