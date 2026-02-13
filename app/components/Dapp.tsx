"use client";

import { useMemo } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { formatUnits } from "viem";
import { base } from "wagmi/chains";
import { erc20Abi } from "../lib/erc20Abi";

const fallbackToken = "0x867776d88DfD7061324FD97C8e03fb2DcC29a024";
const fallbackPool = "0x3Ce3631F923500563F55f0FB895e101E802cb47A";
const fallbackChainId = 8453;

export default function Dapp() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const tokenAddress = (process.env.NEXT_PUBLIC_EIC_TOKEN ?? fallbackToken) as `0x${string}`;
  const poolAddress = (process.env.NEXT_PUBLIC_EIC_POOL ?? fallbackPool) as `0x${string}`;
  const requiredChainId = Number(
    process.env.NEXT_PUBLIC_CHAIN_ID ?? fallbackChainId,
  );
  const isBase = chainId === requiredChainId;

  const { data: symbol } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "symbol",
    chainId: base.id,
  });

  const { data: decimals } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "decimals",
    chainId: base.id,
  });

  const { data: balance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(address) && isBase,
    },
  });

  const formattedBalance = useMemo(() => {
    if (!balance) {
      return "0";
    }
    const tokenDecimals = decimals ?? 18;
    return formatUnits(balance, tokenDecimals);
  }, [balance, decimals]);

  const displayedSymbol = symbol ?? "EIC";
  const connectorLabels: Record<string, string> = {
    injected: "Browser wallet",
    walletConnect: "WalletConnect",
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-16 pt-16">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span className="h-px w-8 bg-slate-400/70" />
          Base Mainnet
        </div>
        <h1 className="max-w-2xl font-display text-4xl font-semibold text-slate-900 sm:text-5xl">
          EIC liquidity intelligence, focused and calm.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          A quiet dashboard for the EIC token on Base. Read-only insights, no
          approvals, no transfers, no distractions.
        </p>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Wallet
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {isConnected ? "Connected" : "Not connected"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!isConnected ? (
                connectors.map((connector) => {
                  const isConnectorPending =
                    isPending && pendingConnector?.id === connector.id;
                  return (
                    <button
                      key={connector.id}
                      className="rounded-full border border-slate-900/10 bg-white px-5 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => connect({ connector })}
                      type="button"
                      disabled={!connector.ready || isPending}
                    >
                      {isConnectorPending
                        ? "Connecting"
                        : connectorLabels[connector.id] ?? connector.name}
                    </button>
                  );
                })
              ) : (
                <button
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
                  onClick={() => disconnect()}
                  type="button"
                >
                  Disconnect
                </button>
              )}
              {isConnected && !isBase && (
                <button
                  className="rounded-full border border-slate-900 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5"
                  onClick={() => switchChain({ chainId: base.id })}
                  type="button"
                  disabled={isSwitching}
                >
                  {isSwitching ? "Switching" : "Switch to Base"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Network
              </p>
              <p className="mt-3 text-sm font-medium text-slate-700">
                {isConnected
                  ? isBase
                    ? "Base Mainnet"
                    : `Wrong network (ID ${chainId})`
                  : "Connect a wallet"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                EIC balance
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {isConnected && isBase
                  ? `${formattedBalance} ${displayedSymbol}`
                  : `0 ${displayedSymbol}`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Read-only balance on Base mainnet.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-slate-900 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Links
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <a
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/30"
              href={`https://basescan.org/token/${tokenAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              View token on BaseScan
              <span className="text-xs text-slate-300 transition group-hover:text-white">
                External
              </span>
            </a>
            <a
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/30"
              href={`https://basescan.org/address/${poolAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              View pool on BaseScan
              <span className="text-xs text-slate-300 transition group-hover:text-white">
                External
              </span>
            </a>
            <a
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/30"
              href="https://aerodrome.finance/"
              target="_blank"
              rel="noreferrer"
            >
              Trade on Aerodrome
              <span className="text-xs text-slate-300 transition group-hover:text-white">
                External
              </span>
            </a>
          </div>
          <div className="mt-8 text-xs text-slate-400">
            Token: {tokenAddress}
            <br />
            Pool: {poolAddress}
          </div>
        </div>
      </section>

      <footer className="mt-16 flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
        Founder: Kommander Aeon
      </footer>
    </div>
  );
}
