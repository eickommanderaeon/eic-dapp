"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { injected } from "@wagmi/core";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
