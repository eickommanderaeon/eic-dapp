"use client";

import dynamic from "next/dynamic";

const Dapp = dynamic(() => import("./components/Dapp"), { ssr: false });

export default function ClientPage() {
  return <Dapp />;
}