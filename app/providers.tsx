"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { injected } from "@wagmi/core";
import { walletConnect } from "@wagmi/connectors";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: "EIC DApp",
            description: "Read-only EIC dashboard on Base.",
            url: "https://eic.foundation",
            icons: [],
          },
        }),
      ]
    : []),
];

const wagmiConfig = createConfig({
  chains: [base],
  connectors,
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
  useEffect(() => {
    if (!walletConnectProjectId && process.env.NODE_ENV === "development") {
      console.info(
        "NEXT_PUBLIC_WC_PROJECT_ID not set; WalletConnect is disabled.",
      );
    }
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
