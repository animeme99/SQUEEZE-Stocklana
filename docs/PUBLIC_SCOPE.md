# Public disclosure scope

This repository is a deliberately limited evaluation export with fresh Git history.

## Included

- The already browser-delivered client in sample-only mode, with its existing CSS and selected assets.
- Five exact-amount functions copied unchanged from the client domain.
- Public-export tests, a small local demo server, and a file-integrity inventory.
- Submission copy, judge instructions, architecture and asset attribution.

## Retained privately

Backend application source; live provider adapters; destination ranking and selection services; private market and pool configuration; transaction preparation, verification, broadcast and recovery services; authentication/session services; databases; infrastructure; internal plans; operational logs; credentials; and original repository history.

The client includes public protocol identifiers and fictional sample addresses. Those are not wallet keys. Browser JavaScript is inspectable, including client-side display rules and validation. Minification or bundling is not an intellectual-property boundary.

## Reproduction boundary

Anyone can run the included sample and its tests. The bundle is supplied as the client artifact; the complete frontend build inputs and private production stack are not included, so the production application cannot be rebuilt from this package.

Public visibility does not itself grant a general open-source license. See NOTICE.md. Event source-disclosure requirements have not been independently verified; this package does not claim compliance with an unspecified full-source requirement.
