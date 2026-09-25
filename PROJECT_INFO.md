# Project Info — copy into the submission form

## Project Name

SQUEEZE

## Short Description

From old shitcoins to your next promising stock-paired meme. SQUEEZE helps you select your meme bags, discover a potential next play on Solana, and review each swap in one place.

178/280 characters.

## Full Description (Markdown)

Copy [full-description.md](submission/full-description.md). The text below is identical (2440/5000 characters).

---

## Old shitcoins. New stock-paired plays.

SQUEEZE is built to turn the shitcoins and meme bags sitting in your Solana wallet into a promising stock-paired meme token. Pick the bags you want to exit, choose how much to sell, and discover a potential next play without piecing the whole process together across different tools.

## What you do with SQUEEZE

1. Bring your bags: connect a wallet, view a public address, or try sample tokens.
2. Choose what to squeeze: select the shitcoins or meme tokens you want to exit and set an amount for each.
3. Find your next play: explore a stock-paired meme destination with PIP's rule-based suggestion, or choose one yourself.
4. Review the move: inspect each source swap, quoted output, minimum received and fees before authorizing it in your wallet when live trading becomes available.

The destination is the point: give old meme positions a path into the stock-paired meme ecosystem. SOL is an optional exit, not the main product story.

## Why stock-paired memes?

SQUEEZE focuses on meme tokens whose liquidity pools use tokenized stocks as quote assets. The full implementation uses a stock-token registry, pool checks and available market data to help identify candidates rather than trusting a ticker alone.

“Promising” describes a candidate to evaluate, not a guaranteed winner. A stock-paired meme remains a meme token; holding it does not mean owning shares in the underlying company.

## Built for decisions you can inspect

You choose the source tokens and exact amounts. Missing market data stays unknown. Each source has its own swap and result, so partial completion remains visible. Selecting tokens alone never moves funds.

## Current demo

Wallet inspection and selection are implemented. The sample lets judges explore destination selection, review and simulated swaps without funds or API keys. Live swaps are currently disabled while Jupiter transaction compatibility and execution acceptance are completed. PIP's current selection is rule-based; AI-driven selection is planned. Sample balances, prices and outcomes are fictional.

## Links

Website: https://squeezeswap.com
GitHub: https://github.com/animeme99/SQUEEZE-Stocklana

The public repository includes an interactive sample demo, selected source, tests and product assets. Backend and proprietary selection services remain private. Run the sample locally with `node scripts/serve.mjs` and Node.js 22.16 or newer.
