# Project Info — copy into the submission form

## Project Name

SQUEEZE

## Short Description

A Solana wallet cleanup workspace: choose token amounts and explore one destination, from stock-paired memes to SOL. Try the full flow with sample data; live swaps are currently disabled.

187/280 characters.

## Full Description (Markdown)

Copy the content of [full-description.md](submission/full-description.md). The text below is identical (3152/5000 characters).

---

## Pick the tokens. Choose one destination.

Solana wallets collect dust, forgotten positions and tokens with incomplete market data. Cleaning them up means checking balances, choosing amounts and reviewing a separate route for every token. SQUEEZE brings those decisions into one workspace.

## What it does

View a wallet, select the tokens you want to move, set exact amounts, and explore one destination: a stock-paired meme or native SOL. PIP, our mascot, makes the steps easier to follow. The selection bag is a working list; adding a token does not move funds.

The intended execution flow shows each source swap before the user authorizes it in their wallet. Sources execute individually, so partial completion is possible. The included sample demonstrates review, simulated approvals, receipts and recovery without connecting a wallet or sending a transaction.

## Why it fits Stocklana

SQUEEZE focuses on discovering meme tokens with tokenized-stock quote pairs. The full implementation uses a stock-token registry and pool checks rather than trusting a ticker alone. A stock-paired meme is still a meme token: holding it does not give ownership of the underlying company.

## What makes it different

- One page from wallet inspection to destination review.
- Exact token amounts represented in integer atomic units.
- Missing prices and charts stay unknown, rather than becoming misleading zeroes.
- A visible result for each source, including partial and unresolved outcomes.
- A fictional sample flow that judges can run without API keys or funds.

## How it is built

The product uses vanilla JavaScript modules, a Node.js API, SQLite for order and recovery state, Solana RPC, Jupiter, DexScreener, GeckoTerminal and Wallet Standard. Cloudflare Pages serves the public client. This repository includes the sample-only browser artifact, selected exact-amount source, tests, documentation and brand assets. Backend services, ranking logic, private configuration and credentials remain private; it is a curated evaluation package, not the full production source.

## Current status

Wallet inspection is the live entry point. Live swaps are disabled while Jupiter route_v2 compatibility and execution acceptance are completed. PIP's current selection is rule-based, not live AI. The sample's tokens, prices and outcomes are fictional. Sample completion does not prove mainnet execution or trading performance.

## Try SQUEEZE

Open https://squeeze-aya.pages.dev and choose Try with sample tokens. Select tokens, change an amount, choose a destination, review the individual swaps and simulate them. The sample also covers missing data, expired quotes, declined approvals and partial completion.

Repository: https://github.com/animeme99/SQUEEZE-Stocklana

For a provider-independent demo, clone the repo and run `node scripts/serve.mjs` with Node.js 22.16 or newer. No dependency install or wallet is required.

## What's next

Complete transaction compatibility, qualify funded-wallet execution and recovery, and enable live swaps only after those checks pass. AI-driven destination selection is planned, not presented as available today.
