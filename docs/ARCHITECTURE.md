# Architecture and trust boundaries

## Public evaluation runtime

`scripts/serve.mjs` serves only `demo/` on loopback. The HTML sets `data-sample-only="true"`. The existing client enters its browser-local fictional session, and Content Security Policy blocks network connections. Selection, destination examples and simulated per-leg results live in memory. The sample is not a transaction simulator connected to Solana; it is a product walkthrough.

`demo/preview.js` is the existing delivered client bundle. It contains dormant live-client integration code because this export reuses the client rather than presenting a rewritten mock interface. Production server implementations, signing keys and provider credentials are absent. The client bundle is readable and does not hide its logic.

## Full product (not distributed here)

| Layer | Responsibility |
| --- | --- |
| Browser client | Wallet inspection UI, token selection, review and individual outcomes |
| Wallet Standard | Connection and user authorization in the intended live workflow |
| Node.js API | Request validation, provider orchestration, order lifecycle and recovery |
| Solana RPC | Token account reads, pool checks and transaction simulation |
| Market adapters | Prices, liquidity and available historical observations |
| Jupiter integration | Route/order preparation and execution integration; qualification incomplete |
| Stock-token registry | Exact asset/pool identity rather than ticker-only matching |
| SQLite | Durable order and recovery state |

The deployed front end uses Cloudflare Pages. Operational endpoints, host details and production configuration are deliberately omitted.

## Amounts

Amounts are decimal strings at input and integer atom strings at the domain boundary. `toAtoms` converts without floating-point multiplication; `portion` applies basis points using BigInt and rounds down; `minOut` applies a slippage allowance. These are the unmodified functions published in `src/amounts.mjs`. They are low-level primitives, not a complete transaction or token-extension policy.

## Consent and outcomes

A public address view is read-only. Wallet connection or sign-in does not authorize a swap. The intended live path asks for each source transaction separately, so the batch can complete partially. Production recovery must reconcile unknown broadcast results before another attempt. The sample demonstrates those states, but does not prove production durability or successful execution.

## Status

Live trading is disabled pending Jupiter `route_v2` compatibility and execution acceptance. The current recommendation path is rule-based. No custom onchain program is claimed. Stock-paired memes are not company shares.
