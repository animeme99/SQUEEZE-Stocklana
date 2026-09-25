# A three-minute judge walkthrough

Run `node scripts/serve.mjs` and open http://127.0.0.1:4187. Use a current browser. No account, wallet, network provider or install step is required.

## Main flow

1. **Inspect the sample wallet.** Read the Sample data label. Search or filter the token list. Balances and market values are fictional.
2. **Choose the sources.** Select a few tokens, or use Select cooked. The cleanup label is a rule, not a token-safety certification.
3. **Set an amount.** Choose 50% or enter a custom amount. Selection stays local. See `src/amounts.mjs` for the exact arithmetic excerpt.
4. **Choose the destination.** Use Find my next bag or Just get SOL. The sample explanation is fictional; the production selector is rule-based today.
5. **Review swaps.** Inspect amounts, minimum received and fee details. The queue contains one leg per source.
6. **Simulate.** Advance each sample approval and inspect the result. There is no wallet signature and no transaction on Solana.

## Explore the awkward cases

Choose a scenario in the sample selector, then repeat the selection and review steps as appropriate.

| Scenario | Look for |
| --- | --- |
| Missing market data | Unknown data stays visibly unavailable |
| No suitable pick / No route | Explanation and a way to change the selection or destination |
| Expired quote | A fresh quote is needed |
| Declined approval | The simulated balance is not debited by the declined attempt |
| Partial completion | Earlier completed legs remain distinct from the failed leg |
| Unknown result | Status is checked before the outcome is treated as complete |
| Empty wallet | An empty state rather than invented holdings |

## What to assess

Product clarity, exact selection, readable review, explicit limitations, and recovery states can be evaluated in this export. The source tests exercise values larger than JavaScript's safe integer range and floor rounding. The local server blocks paths outside the static demo root.

The backend and production execution services remain private. This package does not establish mainnet execution, complete market coverage or predictive accuracy. If the event requires full implementation source or a deployed onchain program, that requirement must be assessed separately; neither is represented as included here.
