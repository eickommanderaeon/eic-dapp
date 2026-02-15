"use client";

import { useMemo, useState } from "react";
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
import { chainlinkAbi } from "../lib/chainlinkAbi";
import { v2PairAbi } from "../lib/v2PairAbi";

const fallbackToken = "0x867776d88DfD7061324FD97C8e03fb2DcC29a024";
const fallbackPool = "0x3Ce3631F923500563F55f0FB895e101E802cb47A";
const fallbackChainId = 8453;
const wethAddress =
  "0x4200000000000000000000000000000000000006" as const;
const ethUsdFeed =
  "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as const;

export default function Dapp() {
  const chainId = useChainId();
  const account = useAccount();
  const { address, isConnected } = account;
  const {
    connect,
    connectors: availableConnectors,
    isPending,
    pendingConnector,
  } = useConnect();
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

  const { data: token0 } = useReadContract({
    abi: v2PairAbi,
    address: poolAddress,
    functionName: "token0",
    chainId: base.id,
  });

  const { data: token1 } = useReadContract({
    abi: v2PairAbi,
    address: poolAddress,
    functionName: "token1",
    chainId: base.id,
  });

  const { data: reserves } = useReadContract({
    abi: v2PairAbi,
    address: poolAddress,
    functionName: "getReserves",
    chainId: base.id,
  });

  const { data: ethUsdDecimals } = useReadContract({
    abi: chainlinkAbi,
    address: ethUsdFeed,
    functionName: "decimals",
    chainId: base.id,
  });

  const { data: ethUsdRound } = useReadContract({
    abi: chainlinkAbi,
    address: ethUsdFeed,
    functionName: "latestRoundData",
    chainId: base.id,
  });

  const { data: token0Decimals } = useReadContract({
    abi: erc20Abi,
    address: token0 ?? tokenAddress,
    functionName: "decimals",
    chainId: base.id,
    query: {
      enabled: Boolean(token0),
    },
  });

  const { data: token1Decimals } = useReadContract({
    abi: erc20Abi,
    address: token1 ?? tokenAddress,
    functionName: "decimals",
    chainId: base.id,
    query: {
      enabled: Boolean(token1),
    },
  });

  const formattedBalance = useMemo(() => {
    if (!balance) {
      return "0";
    }
    const tokenDecimals = decimals ?? 18;
    return formatUnits(balance, tokenDecimals);
  }, [balance, decimals]);
  const formattedBalanceDisplay = useMemo(() => {
    const [rawInteger, rawFraction = ""] = formattedBalance.split(".");
    if (!rawInteger) {
      return formattedBalance;
    }
    let integerPart = rawInteger;
    let fractionPart = rawFraction;
    const maxFractionDigits = 4;

    if (fractionPart.length > maxFractionDigits) {
      const roundingDigit = Number(fractionPart[maxFractionDigits] ?? "0");
      let truncated = fractionPart.slice(0, maxFractionDigits);

      if (roundingDigit >= 5 && typeof BigInt === "function") {
        try {
          const incremented = (BigInt(truncated) + 1n).toString();
          if (incremented.length > maxFractionDigits) {
            integerPart = (BigInt(integerPart) + 1n).toString();
            truncated = "0".repeat(maxFractionDigits);
          } else {
            truncated = incremented.padStart(maxFractionDigits, "0");
          }
        } catch {
          // Fall back to truncation if BigInt parsing fails.
        }
      }
      fractionPart = truncated;
    }

    let formattedInteger = integerPart;
    if (typeof BigInt === "function") {
      try {
        formattedInteger = new Intl.NumberFormat("en-US").format(
          BigInt(integerPart),
        );
      } catch {
        formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    } else {
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    const trimmedFraction = fractionPart.replace(/0+$/, "");
    return trimmedFraction
      ? `${formattedInteger}.${trimmedFraction}`
      : formattedInteger;
  }, [formattedBalance]);
  const eicPriceInWeth = useMemo(() => {
    if (!reserves || !token0 || !token1) {
      return null;
    }
    const [reserve0, reserve1] = reserves;
    const token0IsWeth = token0.toLowerCase() === wethAddress.toLowerCase();
    const token1IsWeth = token1.toLowerCase() === wethAddress.toLowerCase();
    const token0IsEic = token0.toLowerCase() === tokenAddress.toLowerCase();
    const token1IsEic = token1.toLowerCase() === tokenAddress.toLowerCase();

    if (!(token0IsWeth || token1IsWeth) || !(token0IsEic || token1IsEic)) {
      return null;
    }

    const wethReserve = token0IsWeth ? reserve0 : reserve1;
    const eicReserve = token0IsEic ? reserve0 : reserve1;
    const wethDecimals = token0IsWeth ? token0Decimals : token1Decimals;
    const eicDecimals = token0IsEic ? token0Decimals : token1Decimals;

    if (wethDecimals === undefined || eicDecimals === undefined) {
      return null;
    }

    const wethAmount = Number(formatUnits(wethReserve, wethDecimals));
    const eicAmount = Number(formatUnits(eicReserve, eicDecimals));
    if (!Number.isFinite(wethAmount) || !Number.isFinite(eicAmount)) {
      return null;
    }
    if (eicAmount === 0) {
      return null;
    }
    return wethAmount / eicAmount;
  }, [reserves, token0, token1, token0Decimals, token1Decimals, tokenAddress]);
  const eicPriceDisplay = useMemo(() => {
    if (eicPriceInWeth === null) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 8,
    }).format(eicPriceInWeth);
  }, [eicPriceInWeth]);
  const ethUsdPrice = useMemo(() => {
    if (!ethUsdRound || ethUsdDecimals === undefined) {
      return null;
    }
    const answer = ethUsdRound[1];
    const usdValue = Number(formatUnits(answer, ethUsdDecimals));
    if (!Number.isFinite(usdValue)) {
      return null;
    }
    return usdValue;
  }, [ethUsdRound, ethUsdDecimals]);
  const eicPriceUsd = useMemo(() => {
    if (eicPriceInWeth === null || ethUsdPrice === null) {
      return null;
    }
    return eicPriceInWeth * ethUsdPrice;
  }, [eicPriceInWeth, ethUsdPrice]);
  const eicPriceUsdDisplay = useMemo(() => {
    if (eicPriceUsd === null) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(eicPriceUsd);
  }, [eicPriceUsd]);
  const eicValueInWeth = useMemo(() => {
    if (!isConnected || eicPriceInWeth === null) {
      return null;
    }
    const balanceValue = Number(formattedBalance);
    if (!Number.isFinite(balanceValue)) {
      return null;
    }
    return balanceValue * eicPriceInWeth;
  }, [formattedBalance, eicPriceInWeth, isConnected]);
  const eicValueInWethDisplay = useMemo(() => {
    if (eicValueInWeth === null) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 6,
    }).format(eicValueInWeth);
  }, [eicValueInWeth]);
  const eicValueUsd = useMemo(() => {
    if (!isConnected || eicPriceUsd === null) {
      return null;
    }
    const balanceValue = Number(formattedBalance);
    if (!Number.isFinite(balanceValue)) {
      return null;
    }
    return balanceValue * eicPriceUsd;
  }, [formattedBalance, eicPriceUsd, isConnected]);
  const eicValueUsdDisplay = useMemo(() => {
    if (eicValueUsd === null) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(eicValueUsd);
  }, [eicValueUsd]);

  const displayedSymbol = symbol ?? "EIC";
  const connectors = availableConnectors ?? [];
  const connectorLabels: Record<string, string> = {
    injected: "Browser wallet",
    walletConnect: "WalletConnect",
  };

  console.log("account", account);
  console.log("isConnected", isConnected);
  console.log(
    "connectors",
    connectors.map((connector) => ({
      id: connector.id,
      name: connector.name,
      ready: connector.ready,
    })),
  );

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
            <div className="relative z-10 flex flex-wrap gap-3 pointer-events-auto">
              {!isConnected ? (
                connectors.map((connector) => {
                  const isConnectorPending =
                    isPending && pendingConnector?.id === connector.id;
                  return (
                    <button
                      key={connector.id}
                      className="rounded-full border border-slate-900/10 bg-white px-5 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-900/30"
                      onClick={() => {
                        console.log("connect click", connector.id);
                        connect({ connector });
                      }}
                      type="button"
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
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                EIC balance
              </p>
              <p
                className="mt-3 min-w-0 break-words overflow-hidden text-2xl font-semibold text-slate-900"
                title={
                  isConnected && isBase
                    ? `${formattedBalance} ${displayedSymbol}`
                    : `0 ${displayedSymbol}`
                }
              >
                {isConnected && isBase
                  ? `${formattedBalanceDisplay} ${displayedSymbol}`
                  : `0 ${displayedSymbol}`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Read-only balance on Base mainnet.
              </p>
            </div>
          </div>
          <div className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              EIC price
            </p>
            <p
              className="mt-3 min-w-0 break-words overflow-hidden text-lg font-semibold text-slate-900"
              title={
                eicPriceInWeth === null
                  ? "—"
                  : `1 EIC ≈ ${eicPriceInWeth} WETH`
              }
            >
              1 EIC ≈ {eicPriceDisplay} WETH
            </p>
            <p
              className="mt-2 min-w-0 break-words overflow-hidden text-sm text-slate-600"
              title={
                eicPriceUsd === null ? "—" : `1 EIC ≈ ${eicPriceUsd} USD`
              }
            >
              1 EIC ≈ {eicPriceUsdDisplay}
            </p>
            {isConnected && (
              <>
                <p
                  className="mt-2 min-w-0 break-words overflow-hidden text-sm text-slate-600"
                  title={
                    eicValueInWeth === null
                      ? "—"
                      : `Your EIC ≈ ${eicValueInWeth} WETH`
                  }
                >
                  Your EIC ≈ {eicValueInWethDisplay} WETH
                </p>
                <p
                  className="mt-2 min-w-0 break-words overflow-hidden text-sm text-slate-600"
                  title={
                    eicValueUsd === null
                      ? "—"
                      : `Your EIC ≈ ${eicValueUsd} USD`
                  }
                >
                  Your EIC ≈ {eicValueUsdDisplay}
                </p>
              </>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Derived from pool reserves + Chainlink ETH/USD; indicative, not a
              quote.
            </p>
          </div>
          {isConnected && address && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Connected address
              </p>
              <p className="mt-3 text-sm font-medium text-slate-700">
                {address}
              </p>
            </div>
          )}
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
              href="https://aerodrome.finance/swap"
              target="_blank"
              rel="noreferrer"
            >
              Trade on Aerodrome
              <span className="text-xs text-slate-300 transition group-hover:text-white">
                External
              </span>
            </a>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:border-white/30"
                onClick={async () => {
                  await navigator.clipboard.writeText(tokenAddress);
                  setCopyState((prev) => ({ ...prev, token: true }));
                  setTimeout(
                    () => setCopyState((prev) => ({ ...prev, token: false })),
                    1600,
                  );
                }}
              >
                {copyState.token ? "Copied EIC address" : "Copy EIC address"}
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:border-white/30"
                onClick={async () => {
                  await navigator.clipboard.writeText(poolAddress);
                  setCopyState((prev) => ({ ...prev, pool: true }));
                  setTimeout(
                    () => setCopyState((prev) => ({ ...prev, pool: false })),
                    1600,
                  );
                }}
              >
                {copyState.pool ? "Copied pool address" : "Copy pool address"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              On Aerodrome Swap, paste the EIC address into the token search.
            </p>
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
