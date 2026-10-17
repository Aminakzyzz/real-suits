# Touchline Desk application

See the [repository README](../../README.md) and [operator guide](../../docs/product/touchline-operator-guide.md) for startup, real functionality and limits.

This application uses the Sites Vinext starter with React, TypeScript, Cloudflare D1 and Drizzle. Keep the maintained `build/`, `scripts/` and `vendor/` files when deploying with Sites. Source is under `app/`, `components/`, `lib/` and `db/`.

`npm run dev` uses loopback-only development identity simulation. Production builds do not include that mock sign-in. Hosted identity headers come from Sites; application writes check the signed-in owner. The read-only viewer additionally requires a revocable match-specific read key.

`.openai/hosting.json` contains non-secret Site identity and the `DB` binding. Credentials, browser data, local D1 files, dependency folders and test output are ignored and must not be published. No AI-provider key is required or used by this release.

Use the Sites source workflow for hosted publication. The GitHub repository and the platform-managed Site source repository are distinct; retain both provenance records in `docs/product/touchline-delivery.md`.
