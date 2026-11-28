# Live Cloudflare Worker snapshot

Downloaded on 2026-11-28 from the `firebytes` Worker (firebytes.suryasreenivasan0.workers.dev).

- Deployed version: `78f9f8ea-7a8b-4d10-ba98-8baf1a8c2e54` (version #19, uploaded 2026-11-27 04:49 UTC, redeployed 2026-11-27 16:53 UTC).
- `worker.js` is the Worker's only module. It holds all pages (`/`, `/team`, `/robot`, `/cad`, `/gallery`, `/outreach`, `/join`), plus `/styles.css`, `/viewer.js` and `/robots.txt`, as embedded strings.
- No static assets, KV or other bindings.

To redeploy this exact code: `cd cloudflare-live && npx wrangler deploy`.
