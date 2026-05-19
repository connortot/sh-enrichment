<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloudflare / OpenNext deployment gotchas

### middleware.ts vs proxy.ts
Next.js 16 renamed `middleware.ts` to `proxy.ts` and made the `proxy` convention **Node.js runtime only**. Cloudflare Workers requires **Edge runtime**. These are incompatible.

**Always use `middleware.ts`** (not `proxy.ts`) in this project. The deprecation warning in the build output is harmless — Edge-compatible middleware still works via the old convention.

Never migrate to `proxy.ts` regardless of deprecation warnings.

### Security headers
`next.config.ts` `headers()` is **not supported** by OpenNext Cloudflare and causes a runtime Internal Server Error on the deployed site. Set response headers inside `middleware.ts` instead.

### Environment variables
`NEXT_PUBLIC_` vars are baked into the JS bundle at `next build` time. For the Cloudflare CI build they must be set in:
1. **Cloudflare dashboard** → Workers & Pages → project → Settings → Environment Variables (build-time)
2. **`wrangler.jsonc` `vars` block** (runtime)

Local builds use `.env.production` (on disk, not tracked in git).
