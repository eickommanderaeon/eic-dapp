# EIC DApp MVP

Minimal Next.js (App Router) dashboard for the EIC token on Base mainnet.

## Setup

```bash
npm install
```

Create a local `.env` from `.env.example` if needed.
Optionally add `NEXT_PUBLIC_WC_PROJECT_ID` in `.env.local` to enable
WalletConnect (recommended).

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```

`npm run build` uses compile mode to avoid forking in restricted environments.
For a normal build on machines that allow process forking, run:

```bash
npm run build:generate
```
