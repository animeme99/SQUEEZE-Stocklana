# Verification scope

Verification is scoped to the public evaluation package, not the private production application.

## Reproduce locally

```sh
node --test
node scripts/check-export.mjs
node scripts/serve.mjs
```

The test suite covers exact amount conversion above Number.MAX_SAFE_INTEGER, basis-point floor rounding, minimum received, invalid inputs, sample-only HTML/network restrictions, JavaScript parsing, form-field limits, static asset serving and rejection of private/API paths.

The export checker verifies the exact file inventory and hashes, excluded paths, known credential patterns, internal host/path patterns and Markdown links. Pattern scanning is not a comprehensive security audit.

## Observed product status

On 26 September 2026 the public product health endpoint returned HTTP 200 and reported manual and SOL trading disabled. This only confirms an observed response and those flags; it is not full provider qualification or successful trading evidence.

On 26 September 2026, `node --test` passed **10 tests**, with **0 failures and 0 skips**, on Windows with Node.js 24.13.1. These are the public package's tests, not historical private-suite totals.

Interactive browser verification could not complete because the browser automation connection timed out. Static-server responses and client parsing passed, but no new desktop/mobile interaction, keyboard, accessibility or visual regression pass is claimed for this export. The client UI and artwork were reused from the existing product.

## Unverified by this package

Production execution, transaction safety, provider completeness, backend durability, third-party availability, funded-wallet acceptance and event source-disclosure eligibility.
